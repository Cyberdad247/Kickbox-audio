'use client';

import type React from 'react';
import { useState } from 'react';
import type { SecurityClearance, TenantProfile } from '../../types/tenant';

interface AddKnightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (tenant: Omit<TenantProfile, 'id' | 'lastActive'>) => void;
}

const AVATAR_OPTIONS = ['🛡️', '⚡', '🏹', '🦅', '🧪', '💎', '🔥', '🐉', '🏛️', '🌟', '🗝️', '🛸'];

const CLEARANCES: SecurityClearance[] = [
  'HUMAN_REFERRAL_CONTROLLER',
  'SOVEREIGN_ARCH_ARCHITECT',
  'SOVEREIGN_ROOT',
];

export function AddKnightModal({ isOpen, onClose, onAdd }: AddKnightModalProps) {
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otp, setOtp] = useState('');
  const [expectedOtp, setExpectedOtp] = useState('');

  const [handle, setHandle] = useState(''); // username
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Verified Human Invitee · Sovereign Node Operator');
  const [tenantId, setTenantId] = useState(`REF-HUMAN-${Math.floor(Math.random() * 89 + 10)}`);
  const [referralCode, setReferralCode] = useState(
    `REF-ARCH-711-${Math.random().toString(16).substring(2, 6).toUpperCase()}`,
  );
  const [clearance, setClearance] = useState<SecurityClearance>('HUMAN_REFERRAL_CONTROLLER');
  const [avatar, setAvatar] = useState('🛡️');
  const [ramTotal, setRamTotal] = useState(4.0);
  const [subAgentsInput, setSubAgentsInput] = useState('Anya (Voice HUD), Sir Sentinel (Hit-Gate)');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim() || !name.trim() || !email.trim()) return;

    // Generate random 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setExpectedOtp(generatedOtp);
    setStep('otp');
    // Simulate sending email (in a real app, backend sends this)
    console.log(`[AUTH SYSTEM] >> OTP ${generatedOtp} dispatched to ${email}`);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== expectedOtp && otp !== '000000') {
      alert('Invalid Authorization Code. Please try again or use 000000 (override).');
      return;
    }

    const subAgents = subAgentsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onAdd({
      handle: handle.trim().toUpperCase(),
      name: name.trim(),
      email: email.trim() || undefined,
      role: role.trim() || 'Verified Human Invitee · Sovereign Node Operator',
      tenantId: tenantId.trim() || `REF-HUMAN-${Math.floor(Math.random() * 89 + 10)}`,
      clearance,
      controllerType: 'HUMAN_REFERRAL',
      humanVerified: true,
      referralBy: 'VASHON_ARCH',
      referralCode: referralCode.trim(),
      avatar,
      sigilColor: '#00E5FF',
      memory: { used: Number((ramTotal * 0.35).toFixed(1)), total: Number(ramTotal) },
      latency: `${Math.floor(Math.random() * 12 + 8)}ms`,
      coreSync: 'OPTIMAL',
      subAgents: subAgents.length > 0 ? subAgents : ['Anya (Voice HUD)', 'Sir Sentinel (Hit-Gate)'],
      cipher: 'ED25519_REFERRAL_SEAL',
      description:
        description.trim() ||
        'Verified human sovereign node operator invited via Arch-Architect cryptographic referral signature.',
      configuration: {
        theme: 'cyan-obsidian',
        activeCartridgeId: 'cart-human-workspace',
        voicePersona: 'Lakisha',
        autoArmDefense: true,
        allowKnightSwitchOverride: false,
        customTokens: [`TOKEN_REF_${handle.trim().toUpperCase()}`, 'SIGIL_HUMAN_CONTROLLER'],
        cartridges: [
          {
            id: 'cart-human-workspace',
            title: 'Sovereign Human Workspace & Neural Bridge',
            code: 'CART_HUMAN_W1',
            category: 'SYSTEM',
            description:
              'Sandboxed human workspace with verified referral provenance and hardware mTLS audio gateway.',
            allowKnightSwitch: false,
            icon: '🛡️',
            status: 'active',
            runtimeTier: 'Ring 1 Workspace',
            version: '2.0.0',
          },
          {
            id: 'cart-referral-vault',
            title: 'Verified Referral Isolation & Zero-Trust Enclave',
            code: 'CART_REF_VAULT',
            category: 'SECURITY',
            description:
              'Zero-trust tenant isolation preventing cross-partition leakage and enforcing rate limits.',
            allowKnightSwitch: false,
            icon: '🔐',
            status: 'mounted',
            runtimeTier: 'Ring 1 Security',
            version: '1.5.0',
          },
        ],
      },
    });

    onClose();
    // Reset fields
    setStep('form');
    setOtp('');
    setExpectedOtp('');
    setHandle('');
    setName('');
    setEmail('');
    setRole('Verified Human Invitee · Sovereign Node Operator');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6 md:p-10">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
      />

      {/* Modal Container */}
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-[#00E5FF]/60 bg-[#0D0B14] p-6 shadow-[0_0_40px_rgba(0,229,255,0.3)] backdrop-blur-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#00E5FF]/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#00E5FF]/50 bg-[#00E5FF]/10 text-xl text-[#00E5FF]">
              👤
            </div>
            <div>
              <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-[#00E5FF]">
                Authorize Human Referral User
              </h2>
              <p className="text-[10px] uppercase tracking-widest text-[#FFD700]/70">
                Sovereign Arch-Architect Cryptographic Invitee Matrix
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded border border-white/20 text-white/60 transition-colors hover:border-[#00E5FF] hover:text-[#00E5FF]"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        {step === 'form' ? (
          <form onSubmit={handleFormSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto pt-4">
            {/* Avatar Sigil Selector */}
            <div>
              <label className="mb-2 block text-[10px] uppercase tracking-widest text-white/50">
                Select Human Controller Avatar
              </label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_OPTIONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setAvatar(icon)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border text-xl transition-all ${
                      avatar === icon
                        ? 'border-[#00E5FF] bg-[#00E5FF]/20 shadow-[0_0_12px_rgba(0,229,255,0.5)] scale-110'
                        : 'border-white/10 bg-white/5 hover:border-[#00E5FF]'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Handle & Tenant ID */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/50">
                  Username (Handle / Callsign) *
                </label>
                <input
                  type="text"
                  required
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="e.g. HUMAN_NODE_03"
                  className="w-full rounded-lg border border-[#00E5FF]/40 bg-[#120D22] px-3 py-2 text-xs uppercase tracking-wider text-white placeholder:text-white/20 focus:border-[#00E5FF] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/50">
                  Tenant Partition ID *
                </label>
                <input
                  type="text"
                  required
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  placeholder="e.g. REF-HUMAN-03"
                  className="w-full rounded-lg border border-[#00E5FF]/40 bg-[#120D22] px-3 py-2 text-xs uppercase tracking-wider text-white placeholder:text-white/20 focus:border-[#00E5FF] focus:outline-none"
                />
              </div>
            </div>

            {/* Full Name & Email */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/50">
                  Full Profile Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alexander Vance"
                  className="w-full rounded-lg border border-[#00E5FF]/40 bg-[#120D22] px-3 py-2 text-xs tracking-wide text-white placeholder:text-white/20 focus:border-[#00E5FF] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/50">
                  Contact Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. operator@domain.com"
                  className="w-full rounded-lg border border-[#00E5FF]/40 bg-[#120D22] px-3 py-2 text-xs text-white placeholder:text-white/20 focus:border-[#00E5FF] focus:outline-none"
                />
              </div>
            </div>

            {/* Referral Authorization Code & Clearance */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/50">
                  Arch-Architect Referral Code *
                </label>
                <input
                  type="text"
                  required
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="e.g. REF-ARCH-711-ALPHA"
                  className="w-full rounded-lg border border-[#FFD700]/50 bg-[#120D22] px-3 py-2 font-mono text-xs uppercase tracking-wider text-[#FFD700] focus:border-[#FFD700] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/50">
                  Security Clearance Tier
                </label>
                <select
                  value={clearance}
                  onChange={(e) => setClearance(e.target.value as SecurityClearance)}
                  className="w-full rounded-lg border border-[#00E5FF]/40 bg-[#120D22] px-3 py-2 text-xs uppercase tracking-wider text-[#00E5FF] focus:border-[#00E5FF] focus:outline-none"
                >
                  {CLEARANCES.map((c) => (
                    <option key={c} value={c} className="bg-[#0D0B14] text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Role Description */}
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/50">
                Role & Operational Scope
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Verified Human Invitee · Sovereign Node Operator"
                className="w-full rounded-lg border border-[#00E5FF]/40 bg-[#120D22] px-3 py-2 text-xs text-white placeholder:text-white/20 focus:border-[#00E5FF] focus:outline-none"
              />
            </div>

            {/* Memory Quota & Sub-agents */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 flex justify-between text-[10px] uppercase tracking-widest text-white/50">
                  <span>MicroVM Memory Quota</span>
                  <span className="text-[#00E5FF]">{ramTotal} GB</span>
                </label>
                <input
                  type="range"
                  min="1.0"
                  max="8.0"
                  step="0.5"
                  value={ramTotal}
                  onChange={(e) => setRamTotal(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer accent-[#00E5FF]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/50">
                  Assigned Sub-Agents (Comma-separated)
                </label>
                <input
                  type="text"
                  value={subAgentsInput}
                  onChange={(e) => setSubAgentsInput(e.target.value)}
                  placeholder="Anya (Voice HUD), Sir Sentinel"
                  className="w-full rounded-lg border border-[#00E5FF]/40 bg-[#120D22] px-3 py-2 text-xs text-white placeholder:text-white/20 focus:border-[#00E5FF] focus:outline-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex items-center justify-end gap-3 border-t border-[#00E5FF]/30 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg border border-[#00E5FF] bg-[#00E5FF]/20 px-5 py-2 text-xs font-bold uppercase tracking-[0.15em] text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all hover:bg-[#00E5FF]/30 hover:scale-105"
              >
                <span>👤</span>
                <span>Send Authorization Code</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="flex flex-1 flex-col items-center justify-center gap-6 py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#FFD700] bg-[#FFD700]/10 text-3xl shadow-[0_0_30px_rgba(255,215,0,0.3)] animate-pulse">
              📨
            </div>
            
            <div className="text-center max-w-sm">
              <h3 className="font-display text-lg font-bold text-[#FFD700] uppercase tracking-widest mb-2">
                Verify Identity
              </h3>
              <p className="text-xs text-white/70 leading-relaxed">
                A 6-digit authorization code has been dispatched to <strong className="text-white">{email}</strong>. 
                Please enter the code below to finalize your cryptographic referral seal.
              </p>
              <p className="mt-2 text-[10px] text-white/40 font-mono">
                (Simulated Sandbox: Use the generated code {expectedOtp} or 000000 to bypass)
              </p>
            </div>

            <div className="w-full max-w-xs">
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="0 0 0 0 0 0"
                className="w-full rounded-xl border-2 border-[#FFD700]/50 bg-[#120D22] px-6 py-4 text-center text-3xl font-mono font-bold tracking-[0.5em] text-[#FFD700] placeholder:text-white/10 focus:border-[#FFD700] focus:outline-none"
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="rounded-lg border border-white/20 px-6 py-3 text-xs uppercase tracking-widest text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={otp.length < 4}
                className="flex items-center gap-2 rounded-lg border border-[#FFD700] bg-[#FFD700]/20 px-8 py-3 text-sm font-bold uppercase tracking-[0.15em] text-[#FFD700] shadow-[0_0_25px_rgba(255,215,0,0.4)] transition-all hover:bg-[#FFD700]/30 disabled:opacity-50"
              >
                <span>Verify & Complete</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
