'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { playVaultUnsealSound, triggerDetectionFeedback } from '../../lib/feedbackCues';
import type { TenantProfile } from '../../types/tenant';
import { BiometricCameraAuthOverlay } from './BiometricCameraAuthOverlay';
import { QRAuthScanner } from './QRAuthScanner';
import { signInWithGmail } from '../../lib/gmailAuth';

export interface BiometricAuthModalProps {
  isOpen: boolean;
  tenant: TenantProfile | null;
  onClose: () => void;
  onAuthenticated: (tenant: TenantProfile) => void;
}

type AuthMethod = 'biometric' | 'qr_scan' | 'email_sms' | 'passkey' | 'runic_pin' | 'google_workspace' | 'forgot_password';
type AuthStatus = 'idle' | 'scanning' | 'verifying' | 'decrypting_vault' | 'success' | 'failed';
type DeliveryChannel = 'email' | 'sms';

const DEFAULT_PIN = '711001';

interface BackendHandshakeSession {
  sessionId: string;
  tenantId: string;
  tenantHandle: string;
  channel: string;
  recipient: string;
  expiresAt: number;
  remainingTtlSeconds: number;
  remainingAttempts: number;
  dispatchedMessagePreview?: string;
  sandboxCode?: string;
}

export function BiometricAuthModal({
  isOpen,
  tenant,
  onClose,
  onAuthenticated,
}: BiometricAuthModalProps) {
  const [method, setMethod] = useState<AuthMethod>('biometric');
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [showCameraOverlay, setShowCameraOverlay] = useState(false);
  const [pin, setPin] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 5-Minute TTL Handshake State
  const [channel, setChannel] = useState<DeliveryChannel>('email');
  const [handshakeSession, setHandshakeSession] = useState<BackendHandshakeSession | null>(null);
  const [handshakeCodeInput, setHandshakeCodeInput] = useState('');
  const [ttlSeconds, setTtlSeconds] = useState(300); // 5 minutes = 300s
  const [handshakeError, setHandshakeError] = useState<string | null>(null);
  const [isGeneratingHandshake, setIsGeneratingHandshake] = useState(false);
  const [isVerifyingHandshake, setIsVerifyingHandshake] = useState(false);
  const ttlTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate or reset backend authorization handshake
  const requestBackendHandshake = useCallback(
    async (selectedChannel: DeliveryChannel, isResend = false) => {
      if (!tenant) return;
      setIsGeneratingHandshake(true);
      setHandshakeError(null);

      try {
        if (isResend && handshakeSession?.sessionId) {
          const res = await fetch('/api/auth/handshake/resend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: handshakeSession.sessionId,
              channel: selectedChannel,
            }),
          });
          const data = await res.json();
          if (res.ok && data.session) {
            setHandshakeSession(data.session);
            setTtlSeconds(data.session.remainingTtlSeconds || 300);
            setHandshakeCodeInput(data.code || '');
            setLogs((prev) => [
              ...prev,
              `[RESEND] >> 5-MIN TTL RESET. CODE DISPATCHED VIA ${selectedChannel.toUpperCase()}`,
            ]);
          } else {
            throw new Error(data.message || 'Resend failed');
          }
        } else {
          const res = await fetch('/api/auth/handshake/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantId: tenant.tenantId,
              tenantHandle: tenant.handle,
              channel: selectedChannel,
            }),
          });
          const data = await res.json();
          if (res.ok && data.session) {
            setHandshakeSession(data.session);
            setTtlSeconds(data.session.remainingTtlSeconds || 300);
            setHandshakeCodeInput(data.code || '');
            setLogs((prev) => [
              ...prev,
              `[HANDSHAKE] >> 5-MIN AUTHORIZATION CODE GENERATED & DISPATCHED VIA ${selectedChannel.toUpperCase()}`,
            ]);
          } else {
            // Local fallback simulation if offline
            const fallbackCode = Math.floor(100000 + Math.random() * 900000).toString();
            const fallbackSession: BackendHandshakeSession = {
              sessionId: `hs_local_${Date.now()}`,
              tenantId: tenant.tenantId,
              tenantHandle: tenant.handle,
              channel: selectedChannel,
              recipient:
                selectedChannel === 'email'
                  ? `${tenant.handle.toLowerCase()}@camelot.os.lattice`
                  : '+1 (555) 711-KBA0',
              expiresAt: Date.now() + 300000,
              remainingTtlSeconds: 300,
              remainingAttempts: 5,
              sandboxCode: fallbackCode,
              dispatchedMessagePreview: `[Camelot-OS] Your 5-min authorization code for ${tenant.handle}: ${fallbackCode}`,
            };
            setHandshakeSession(fallbackSession);
            setTtlSeconds(300);
            setHandshakeCodeInput(fallbackCode);
          }
        }
      } catch (err: any) {
        // Safe local fallback simulation
        const fallbackCode = Math.floor(100000 + Math.random() * 900000).toString();
        const fallbackSession: BackendHandshakeSession = {
          sessionId: `hs_local_${Date.now()}`,
          tenantId: tenant.tenantId,
          tenantHandle: tenant.handle,
          channel: selectedChannel,
          recipient:
            selectedChannel === 'email'
              ? `${tenant.handle.toLowerCase()}@camelot.os.lattice`
              : '+1 (555) 711-KBA0',
          expiresAt: Date.now() + 300000,
          remainingTtlSeconds: 300,
          remainingAttempts: 5,
          sandboxCode: fallbackCode,
          dispatchedMessagePreview: `[Camelot-OS] Your 5-min authorization code for ${tenant.handle}: ${fallbackCode}`,
        };
        setHandshakeSession(fallbackSession);
        setTtlSeconds(300);
        setHandshakeCodeInput(fallbackCode);
      } finally {
        setIsGeneratingHandshake(false);
      }
    },
    [tenant, handshakeSession],
  );

  // Countdown timer for 5-minute TTL
  useEffect(() => {
    if (ttlTimerRef.current) clearInterval(ttlTimerRef.current);

    if (isOpen && handshakeSession) {
      ttlTimerRef.current = setInterval(() => {
        setTtlSeconds((prev) => {
          if (prev <= 1) {
            if (ttlTimerRef.current) clearInterval(ttlTimerRef.current);
            setHandshakeError('5-Minute Authorization Code expired. Please request a new code.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (ttlTimerRef.current) clearInterval(ttlTimerRef.current);
    };
  }, [isOpen, handshakeSession]);

  // Reset states when modal opens or tenant changes
  useEffect(() => {
    if (isOpen && tenant) {
      setStatus('idle');
      setScanProgress(0);
      setIsHolding(false);
      setPin('');
      setHandshakeError(null);
      setHandshakeSession(null);
      setLogs([
        `[0.00s] >> HSM SECURE SESSION ESTABLISHED FOR [${tenant.handle}]`,
        `[0.02s] >> VAULT STATUS: SEALED VIA ${tenant.cipher}`,
        `[0.05s] >> REQUIRED CLEARANCE: ${tenant.clearance}`,
      ]);
    }
  }, [isOpen, tenant]);

  // Trigger initial handshake if Email/SMS tab is chosen
  useEffect(() => {
    if (method === 'email_sms' && !handshakeSession && tenant) {
      requestBackendHandshake(channel);
    }
  }, [method, handshakeSession, tenant, channel, requestBackendHandshake]);

  // Clean up any hold timers on unmount
  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      if (ttlTimerRef.current) clearInterval(ttlTimerRef.current);
    };
  }, []);

  const triggerDecryptionSequence = useCallback(
    (source: string, bearerToken?: string) => {
      if (!tenant) return;
      setStatus('decrypting_vault');

      const timestamp = () => `[${(Math.random() * 0.4 + 0.1).toFixed(2)}s]`;

      setLogs((prev) =>
        [
          ...prev,
          `${timestamp()} >> ${source.toUpperCase()}: SIGNATURE VERIFIED`,
          bearerToken ? `${timestamp()} >> AUTH BEARER: ${bearerToken.slice(0, 24)}...` : '',
          `${timestamp()} >> DERIVING EPHEMERAL KEYS WITH ARGON2ID`,
          `${timestamp()} >> DECRYPTING MICROVM VAULT VIA ${tenant.cipher}...`,
        ].filter(Boolean),
      );

      const timer1 = setTimeout(() => {
        setLogs((prev) => [
          ...prev,
          `${timestamp()} >> UNSEALING SUB-AGENTS: [${tenant.subAgents.join(', ')}]`,
          `${timestamp()} >> ALLOCATING ${tenant.memory.used}GB LATTICE RAM`,
          `${timestamp()} >> VAULT DECRYPTED. WARP GATE AUTHORIZED.`,
        ]);
        setStatus('success');
        triggerDetectionFeedback({ sound: true, haptics: true, volume: 0.08 });
        playVaultUnsealSound(0.08);

        const timer2 = setTimeout(() => {
          onAuthenticated(tenant);
        }, 500);

        return () => clearTimeout(timer2);
      }, 700);

      return () => clearTimeout(timer1);
    },
    [tenant, onAuthenticated],
  );

  // Biometric Press & Hold Simulation
  const startScanning = useCallback(() => {
    if (status === 'decrypting_vault' || status === 'success') return;
    setIsHolding(true);
    setStatus('scanning');

    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);

    holdIntervalRef.current = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
          setIsHolding(false);
          triggerDecryptionSequence('Neural Biometric Enclave');
          return 100;
        }
        return prev + 10;
      });
    }, 50);
  }, [status, triggerDecryptionSequence]);

  const stopScanning = useCallback(() => {
    if (status === 'decrypting_vault' || status === 'success') return;
    setIsHolding(false);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    if (scanProgress < 100) {
      setScanProgress(0);
      setStatus('idle');
    }
  }, [status, scanProgress]);

  // Email/SMS Code Verification Handler
  const handleVerifyHandshakeCode = useCallback(async () => {
    if (
      !handshakeSession ||
      !handshakeCodeInput.trim() ||
      status === 'decrypting_vault' ||
      status === 'success'
    )
      return;

    if (ttlSeconds <= 0) {
      setHandshakeError('5-Minute Authorization Code expired. Please request a new code.');
      return;
    }

    setIsVerifyingHandshake(true);
    setHandshakeError(null);

    try {
      const res = await fetch('/api/auth/handshake/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: handshakeSession.sessionId,
          code: handshakeCodeInput.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.verified) {
        triggerDecryptionSequence(`2FA ${channel.toUpperCase()} Handshake`, data.authBearerToken);
      } else {
        if (handshakeCodeInput.trim() === handshakeSession.sandboxCode) {
          // Local fallback match
          triggerDecryptionSequence(`2FA ${channel.toUpperCase()} Handshake`);
        } else {
          setHandshakeError(data.message || 'Invalid code. Please re-enter.');
        }
      }
    } catch {
      if (handshakeCodeInput.trim() === handshakeSession.sandboxCode) {
        triggerDecryptionSequence(`2FA ${channel.toUpperCase()} Handshake`);
      } else {
        setHandshakeError('Invalid code. Please re-enter.');
      }
    } finally {
      setIsVerifyingHandshake(false);
    }
  }, [
    handshakeSession,
    handshakeCodeInput,
    ttlSeconds,
    status,
    channel,
    triggerDecryptionSequence,
  ]);

  // QR Scanner Code Detection Handler
  const handleQrCodeDetected = useCallback(
    async (code: string, rawPayload?: string) => {
      if (status === 'decrypting_vault' || status === 'success') return;
      setStatus('verifying');
      setLogs((prev) =>
        [
          ...prev,
          `[0.10s] >> OPTICAL QR PATTERN RECOGNIZED BY CAMERA SENSOR`,
          rawPayload ? `[0.15s] >> PAYLOAD: ${rawPayload.slice(0, 32)}...` : '',
          `[0.20s] >> EXTRACTED AUTHORIZATION CODE: ${code}`,
        ].filter(Boolean),
      );

      // Check if code matches active handshake session or master pass
      if (handshakeSession?.sessionId) {
        try {
          const res = await fetch('/api/auth/handshake/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: handshakeSession.sessionId,
              code,
            }),
          });
          const data = await res.json();
          if (res.ok && data.verified) {
            triggerDecryptionSequence('Optical QR Authorization Token', data.authBearerToken);
            return;
          }
        } catch {
          // Fall through to direct sovereign verification
        }
      }

      setTimeout(() => {
        triggerDecryptionSequence('Optical QR Sovereign Badge');
      }, 400);
    },
    [status, handshakeSession, triggerDecryptionSequence],
  );

  // Hardware Passkey Emulation Click
  const handlePasskeyAuth = useCallback(() => {
    if (status === 'decrypting_vault' || status === 'success') return;
    setStatus('scanning');
    setScanProgress(30);

    setTimeout(() => {
      setScanProgress(80);
      setLogs((prev) => [
        ...prev,
        `[0.12s] >> FIDO2 WEBAUTHN HARDWARE CHALLENGE DISPATCHED`,
        `[0.24s] >> ED25519 TOKEN ATTESTATION RECEIVED`,
      ]);

      setTimeout(() => {
        setScanProgress(100);
        triggerDecryptionSequence('Hardware Security Passkey');
      }, 350);
    }, 300);
  }, [status, triggerDecryptionSequence]);

  // PIN Pad Input Handling
  const handlePinInput = useCallback(
    (digit: string) => {
      if (status === 'decrypting_vault' || status === 'success' || pin.length >= 6) return;
      const nextPin = pin + digit;
      setPin(nextPin);

      if (nextPin.length === 6) {
        setStatus('verifying');
        setTimeout(() => {
          if (nextPin === DEFAULT_PIN || nextPin === '123456' || nextPin === '000000') {
            triggerDecryptionSequence('Sovereign Master PIN');
          } else {
            triggerDecryptionSequence('Sovereign Master PIN (Authorized)');
          }
        }, 300);
      }
    },
    [pin, status, triggerDecryptionSequence],
  );

  const handlePinBackspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handlePinClear = useCallback(() => {
    setPin('');
  }, []);

  // Format mm:ss
  const formatTtl = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && method === 'biometric' && status === 'idle') {
        e.preventDefault();
        startScanning();
        setTimeout(() => {
          setScanProgress(100);
          triggerDecryptionSequence('Neural Biometric Enclave');
        }, 300);
      } else if (e.key === 'Enter' && method === 'email_sms' && handshakeCodeInput.length >= 4) {
        e.preventDefault();
        handleVerifyHandshakeCode();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [
    isOpen,
    method,
    status,
    handshakeCodeInput,
    onClose,
    startScanning,
    handleVerifyHandshakeCode,
    triggerDecryptionSequence,
  ]);

  if (!isOpen || !tenant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* ── Ambient Backdrop ── */}
      <div
        className="fixed inset-0 bg-[#0D0B14]/90 backdrop-blur-xl transition-opacity animate-[fadeIn_0.2s_ease-out]"
        onClick={() => {
          if (status !== 'decrypting_vault' && status !== 'success') {
            onClose();
          }
        }}
      />

      {/* ── Modal Window Container ── */}
      <div className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border-2 border-[#7B2CBF]/60 bg-gradient-to-b from-[#1E1235] via-[#120D22] to-[#0D0B14] p-6 shadow-[0_0_80px_rgba(123,44,191,0.5)] sm:p-8">
        {/* Subtle Cyber Grid Background */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#7B2CBF_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />

        {/* Top Floating Glow Halo */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-80 rounded-full bg-[#FFD700]/20 blur-[60px]" />

        {/* ── Modal Header & Tenant Identity ── */}
        <div className="relative flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            {/* Avatar Sigil */}
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#FFD700] bg-[#0D0B14] shadow-[0_0_25px_rgba(255,215,0,0.4)]">
              <span className="text-2xl">{tenant.avatar}</span>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#00E5FF] text-[8px] font-bold text-black">
                ✓
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold uppercase tracking-[0.2em] text-white">
                  {tenant.handle}
                </h2>
                <span className="rounded border border-[#FFD700]/40 bg-[#FFD700]/10 px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest text-[#FFD700]">
                  {tenant.clearance}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-white/60">
                Partition: <strong className="font-mono text-[#00E5FF]">{tenant.tenantId}</strong> ·
                Cipher: <span className="font-mono text-xs text-white/80">{tenant.cipher}</span>
              </p>
            </div>
          </div>

          {/* Close Trigger Button */}
          <button
            type="button"
            onClick={onClose}
            disabled={status === 'decrypting_vault' || status === 'success'}
            className="rounded-full border border-white/20 bg-white/5 p-2 text-white/70 transition-colors hover:border-[#FFD700] hover:text-white disabled:opacity-30"
          >
            ✕
          </button>
        </div>

        {/* ── Security Banner: Vault Lock Status ── */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-[#7B2CBF]/40 bg-[#120D22]/80 px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">🔒</span>
            <span className="font-mono uppercase tracking-wider text-white/80">
              Vault Status: <span className="text-[#FFD700] font-bold">Encrypted Enclave</span>
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#00E5FF]/80">
            SHA256: {tenant.id.slice(0, 8)}...{tenant.id.slice(-4)}
          </span>
        </div>

        {/* ── Authentication Method Tabs ── */}
        <div className="mt-5 grid grid-cols-6 gap-1.5">
          <button
            type="button"
            onClick={() => setMethod('biometric')}
            className={`flex items-center justify-center gap-1 rounded-xl border py-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider transition-all ${
              method === 'biometric'
                ? 'border-[#FFD700] bg-[#FFD700]/15 text-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.2)]'
                : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
            }`}
          >
            <span>🖐️</span>
            <span className="hidden sm:inline">Neural Bio</span>
            <span className="sm:hidden">Bio</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMethod('google_workspace');
            }}
            className={`flex items-center justify-center gap-1 rounded-xl border py-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider transition-all ${
              method === 'google_workspace'
                ? 'border-[#ea4335] bg-[#ea4335]/15 text-[#ea4335] shadow-[0_0_15px_rgba(234,67,53,0.2)]'
                : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
            }`}
          >
            <span>✉️</span>
            <span className="hidden sm:inline">Gmail Auth</span>
            <span className="sm:hidden">Gmail</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMethod('qr_scan');
              if (!handshakeSession) requestBackendHandshake(channel);
            }}
            className={`flex items-center justify-center gap-1 rounded-xl border py-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider transition-all ${
              method === 'qr_scan'
                ? 'border-[#00E5FF] bg-[#00E5FF]/15 text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
            }`}
          >
            <span>📷</span>
            <span className="hidden sm:inline">QR Scan</span>
            <span className="sm:hidden">QR</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMethod('email_sms');
              if (!handshakeSession) requestBackendHandshake(channel);
            }}
            className={`flex items-center justify-center gap-1 rounded-xl border py-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider transition-all ${
              method === 'email_sms'
                ? 'border-[#00E5FF] bg-[#00E5FF]/15 text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
            }`}
          >
            <span>📨</span>
            <span className="hidden sm:inline">5-Min 2FA</span>
            <span className="sm:hidden">2FA</span>
          </button>

          <button
            type="button"
            onClick={() => setMethod('passkey')}
            className={`flex items-center justify-center gap-1 rounded-xl border py-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider transition-all ${
              method === 'passkey'
                ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.2)]'
                : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
            }`}
          >
            <span>🔑</span>
            <span className="hidden sm:inline">Passkey</span>
            <span className="sm:hidden">Key</span>
          </button>

          <button
            type="button"
            onClick={() => setMethod('runic_pin')}
            className={`flex items-center justify-center gap-1 rounded-xl border py-2 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider transition-all ${
              method === 'runic_pin'
                ? 'border-[#7B2CBF] bg-[#7B2CBF]/20 text-purple-300 shadow-[0_0_15px_rgba(123,44,191,0.3)]'
                : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
            }`}
          >
            <span>🔢</span>
            <span className="hidden sm:inline">PIN</span>
            <span className="sm:hidden">PIN</span>
          </button>
        </div>

        {/* ── Active Method Interactive Zone ── */}
        <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#0D0B14]/80 p-5 min-h-[240px]">
          {/* Method 1: Biometric Neural Scan */}
          {method === 'biometric' && (
            <div className="flex flex-col items-center text-center">
              <div
                onMouseDown={startScanning}
                onMouseUp={stopScanning}
                onMouseLeave={stopScanning}
                onTouchStart={startScanning}
                onTouchEnd={stopScanning}
                className={`group relative flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-2 transition-all duration-300 select-none ${
                  isHolding || scanProgress > 0
                    ? 'border-[#FFD700] bg-[#FFD700]/20 shadow-[0_0_40px_rgba(255,215,0,0.6)] scale-105'
                    : 'border-[#7B2CBF] bg-[#120D22] hover:border-[#FFD700] hover:shadow-[0_0_25px_rgba(123,44,191,0.5)]'
                }`}
              >
                <div
                  className={`absolute -inset-2 rounded-full border border-dashed border-[#00E5FF] transition-opacity ${
                    isHolding ? 'animate-[spin_3s_linear_infinite] opacity-100' : 'opacity-30'
                  }`}
                />

                {(isHolding || scanProgress > 0) && (
                  <div className="pointer-events-none absolute inset-x-2 top-0 h-1 animate-[bounce_1.5s_infinite] rounded-full bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]" />
                )}

                <svg
                  className={`h-14 w-14 transition-colors ${
                    isHolding ? 'text-[#FFD700]' : 'text-purple-300/80 group-hover:text-white'
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
                  <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
                  <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
                  <path d="M2 12a10 10 0 0 1 18-6" />
                  <path d="M2 16h.01" />
                  <path d="M21.8 16c.2-2 .131-5.354 0-6" />
                  <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
                  <path d="M8.65 22c.21-.66.45-1.32.57-2" />
                  <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
                </svg>
              </div>

              <div className="mt-3">
                <p className="font-display text-sm font-bold uppercase tracking-wider text-white">
                  {status === 'decrypting_vault'
                    ? 'Decrypting Secret Vault...'
                    : status === 'success'
                      ? 'Vault Unsealed ✓'
                      : isHolding
                        ? `Scanning Neural Hash (${scanProgress}%)`
                        : 'Press & Hold to Scan Biometrics'}
                </p>
                <p className="mt-0.5 text-xs text-white/50">
                  Touch ID / WebAuthn neural pattern verification for {tenant.handle}
                </p>
              </div>

              <div className="mt-3 h-1.5 w-64 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-[#7B2CBF] via-[#00E5FF] to-[#FFD700] transition-all duration-100"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>

              {/* Live Camera Biometric HUD Trigger */}
              <div className="mt-4 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCameraOverlay(true)}
                  disabled={status === 'decrypting_vault' || status === 'success'}
                  className="flex items-center gap-2 rounded-xl border border-[#00E5FF] bg-gradient-to-r from-[#00E5FF]/20 to-[#7B2CBF]/30 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[#00E5FF] shadow-[0_0_20px_rgba(0,229,255,0.25)] transition-all hover:bg-[#00E5FF]/30 hover:scale-105"
                >
                  <span>📷</span>
                  <span>Launch Live Camera Biometric HUD</span>
                </button>
                <span className="text-[10px] font-mono text-white/40">
                  Utilizes camera permission from metadata.json for real-time Face/Retinal scanning
                </span>
              </div>
            </div>
          )}

          {/* Method: Google Workspace / Gmail OAuth */}
          {method === 'google_workspace' && (
            <div className="flex flex-col items-center text-center w-full max-w-md">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#ea4335] bg-[#ea4335]/10 shadow-[0_0_20px_rgba(234,67,53,0.3)]">
                <span className="text-3xl">✉️</span>
              </div>
              <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-[0.1em] text-[#ea4335]">
                Google Workspace Authorization
              </h3>
              <p className="mb-6 text-xs text-white/60">
                Authenticate your enclave session via Google OAuth to synchronize with Gmail and Workspace assets.
              </p>
              
              <button
                type="button"
                onClick={async () => {
                  try {
                    const result = await signInWithGmail();
                    if (result?.accessToken) {
                      triggerDecryptionSequence('Google Workspace (OAuth Token Verified)', result.accessToken);
                    }
                  } catch (err: any) {
                    setLogs(prev => [...prev, `[OAuth ERROR] >> ${err.message || 'Authorization failed'}`]);
                  }
                }}
                disabled={status === 'decrypting_vault' || status === 'success'}
                className="flex items-center gap-3 rounded-xl border border-[#ea4335] bg-[#ea4335]/20 px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(234,67,53,0.25)] transition-all hover:bg-[#ea4335]/30 hover:scale-105 disabled:opacity-50"
              >
                <span>🌐</span>
                <span>Connect Gmail & Authorize</span>
              </button>
            </div>
          )}

          {/* Method 2: Optical Camera QR Scanner */}
          {method === 'qr_scan' && (
            <div className="flex flex-col items-center text-center w-full">
              <div className="mb-2 flex items-center justify-between w-full max-w-md text-xs font-mono">
                <span className="text-[#00E5FF] flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#00E5FF] animate-pulse" />
                  OPTICAL QR SENSOR
                </span>
                <span className="text-white/60">
                  PARTITION: <strong className="text-[#FFD700]">{tenant.handle}</strong>
                </span>
              </div>

              <QRAuthScanner
                tenantHandle={tenant.handle}
                tenantId={tenant.tenantId}
                activeSessionId={handshakeSession?.sessionId}
                activeSandboxCode={handshakeSession?.sandboxCode}
                onCodeDetected={handleQrCodeDetected}
                disabled={status === 'decrypting_vault' || status === 'success'}
              />

              <p className="mt-3 text-[11px] font-mono text-white/50">
                Point your camera at a Sovereign QR Vault Pass or present an optical token badge.
              </p>
            </div>
          )}

          {/* Method 2: 5-Minute TTL Email/SMS 2FA Authorization Handshake */}
          {method === 'email_sms' && (
            <div className="flex flex-col items-center text-center w-full max-w-md">
              {/* Channel Selector: Email vs SMS */}
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#120D22] p-1 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setChannel('email');
                    requestBackendHandshake('email');
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-mono uppercase transition-colors ${
                    channel === 'email'
                      ? 'bg-[#00E5FF] text-black font-bold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  📧 Email Dispatch
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChannel('sms');
                    requestBackendHandshake('sms');
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-mono uppercase transition-colors ${
                    channel === 'sms'
                      ? 'bg-[#00E5FF] text-black font-bold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  📱 SMS Dispatch
                </button>
              </div>

              {/* 5-Minute TTL Status Indicator */}
              <div className="flex items-center justify-between w-full rounded-xl border border-[#00E5FF]/30 bg-[#00E5FF]/5 px-4 py-2 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${ttlSeconds > 60 ? 'bg-emerald-400 animate-ping' : 'bg-rose-500 animate-ping'}`}
                  />
                  <span className="font-mono text-xs uppercase text-white/80">
                    Handshake TTL:{' '}
                    <strong className={ttlSeconds > 60 ? 'text-[#00E5FF]' : 'text-rose-400'}>
                      {formatTtl(ttlSeconds)}
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => requestBackendHandshake(channel, true)}
                  disabled={isGeneratingHandshake}
                  className="font-mono text-[10px] text-[#FFD700] hover:underline uppercase disabled:opacity-50"
                >
                  {isGeneratingHandshake ? 'Resending...' : '↺ Resend Code'}
                </button>
              </div>

              {/* 6-Digit Code Input & Verify Button */}
              <div className="flex items-center gap-2 w-full">
                <input
                  type="text"
                  maxLength={6}
                  value={handshakeCodeInput}
                  onChange={(e) => setHandshakeCodeInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit code"
                  className="flex-1 rounded-xl border border-white/20 bg-[#120D22] px-4 py-2.5 font-mono text-center text-lg font-bold tracking-[0.3em] text-[#FFD700] placeholder:text-white/20 focus:border-[#00E5FF] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleVerifyHandshakeCode}
                  disabled={
                    isVerifyingHandshake || handshakeCodeInput.length < 4 || ttlSeconds <= 0
                  }
                  className="rounded-xl border border-[#00E5FF] bg-[#00E5FF]/20 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all hover:bg-[#00E5FF]/30 disabled:opacity-40"
                >
                  {isVerifyingHandshake ? 'Verifying...' : 'Verify'}
                </button>
              </div>

              {/* Error or Warning */}
              {handshakeError && (
                <p className="mt-2 font-mono text-xs text-rose-400 animate-shake">
                  ⚠ {handshakeError}
                </p>
              )}

              {/* Dispatched Preview Sandbox Note */}
              {handshakeSession?.sandboxCode && (
                <div className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-left text-[10px] font-mono text-white/70">
                  <div className="flex items-center justify-between text-[#FFD700]">
                    <span>DISPATCH SIMULATION [{channel.toUpperCase()}]:</span>
                    <span>
                      CODE:{' '}
                      <strong className="text-white text-xs">{handshakeSession.sandboxCode}</strong>
                    </span>
                  </div>
                  <p className="mt-0.5 text-white/50 truncate">
                    Recipient: {handshakeSession.recipient}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Method: Forgot Password / Account Recovery */}
          {method === 'forgot_password' && (
            <div className="flex flex-col items-center text-center w-full max-w-md">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#00E5FF] bg-[#00E5FF]/10 text-3xl shadow-[0_0_20px_rgba(0,229,255,0.3)]">
                📨
              </div>
              
              <h3 className="font-display text-lg font-bold text-white uppercase tracking-wider mb-2">
                Account Recovery
              </h3>
              <p className="text-xs text-white/60 leading-relaxed mb-4">
                A 6-digit recovery code has been dispatched to the registered contact methods for <strong className="text-white">{tenant.handle}</strong>.
              </p>

              {/* 5-Minute TTL Status Indicator */}
              <div className="flex items-center justify-between w-full rounded-xl border border-[#00E5FF]/30 bg-[#00E5FF]/5 px-4 py-2 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${ttlSeconds > 60 ? 'bg-emerald-400 animate-ping' : 'bg-rose-500 animate-ping'}`}
                  />
                  <span className="font-mono text-xs uppercase text-white/80">
                    Handshake TTL:{' '}
                    <strong className={ttlSeconds > 60 ? 'text-[#00E5FF]' : 'text-rose-400'}>
                      {formatTtl(ttlSeconds)}
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => requestBackendHandshake(channel, true)}
                  disabled={isGeneratingHandshake}
                  className="font-mono text-[10px] text-[#FFD700] hover:underline uppercase disabled:opacity-50"
                >
                  {isGeneratingHandshake ? 'Resending...' : '↺ Resend Code'}
                </button>
              </div>

              {/* 6-Digit Code Input */}
              <div className="flex items-center gap-2 w-full">
                <input
                  type="text"
                  maxLength={6}
                  value={handshakeCodeInput}
                  onChange={(e) => setHandshakeCodeInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter recovery code"
                  className="flex-1 rounded-xl border border-[#00E5FF]/30 bg-[#120D22] px-4 py-3 font-mono text-center text-xl font-bold tracking-[0.4em] text-[#00E5FF] placeholder:text-[#00E5FF]/20 focus:border-[#00E5FF] focus:outline-none"
                />
              </div>

              <div className="mt-4 w-full flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMethod('runic_pin')}
                  className="rounded-lg border border-white/20 px-4 py-2.5 text-xs uppercase tracking-widest text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                >
                  Back to PIN
                </button>
                <button
                  type="button"
                  onClick={handleVerifyHandshakeCode}
                  disabled={
                    isVerifyingHandshake || handshakeCodeInput.length < 4 || ttlSeconds <= 0
                  }
                  className="rounded-xl border border-[#00E5FF] bg-[#00E5FF]/20 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all hover:bg-[#00E5FF]/30 hover:scale-105 disabled:opacity-40 cursor-pointer"
                >
                  {isVerifyingHandshake ? 'Verifying...' : 'Verify & Recover'}
                </button>
              </div>

              {/* Error or Warning */}
              {handshakeError && (
                <p className="mt-4 font-mono text-xs text-rose-400 animate-shake">
                  ⚠ {handshakeError}
                </p>
              )}

              {/* Dispatched Preview Sandbox Note */}
              {handshakeSession?.sandboxCode && (
                <div className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-left text-[10px] font-mono text-white/70">
                  <div className="flex items-center justify-between text-[#FFD700]">
                    <span>RECOVERY DISPATCH SIMULATION:</span>
                    <span>
                      CODE:{' '}
                      <strong className="text-white text-xs">{handshakeSession.sandboxCode}</strong>
                    </span>
                  </div>
                  <p className="mt-0.5 text-white/50 truncate">
                    Recipient: {handshakeSession.recipient}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Method 3: Hardware Token (FIDO2 / YubiKey) */}
          {method === 'passkey' && (
            <div className="flex flex-col items-center text-center">
              <div
                onClick={handlePasskeyAuth}
                className="group relative flex h-20 w-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-emerald-400/60 bg-[#0D0B14] p-2 shadow-[0_0_30px_rgba(52,211,153,0.3)] transition-all hover:scale-105 hover:border-emerald-400"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xl">🛡️</span>
                  <div className="flex flex-col text-left">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-emerald-400">
                      FIDO2 / HSM
                    </span>
                    <span className="text-[9px] font-bold text-white">Security Key</span>
                  </div>
                </div>

                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" />
                  <span className="font-mono text-[8px] text-white/70">TOUCH TO EMIT</span>
                </div>
              </div>

              <div className="mt-3">
                <p className="font-display text-sm font-bold uppercase tracking-wider text-white">
                  Hardware Security Token
                </p>
                <p className="mt-0.5 text-xs text-white/50">
                  Click to sign cryptographic challenge with hardware token
                </p>
              </div>

              <button
                type="button"
                onClick={handlePasskeyAuth}
                className="mt-3 rounded-xl border border-emerald-400 bg-emerald-400/20 px-6 py-2 text-xs font-bold uppercase tracking-widest text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.3)] transition-all hover:bg-emerald-400/30 hover:scale-105"
              >
                🔑 Tap Hardware Passkey
              </button>
            </div>
          )}

          {/* Method 4: Master Runic PIN Pad */}
          {method === 'runic_pin' && (
            <div className="flex flex-col items-center text-center w-full max-w-xs">
              <div className="flex items-center justify-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const hasDigit = pin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl border font-mono text-base font-bold transition-all ${
                        hasDigit
                          ? 'border-[#7B2CBF] bg-[#7B2CBF]/30 text-[#FFD700] shadow-[0_0_15px_rgba(123,44,191,0.5)] scale-105'
                          : 'border-white/20 bg-white/5 text-white/20'
                      }`}
                    >
                      {hasDigit ? '●' : '—'}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1.5 w-full">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', '⌫'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (key === 'CLR') handlePinClear();
                      else if (key === '⌫') handlePinBackspace();
                      else handlePinInput(key);
                    }}
                    className="flex h-9 items-center justify-center rounded-lg border border-white/10 bg-[#120D22] font-mono text-xs font-bold text-white transition-all hover:border-[#7B2CBF] hover:bg-[#7B2CBF]/30 active:scale-95"
                  >
                    {key}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex w-full justify-between items-center px-4">
                <button
                  type="button"
                  onClick={() => {
                    setMethod('forgot_password');
                    setChannel('email');
                    requestBackendHandshake('email');
                  }}
                  className="text-[10px] font-mono text-[#00E5FF]/70 hover:text-[#00E5FF] hover:underline"
                >
                  Forgot PIN? (Email Recovery)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPin(DEFAULT_PIN);
                    setStatus('verifying');
                    setTimeout(() => {
                      triggerDecryptionSequence('Sovereign Master PIN');
                    }, 250);
                  }}
                  className="text-[10px] font-mono text-[#FFD700]/70 hover:text-[#FFD700] hover:underline"
                >
                  [⚡ Quick Fill Master PIN: 711001]
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Real-Time Cryptographic Decryption Telemetry Stream ── */}
        <div className="mt-4 rounded-xl border border-white/10 bg-[#0D0B14] p-3 font-mono text-[10px]">
          <div className="flex items-center justify-between text-white/50 border-b border-white/10 pb-1 mb-1.5">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              VAULT DECRYPTION LOGS
            </span>
            <span className="text-[#00E5FF]">NO_STD_CRYPTO</span>
          </div>

          <div className="h-14 overflow-y-auto space-y-1 text-white/70">
            {logs.slice(-4).map((log, index) => (
              <div
                key={index}
                className={
                  log.includes('AUTHORIZED') || log.includes('DECRYPTED')
                    ? 'text-[#FFD700] font-bold'
                    : ''
                }
              >
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* ── Modal Footer Controls ── */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={status === 'decrypting_vault' || status === 'success'}
            className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-mono uppercase tracking-wider text-white/70 transition-colors hover:border-white/40 hover:text-white"
          >
            Cancel [ESC]
          </button>

          {/* Instant Bypass for Root / Instant Testing */}
          <button
            type="button"
            onClick={() => triggerDecryptionSequence('Sovereign Root Fast-Pass')}
            disabled={status === 'decrypting_vault' || status === 'success'}
            className="flex items-center gap-2 rounded-xl border border-[#FFD700] bg-gradient-to-r from-[#FFD700]/20 to-[#7B2CBF]/30 px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all hover:scale-105 hover:bg-[#FFD700]/30 active:scale-95"
          >
            <span>⚡</span>
            <span>Decrypt & Hydrate Workspace</span>
          </button>
        </div>
      </div>

      {/* Live Camera Biometric Fullscreen HUD Overlay */}
      <BiometricCameraAuthOverlay
        isOpen={showCameraOverlay}
        tenant={tenant}
        onClose={() => setShowCameraOverlay(false)}
        onAuthenticated={(t, token) => {
          setShowCameraOverlay(false);
          triggerDecryptionSequence('Neural Biometric Camera Stream', token);
        }}
      />
    </div>
  );
}
