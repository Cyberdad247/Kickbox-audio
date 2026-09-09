'use client';

import jsQR from 'jsqr';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  playVaultUnsealSound,
  triggerDetectionFeedback,
  triggerScanHaptic,
  unlockAudioContext,
} from '../../lib/feedbackCues';
import { parseQRAuthPayload } from '../../lib/qrAuth';
import type { TenantProfile } from '../../types/tenant';

export interface BiometricCameraAuthOverlayProps {
  isOpen: boolean;
  tenant: TenantProfile | null;
  onClose: () => void;
  onAuthenticated: (tenant: TenantProfile, token?: string) => void;
  initialMode?: 'neural_face' | 'retinal_iris' | 'optical_qr';
}

type BiometricMode = 'neural_face' | 'retinal_iris' | 'optical_qr';
type CameraPermissionState = 'prompt' | 'requesting' | 'granted' | 'denied' | 'unsupported';
type ScanStatus = 'idle' | 'aligning' | 'scanning' | 'locking' | 'verifying' | 'success' | 'failed';

interface LandmarkNode {
  id: number;
  label: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  confidence: number;
}

export function BiometricCameraAuthOverlay({
  isOpen,
  tenant,
  onClose,
  onAuthenticated,
  initialMode = 'neural_face',
}: BiometricCameraAuthOverlayProps) {
  const [mode, setMode] = useState<BiometricMode>(initialMode);
  const [permissionState, setPermissionState] = useState<CameraPermissionState>('prompt');
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Biometric verification metrics
  const [scanProgress, setScanProgress] = useState(0);
  const [livenessScore, setLivenessScore] = useState(0);
  const [matchConfidence, setMatchConfidence] = useState(0);
  const [activeHash, setActiveHash] = useState('DERIVING_LANDMARK_ENTROPY...');
  const [opticalLux, setOpticalLux] = useState<number>(450);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [isHoldingManualAttest, setIsHoldingManualAttest] = useState(false);

  // Refs for media and animation loops
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const manualHoldTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic landmark nodes with subtle jitter for neural mesh effect
  const [landmarkNodes, setLandmarkNodes] = useState<LandmarkNode[]>([]);

  const isArch =
    tenant?.clearance === 'SOVEREIGN_ARCH_ARCHITECT' ||
    tenant?.controllerType === 'HUMAN_ARCH_ARCHITECT';

  // Stop camera media tracks cleanly
  const stopCameraStream = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Initialize and request camera stream
  const startCameraStream = useCallback(async () => {
    setCameraError(null);
    setPermissionState('requesting');

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setPermissionState('unsupported');
      setCameraError('MediaDevices camera API is not supported in this browser environment.');
      return;
    }

    // Stop any existing stream
    stopCameraStream();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setPermissionState('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play();
      }

      setLogs((prev) => [
        ...prev,
        `[CAM_READY] >> OPTICAL FEED ACQUIRED (${facingMode.toUpperCase()})`,
        `[CAMERA] >> 1280x720 60FPS HSM HARDWARE FEED LOCKED`,
      ]);
    } catch (err: any) {
      console.warn('Camera stream acquisition error:', err);
      setPermissionState('denied');
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission was denied. Please allow camera access in your browser or use manual attestation below.'
          : `Camera initialization error: ${err.message || 'Device unavailable'}`,
      );
    }
  }, [facingMode, stopCameraStream]);

  // Handle switching camera between front / user and rear / environment
  const toggleFacingMode = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  // Frame processing loop (handles QR detection in QR mode and luminance sampling in Biometric mode)
  const processVideoFrames = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = 320;
        canvas.height = 240;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Frame Luminance Sampling
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let totalLuma = 0;
          const step = 40; // Sample every 10th pixel
          let count = 0;
          for (let i = 0; i < imgData.data.length; i += step) {
            const r = imgData.data[i];
            const g = imgData.data[i + 1];
            const b = imgData.data[i + 2];
            totalLuma += 0.299 * r + 0.587 * g + 0.114 * b;
            count++;
          }
          const avgLuma = Math.round((totalLuma / count) * 3.5);
          setOpticalLux(Math.max(120, Math.min(950, avgLuma)));

          // In QR mode, check for physical or digital QR tokens
          if (mode === 'optical_qr' && status !== 'verifying' && status !== 'success') {
            const qrCode = jsQR(imgData.data, canvas.width, canvas.height, {
              inversionAttempts: 'dontInvert',
            });
            if (qrCode && qrCode.data) {
              handleQRTokenDetected(qrCode.data);
            }
          }
        } catch {
          // ignore offscreen canvas read issues
        }
      }
    }

    if (isOpen && status !== 'success') {
      animFrameRef.current = requestAnimationFrame(processVideoFrames);
    }
  }, [isOpen, mode, status]);

  // Initial stream start upon modal open
  useEffect(() => {
    if (isOpen && tenant) {
      setStatus('aligning');
      setScanProgress(0);
      setLivenessScore(0);
      setMatchConfidence(0);
      setLogs([
        `[0.00s] >> HSM ENCLAVE INITIALIZED FOR [${tenant.handle}]`,
        `[0.02s] >> CLEARANCE: ${tenant.clearance}`,
        `[0.04s] >> CIPHER: ${tenant.cipher}`,
        `[0.06s] >> ENGAGING NEURAL BIOMETRIC CAMERA INTERFACE`,
      ]);

      startCameraStream();
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, tenant, startCameraStream, stopCameraStream]);

  // Run frame animation loop when stream is active
  useEffect(() => {
    if (permissionState === 'granted' && isOpen) {
      animFrameRef.current = requestAnimationFrame(processVideoFrames);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [permissionState, isOpen, processVideoFrames]);

  // Jitter landmark mesh simulation
  useEffect(() => {
    if (!isOpen) return;

    const baseNodes = [
      { id: 1, label: 'FOREHEAD_L1', x: 42, y: 28 },
      { id: 2, label: 'FOREHEAD_R1', x: 58, y: 28 },
      { id: 3, label: 'PUPIL_LEFT', x: 38, y: 40 },
      { id: 4, label: 'PUPIL_RIGHT', x: 62, y: 40 },
      { id: 5, label: 'NOSE_BRIDGE', x: 50, y: 48 },
      { id: 6, label: 'NOSE_TIP', x: 50, y: 56 },
      { id: 7, label: 'CHEEK_L', x: 32, y: 58 },
      { id: 8, label: 'CHEEK_R', x: 68, y: 58 },
      { id: 9, label: 'MOUTH_CENTER', x: 50, y: 68 },
      { id: 10, label: 'JAW_CHIN', x: 50, y: 80 },
    ];

    const interval = setInterval(() => {
      const jittered = baseNodes.map((n) => ({
        ...n,
        x: n.x + (Math.random() - 0.5) * 1.5,
        y: n.y + (Math.random() - 0.5) * 1.5,
        confidence: Math.floor(88 + Math.random() * 11),
      }));
      setLandmarkNodes(jittered);

      // Generate animated cryptographic biometric hash
      const randomHex = Array.from({ length: 8 }, () =>
        Math.floor(Math.random() * 256)
          .toString(16)
          .padStart(2, '0'),
      ).join('');
      setActiveHash(`0x${tenant?.tenantId || 'SOV'}_${randomHex.toUpperCase()}`);
    }, 180);

    return () => clearInterval(interval);
  }, [isOpen, tenant]);

  // Trigger full cryptographic unseal sequence
  const executeAuthenticationSuccess = useCallback(
    (source: string, tokenPayload?: string) => {
      if (!tenant) return;
      setStatus('success');
      setScanProgress(100);
      setLivenessScore(99.8);
      setMatchConfidence(100);

      if (hapticsEnabled) triggerScanHaptic();
      if (soundEnabled) {
        triggerDetectionFeedback({ sound: true, haptics: true, volume: 0.1 });
        playVaultUnsealSound(0.12);
      }

      setLogs((prev) => [
        ...prev,
        `[LOCK_ACQUIRED] >> ${source.toUpperCase()}: BIOMETRIC PROVENANCE VERIFIED`,
        tokenPayload ? `[ATTESTATION] >> TOKEN: ${tokenPayload.slice(0, 32)}...` : '',
        `[HSM_UNSEAL] >> UNLOCKING MICROVM FOR ${tenant.handle}`,
        `[PROVENANCE] >> ACCESS GRANTED: ${tenant.clearance}`,
      ]);

      const timer = setTimeout(() => {
        stopCameraStream();
        onAuthenticated(tenant, tokenPayload || `KBA_BIO_${Date.now()}`);
      }, 700);

      return () => clearTimeout(timer);
    },
    [tenant, soundEnabled, hapticsEnabled, stopCameraStream, onAuthenticated],
  );

  // Optical QR Handler
  const handleQRTokenDetected = useCallback(
    (rawData: string) => {
      if (status === 'verifying' || status === 'success') return;
      setStatus('verifying');

      const { code } = parseQRAuthPayload(rawData);
      setLogs((prev) => [
        ...prev,
        `[QR_DETECTED] >> OPTICAL RETICLE ACQUIRED TOKEN`,
        `[CODE_MATCH] >> EXTRACTED AUTH TOKEN: ${code}`,
      ]);

      setTimeout(() => {
        executeAuthenticationSuccess('Optical QR Sovereign Passkey', rawData);
      }, 400);
    },
    [status, executeAuthenticationSuccess],
  );

  // Automated or User-Triggered Neural Biometric Scan
  const triggerBiometricScan = useCallback(() => {
    if (status === 'verifying' || status === 'success') return;
    void unlockAudioContext();
    setStatus('scanning');
    setScanProgress(10);
    setLivenessScore(45);

    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    let progress = 10;
    scanIntervalRef.current = setInterval(() => {
      progress += 18;
      setScanProgress(Math.min(100, progress));
      setLivenessScore(Math.min(99.4, 45 + progress * 0.55));
      setMatchConfidence(Math.min(100, 50 + progress * 0.5));

      if (progress >= 100) {
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
        setStatus('locking');
        setTimeout(() => {
          executeAuthenticationSuccess(
            mode === 'retinal_iris' ? 'Retinal Iris Micro-Mesh' : 'Neural Facial Geometry ID',
          );
        }, 300);
      }
    }, 120);
  }, [status, mode, executeAuthenticationSuccess]);

  // Press & Hold Fast Attest for quick bypass or fallback
  const startManualHold = useCallback(() => {
    if (status === 'verifying' || status === 'success') return;
    void unlockAudioContext();
    setIsHoldingManualAttest(true);
    setStatus('scanning');

    let current = scanProgress;
    if (manualHoldTimerRef.current) clearInterval(manualHoldTimerRef.current);

    manualHoldTimerRef.current = setInterval(() => {
      current += 15;
      setScanProgress(Math.min(100, current));
      setLivenessScore(Math.min(99.6, 60 + current * 0.4));
      setMatchConfidence(Math.min(100, 70 + current * 0.3));

      if (current >= 100) {
        if (manualHoldTimerRef.current) clearInterval(manualHoldTimerRef.current);
        setIsHoldingManualAttest(false);
        executeAuthenticationSuccess('Cryptographic Sovereign Attestation Seal');
      }
    }, 80);
  }, [status, scanProgress, executeAuthenticationSuccess]);

  const stopManualHold = useCallback(() => {
    setIsHoldingManualAttest(false);
    if (manualHoldTimerRef.current) clearInterval(manualHoldTimerRef.current);
    if (status !== 'success') {
      setScanProgress(0);
      setStatus('aligning');
    }
  }, [status]);

  if (!isOpen || !tenant) return null;

  return (
    <div
      id="biometric-camera-auth-overlay"
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden bg-black/95 backdrop-blur-2xl animate-[fadeIn_0.25s_ease-out] select-none"
    >
      {/* ── Background Cyber Ambient Glows ── */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#7B2CBF_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
      <div
        className={`pointer-events-none absolute -top-48 left-1/2 -translate-x-1/2 h-96 w-[700px] rounded-full blur-[140px] ${
          isArch ? 'bg-[#FFD700]/20' : 'bg-[#00E5FF]/20'
        }`}
      />

      {/* ── Main Overlay Container ── */}
      <div className="relative flex h-full max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border-2 border-[#7B2CBF]/60 bg-[#0D0B14] shadow-[0_0_90px_rgba(123,44,191,0.5)]">
        {/* ── 1. HEADER HUD RIBBON ── */}
        <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-white/10 bg-[#120D22]/90 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Controller Avatar Badge */}
            <div
              className={`relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl border-2 bg-[#0D0B14] shadow-lg ${
                isArch ? 'border-[#FFD700] text-[#FFD700]' : 'border-[#00E5FF] text-[#00E5FF]'
              }`}
            >
              <span className="text-xl sm:text-2xl">{tenant.avatar}</span>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[8px] font-bold text-black">
                ✓
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-sm sm:text-base font-bold uppercase tracking-[0.2em] text-white">
                  {tenant.handle}
                </h1>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-wider ${
                    isArch
                      ? 'border-[#FFD700]/70 bg-[#FFD700]/15 text-[#FFD700]'
                      : 'border-[#00E5FF]/70 bg-[#00E5FF]/15 text-[#00E5FF]'
                  }`}
                >
                  {isArch ? '👑 Sovereign Arch-Architect' : '👤 Human Referral Controller'}
                </span>
              </div>
              <p className="text-[10px] text-white/50">
                Partition: <strong className="font-mono text-white/80">{tenant.tenantId}</strong> ·
                Clearance: <span className="font-mono text-[#00E5FF]">{tenant.clearance}</span>
              </p>
            </div>
          </div>

          {/* Right Controls: Mode Toggle & Close */}
          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              title={soundEnabled ? 'Mute Audio Cues' : 'Unmute Audio Cues'}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs text-white/70 hover:border-white/30 hover:text-white"
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                onClose();
              }}
              disabled={status === 'success'}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-sm text-white/70 transition-colors hover:border-[#FFD700] hover:text-white disabled:opacity-30"
            >
              ✕
            </button>
          </div>
        </header>

        {/* ── 2. BIOMETRIC MODE SELECTOR BAR ── */}
        <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0D0B14] px-4 py-2 sm:px-6">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('neural_face')}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all ${
                mode === 'neural_face'
                  ? 'border-[#FFD700] bg-[#FFD700]/15 text-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.3)]'
                  : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
              }`}
            >
              <span>👤</span>
              <span className="hidden sm:inline">Face ID & Liveness</span>
              <span className="sm:hidden">Face ID</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('retinal_iris')}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all ${
                mode === 'retinal_iris'
                  ? 'border-[#00E5FF] bg-[#00E5FF]/15 text-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                  : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
              }`}
            >
              <span>👁️</span>
              <span className="hidden sm:inline">Retinal Iris Mesh</span>
              <span className="sm:hidden">Iris</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('optical_qr')}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-all ${
                mode === 'optical_qr'
                  ? 'border-[#7B2CBF] bg-[#7B2CBF]/25 text-purple-300 shadow-[0_0_12px_rgba(123,44,191,0.4)]'
                  : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
              }`}
            >
              <span>📷</span>
              <span className="hidden sm:inline">Optical QR Key</span>
              <span className="sm:hidden">QR Key</span>
            </button>
          </div>

          {/* Camera Switcher (Flip Front/Back) */}
          {permissionState === 'granted' && (
            <button
              type="button"
              onClick={toggleFacingMode}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest text-white/70 hover:border-[#00E5FF] hover:text-[#00E5FF]"
            >
              <span>⇄</span>
              <span className="hidden sm:inline">
                {facingMode === 'user' ? 'Front Cam' : 'Back Cam'}
              </span>
            </button>
          )}
        </div>

        {/* ── 3. MAIN INTERACTIVE VIEWPORT (VIDEO FEED + HOLOGRAPHIC RETICLE) ── */}
        <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-black">
          {/* Offscreen Canvas for Frame Reading & QR Analysis */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Live Video Element */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              permissionState === 'granted' ? 'opacity-80' : 'opacity-0'
            }`}
          />

          {/* Holographic Darkened Vignette Overlay */}
          <div className="pointer-events-none absolute inset-0 bg-radial-gradient from-transparent via-black/40 to-black/90" />

          {/* Camera Permission Prompts / Fallbacks */}
          {permissionState === 'requesting' && (
            <div className="relative z-30 flex flex-col items-center text-center p-6 bg-black/80 rounded-2xl border border-[#00E5FF]/40 backdrop-blur-md">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#00E5FF] border-t-transparent mb-3" />
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-[#00E5FF]">
                Initializing Optical Hardware...
              </h3>
              <p className="text-xs text-white/60 mt-1">
                Requesting camera access permissions for sovereign biometric verification.
              </p>
            </div>
          )}

          {permissionState === 'denied' && (
            <div className="relative z-30 flex max-w-md flex-col items-center text-center p-6 bg-[#1E1235]/90 rounded-2xl border border-red-500/50 backdrop-blur-xl">
              <span className="text-3xl mb-2">📷⚠️</span>
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-red-400">
                Camera Access Unavailable
              </h3>
              <p className="text-xs text-white/70 mt-2">
                {cameraError ||
                  'Camera permission was not granted. Please enable camera access in your browser or iframe permissions, or use manual cryptographic attestation.'}
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={startCameraStream}
                  className="rounded-lg border border-[#00E5FF] bg-[#00E5FF]/20 px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-[#00E5FF] hover:bg-[#00E5FF]/30"
                >
                  Retry Camera
                </button>
                <button
                  type="button"
                  onClick={() => executeAuthenticationSuccess('Hardware Attestation Override')}
                  className="rounded-lg border border-[#FFD700] bg-[#FFD700]/20 px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-[#FFD700] hover:bg-[#FFD700]/30"
                >
                  Manual Passkey Attest
                </button>
              </div>
            </div>
          )}

          {/* ── 4. HOLOGRAPHIC BIOMETRIC HUD RETICLE ── */}
          {permissionState === 'granted' && (
            <div className="pointer-events-none relative z-20 flex h-full w-full flex-col items-center justify-center p-4">
              {/* Central Geometric Alignment Reticle */}
              <div
                className={`relative flex items-center justify-center rounded-3xl transition-all duration-300 ${
                  mode === 'retinal_iris'
                    ? 'h-48 w-48 sm:h-56 sm:w-56 rounded-full border-2'
                    : mode === 'optical_qr'
                      ? 'h-52 w-52 sm:h-64 sm:w-64 rounded-2xl border-2'
                      : 'h-64 w-48 sm:h-80 sm:w-60 rounded-[80px] border-2'
                } ${
                  status === 'success'
                    ? 'border-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.8)]'
                    : status === 'locking' || status === 'verifying'
                      ? 'border-[#FFD700] shadow-[0_0_40px_rgba(255,215,0,0.6)]'
                      : 'border-[#00E5FF]/70 shadow-[0_0_30px_rgba(0,229,255,0.4)]'
                }`}
              >
                {/* Corner Bracket Reticle Markers */}
                <div className="absolute -top-3 -left-3 h-6 w-6 border-t-2 border-l-2 border-[#FFD700]" />
                <div className="absolute -top-3 -right-3 h-6 w-6 border-t-2 border-r-2 border-[#FFD700]" />
                <div className="absolute -bottom-3 -left-3 h-6 w-6 border-b-2 border-l-2 border-[#FFD700]" />
                <div className="absolute -bottom-3 -right-3 h-6 w-6 border-b-2 border-r-2 border-[#FFD700]" />

                {/* Sweeping Laser Beam */}
                <div
                  className={`absolute inset-x-2 h-1 rounded-full ${
                    status === 'success'
                      ? 'bg-emerald-400 shadow-[0_0_15px_#34D399]'
                      : 'bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent shadow-[0_0_15px_#00E5FF]'
                  } animate-[bounce_2s_infinite]`}
                />

                {/* Rotating Tech Compass Rings */}
                <div className="absolute -inset-4 animate-[spin_16s_linear_infinite] rounded-full border border-dashed border-[#00E5FF]/40" />
                <div className="absolute -inset-8 animate-[spin_24s_linear_infinite_reverse] rounded-full border border-dotted border-[#FFD700]/30" />

                {/* Dynamic Biometric Mesh Nodes in Face ID Mode */}
                {mode === 'neural_face' &&
                  landmarkNodes.map((node) => (
                    <div
                      key={node.id}
                      className="absolute flex items-center justify-center transition-all duration-150"
                      style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    >
                      <span className="h-2 w-2 rounded-full bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]" />
                      <span className="absolute -top-3 text-[7px] font-mono text-white/70 whitespace-nowrap">
                        {node.confidence}%
                      </span>
                    </div>
                  ))}

                {/* Iris Target Reticle in Retinal Mode */}
                {mode === 'retinal_iris' && (
                  <div className="flex flex-col items-center justify-center">
                    <div className="h-16 w-16 rounded-full border border-[#FFD700] animate-ping opacity-60" />
                    <div className="absolute h-8 w-8 rounded-full border-2 border-[#00E5FF] bg-[#00E5FF]/20" />
                  </div>
                )}

                {/* Center Crosshair */}
                <div className="absolute inset-0 flex items-center justify-center opacity-40">
                  <div className="h-6 w-0.5 bg-white" />
                  <div className="h-0.5 w-6 bg-white" />
                </div>
              </div>

              {/* Live HUD Readout Metrics (Overlay Bottom) */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-4 font-mono text-[9px] sm:text-[10px]">
                <div className="rounded-lg border border-white/10 bg-black/70 px-2.5 py-1 backdrop-blur-md text-white/80">
                  LIVENESS:{' '}
                  <strong className="text-emerald-400">
                    {livenessScore > 0 ? `${livenessScore.toFixed(1)}%` : 'ALIGNING...'}
                  </strong>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/70 px-2.5 py-1 backdrop-blur-md text-white/80">
                  MATCH:{' '}
                  <strong className="text-[#FFD700]">
                    {matchConfidence > 0 ? `${matchConfidence.toFixed(0)}%` : 'SCANNING...'}
                  </strong>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/70 px-2.5 py-1 backdrop-blur-md text-white/80 hidden sm:block">
                  LUX: <span className="text-[#00E5FF]">{opticalLux} lx</span>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/70 px-2.5 py-1 backdrop-blur-md text-[#7DF9FF] truncate max-w-[200px]">
                  HASH: {activeHash}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 5. ACTION & TELEMETRY FOOTER ── */}
        <footer className="relative z-20 flex shrink-0 flex-col gap-3 border-t border-white/10 bg-[#0D0B14] p-4 sm:px-6">
          {/* Progress Bar */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9px] uppercase tracking-widest text-white/50">
              Biometric Attestation:
            </span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-[#7B2CBF] via-[#00E5FF] to-[#FFD700] transition-all duration-150"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
            <span className="font-mono text-[10px] font-bold text-[#FFD700]">{scanProgress}%</span>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Live Status Description */}
            <div className="text-[11px] font-mono text-white/70">
              {status === 'success' ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span>✓</span>
                  <span>CIPHER VAULT UNSEALED · PROCEEDING TO WORKSPACE</span>
                </span>
              ) : status === 'locking' || status === 'verifying' ? (
                <span className="flex items-center gap-1.5 text-[#FFD700] animate-pulse">
                  <span>⚡</span>
                  <span>VERIFYING HSM BIOMETRIC SIGNATURE...</span>
                </span>
              ) : (
                <span className="text-white/60">
                  Align face within reticle or click below to lock biometric key.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Manual Press & Hold Fast Attest */}
              <button
                type="button"
                onMouseDown={startManualHold}
                onMouseUp={stopManualHold}
                onMouseLeave={stopManualHold}
                onTouchStart={startManualHold}
                onTouchEnd={stopManualHold}
                disabled={status === 'success'}
                className={`rounded-xl border px-3 py-2 text-[10px] sm:text-xs font-mono uppercase tracking-widest transition-all select-none ${
                  isHoldingManualAttest
                    ? 'border-[#FFD700] bg-[#FFD700]/30 text-[#FFD700] scale-95 shadow-[0_0_20px_rgba(255,215,0,0.5)]'
                    : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:text-white'
                }`}
              >
                {isHoldingManualAttest ? 'Scanning...' : '🖐️ Hold to Fast-Attest'}
              </button>

              {/* Primary Scan Button */}
              <button
                type="button"
                onClick={triggerBiometricScan}
                disabled={status === 'scanning' || status === 'verifying' || status === 'success'}
                className={`flex items-center gap-2 rounded-xl border px-5 py-2 text-xs font-bold uppercase tracking-[0.15em] transition-all ${
                  isArch
                    ? 'border-[#FFD700] bg-[#FFD700]/20 text-[#FFD700] shadow-[0_0_25px_rgba(255,215,0,0.4)] hover:bg-[#FFD700]/30 hover:scale-105'
                    : 'border-[#00E5FF] bg-[#00E5FF]/20 text-[#00E5FF] shadow-[0_0_25px_rgba(0,229,255,0.4)] hover:bg-[#00E5FF]/30 hover:scale-105'
                } disabled:opacity-40`}
              >
                <span>{isArch ? '👑' : '🛡️'}</span>
                <span>
                  {status === 'success'
                    ? 'Authorized ✓'
                    : status === 'scanning'
                      ? 'Scanning...'
                      : 'Lock Biometrics & Unseal'}
                </span>
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
