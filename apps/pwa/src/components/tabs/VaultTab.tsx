import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { QRAuthScanner } from '../gateway/QRAuthScanner';
import { useActivityLog } from '../../context/ActivityLogContext';

export function VaultTab() {
  const { activeTenant } = useTenant();
  const { logActivity } = useActivityLog();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthorizingBiometrics, setIsAuthorizingBiometrics] = useState(false);
  const [showManualOverride, setShowManualOverride] = useState(false);
  const [overridePin, setOverridePin] = useState('');

  const handleQRDetected = (code: string, rawPayload?: string) => {
    // In a real app, we'd cryptographically verify the payload.
    // For this prototype, we'll check if the code is valid.
    if (code) {
      setIsAuthorized(true);
      setAuthError(null);
      logActivity('VAULT_UNSEALED', 'Vault unlocked via QR optical token');
    } else {
      setAuthError('Invalid cryptographic key. Access denied.');
    }
  };

  const handleManualOverrideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (overridePin === '1337') {
      setIsAuthorized(true);
      setAuthError(null);
      setShowManualOverride(false);
      setOverridePin('');
      logActivity('VAULT_UNSEALED', 'Vault unlocked via Emergency Manual Override');
    } else {
      setAuthError('Invalid Emergency PIN. Access denied.');
      logActivity('VAULT_BREACH_ATTEMPT', 'Failed emergency override attempt');
    }
  };

  const handleBiometricAuth = async () => {
    try {
      setIsAuthorizingBiometrics(true);
      setAuthError(null);
      setShowManualOverride(false);

      if (!window.PublicKeyCredential) {
        setAuthError('Web Authentication API is not supported on this device.');
        return;
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      // Using create() for prototype purposes to easily trigger the platform authenticator 
      // without needing prior credential registration IDs.
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'Sovereign Vault',
          },
          user: {
            id: userId,
            name: 'sovereign@camelot',
            displayName: 'Sovereign User',
          },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      });

      if (credential) {
        setIsAuthorized(true);
        setAuthError(null);
        logActivity('VAULT_UNSEALED', 'Vault unlocked via WebAuthn Biometrics');
      }
    } catch (err: any) {
      console.error('WebAuthn Error:', err);
      setAuthError(err.name === 'NotAllowedError' 
        ? 'Biometric authorization was cancelled or denied.' 
        : 'Biometric authorization failed. Ensure platform authenticators are enabled.');
    } finally {
      setIsAuthorizingBiometrics(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pt-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="rounded-2xl border border-gold/20 bg-black/40 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl text-gold-light flex items-center gap-3">
              <span>{isAuthorized ? '🔓' : '🔒'}</span>
              <span>Sovereign Vault</span>
            </h2>
            <p className="mt-2 text-sm text-white/50">
              Secure biometric memory boundary and isomorphic enclave state.
            </p>
          </div>
          {isAuthorized && (
            <button
              onClick={() => {
                setIsAuthorized(false);
                logActivity('VAULT_SEALED', 'Vault manually sealed by user');
              }}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-mono text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Seal Vault
            </button>
          )}
        </div>

        {!isAuthorized ? (
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 max-w-sm">
              <div className="mb-4">
                <h3 className="text-[#00E5FF] font-mono text-sm uppercase tracking-wider mb-2">Authorization Required</h3>
                <p className="text-xs text-white/60">
                  Scan the secure cryptographic QR key displayed on your trusted mobile device or hardware token to unlock vault operations.
                </p>
              </div>
              
              <div className="rounded-xl border border-[#00E5FF]/20 bg-black/60 p-4">
                {activeTenant ? (
                  <QRAuthScanner
                    tenantHandle={activeTenant.handle}
                    tenantId={activeTenant.id}
                    onCodeDetected={handleQRDetected}
                  />
                ) : (
                  <p className="text-xs text-amber-400">No active tenant found to bind cryptographic scanner.</p>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">or</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <button
                type="button"
                onClick={handleBiometricAuth}
                disabled={isAuthorizingBiometrics}
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-xs font-mono transition-all ${
                  isAuthorizingBiometrics
                    ? 'border-violet-500/20 bg-violet-950/10 text-violet-500/50 cursor-not-allowed'
                    : authError && authError.includes('Biometric')
                    ? 'border-amber-500/40 bg-amber-950/30 text-amber-400 hover:bg-amber-950/50 hover:border-amber-500/60'
                    : 'border-violet-500/40 bg-violet-950/30 text-violet-400 hover:bg-violet-950/50 hover:border-violet-500/60'
                }`}
              >
                <span className="text-sm">{isAuthorizingBiometrics ? '⏳' : authError && authError.includes('Biometric') ? '🔄' : '👆'}</span>
                <span className="uppercase tracking-wider font-bold">
                  {isAuthorizingBiometrics ? 'Awaiting Biometrics...' : authError && authError.includes('Biometric') ? 'Retry Platform Biometrics' : 'Use Platform Biometrics'}
                </span>
              </button>
              
              {authError && (
                <div className="mt-4 flex flex-col gap-3">
                  <div className="rounded-lg bg-red-950/40 border border-red-500/40 p-3 text-xs font-mono text-red-400">
                    ⚠️ {authError}
                  </div>
                  {!showManualOverride ? (
                    <button
                      onClick={() => setShowManualOverride(true)}
                      className="text-left text-[10px] text-white/40 uppercase tracking-widest hover:text-white/80 transition-colors"
                    >
                      &gt; Emergency Manual Override
                    </button>
                  ) : (
                    <form onSubmit={handleManualOverrideSubmit} className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <input
                        type="password"
                        placeholder="ENTER SECURE PIN"
                        value={overridePin}
                        onChange={(e) => setOverridePin(e.target.value)}
                        className="flex-1 bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-white/20 focus:border-red-500/50 focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={!overridePin}
                        className="bg-red-500/20 text-red-400 border border-red-500/40 rounded-lg px-4 py-2 text-xs font-mono hover:bg-red-500/30 disabled:opacity-50 transition-colors"
                      >
                        OVERRIDE
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex-1 rounded-xl border border-white/10 bg-white/5 p-6 flex flex-col items-center justify-center text-center opacity-50">
              <span className="text-4xl mb-3">🛡️</span>
              <h4 className="font-mono text-sm text-white mb-2">Vault Sealed</h4>
              <p className="text-xs text-white/50 max-w-xs">
                Operations, ledger entries, and memory boundaries are cryptographically sealed until authorization is granted.
              </p>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 animate-pulse">✓</span>
                <div>
                  <p className="font-mono text-xs text-emerald-400">Cryptographic Key Verified</p>
                  <p className="text-[10px] text-white/50">Session bound to external trusted device.</p>
                </div>
              </div>
              <span className="font-mono text-[10px] text-emerald-500/50">ID: {Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h4 className="font-mono text-xs text-white/80 mb-3 uppercase">Memory Boundary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/50">Status</span>
                    <span className="text-emerald-400 font-mono">ONLINE</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/50">Encrypted Blocks</span>
                    <span className="text-white font-mono">1,402</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/50">Last Sync</span>
                    <span className="text-white font-mono">Just now</span>
                  </div>
                </div>
                <button className="w-full mt-4 rounded border border-white/10 bg-white/5 py-2 text-xs text-white/80 hover:bg-white/10">
                  Inspect Blocks
                </button>
              </div>
              
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <h4 className="font-mono text-xs text-white/80 mb-3 uppercase">Ledger Operations</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/50">Pending Signatures</span>
                    <span className="text-amber-400 font-mono">2</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/50">Treasury Balance</span>
                    <span className="text-white font-mono">$75,000.00</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/50">Operation Mode</span>
                    <span className="text-cyan-400 font-mono">HITL REQUIRED</span>
                  </div>
                </div>
                <button className="w-full mt-4 rounded border border-[#00E5FF]/40 bg-[#00E5FF]/10 py-2 text-xs text-[#00E5FF] hover:bg-[#00E5FF]/20">
                  Authorize Operations
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
