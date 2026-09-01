'use client';

import React from 'react';

export interface VoiceCommandItem {
  phrase: string;
  aliases?: string[];
  description: string;
  category: 'Access & Gateway' | 'Sovereign Systems' | 'Knight AI & HUD';
  icon: string;
  badge?: string;
}

export const CAMELOT_VOICE_COMMANDS: VoiceCommandItem[] = [
  {
    phrase: 'Access Camelot',
    aliases: ['Enter', 'Unlock', 'Open', 'Start', 'Launch', 'Excalibur'],
    description: 'Triggers biometric unseal, cinematic warp sequence, and unlocks the workspace.',
    category: 'Access & Gateway',
    icon: '🛡️',
    badge: 'Primary Gate',
  },
  {
    phrase: 'Open Vault',
    aliases: ['Vault', 'Secure Storage', 'Open Storage'],
    description: 'Unseals the system and initializes Sovereign encrypted local storage.',
    category: 'Sovereign Systems',
    icon: '🔐',
    badge: 'AES-256',
  },
  {
    phrase: 'Sync Drive',
    aliases: ['Sync Storage', 'Cloud Sync', 'Google Drive'],
    description: 'Synchronizes Google Workspace credentials, Drive files, and telemetry state.',
    category: 'Sovereign Systems',
    icon: '⚡',
    badge: 'Live Bridge',
  },
  {
    phrase: 'System Status',
    aliases: ['Status', 'Telemetry', 'Diagnostics', 'Health Check'],
    description: 'Executes neural health diagnostics, latency probe, and hardware checks.',
    category: 'Sovereign Systems',
    icon: '📊',
    badge: 'Telemetric',
  },
  {
    phrase: 'Summon Lakisha',
    aliases: ['Voice HUD', 'Anya', 'Lakisha OS', 'Wake Assistant'],
    description: 'Mounts the low-latency WebRTC Lakisha voice assistant HUD.',
    category: 'Knight AI & HUD',
    icon: '🎙️',
    badge: 'WebRTC VAD',
  },
  {
    phrase: 'Knight Swarm',
    aliases: ['Swarm Status', 'Round Table', 'Agents'],
    description: 'Inspects distributed Knight agents (Sir Visage, Sir Hydron, Sir Stitch, Sally).',
    category: 'Knight AI & HUD',
    icon: '⚔️',
    badge: 'Multi-Agent',
  },
  {
    phrase: 'Auto Sleep',
    aliases: ['Sleep', 'Lock', 'Lock Session', 'Hibernate'],
    description: 'Triggers auto-sleep lock and returns to the Camelot OS sword & stone boot transition.',
    category: 'Access & Gateway',
    icon: '🌙',
    badge: '5m Inactivity',
  },
  {
    phrase: 'Show Commands',
    aliases: ['Help', 'Voice Help', 'Commands'],
    description: 'Opens or closes this voice command directive registry.',
    category: 'Access & Gateway',
    icon: '❓',
    badge: 'Reference',
  },
];

interface CamelotVoiceHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommand?: (command: string) => void;
}

export function CamelotVoiceHelpModal({
  isOpen,
  onClose,
  onSelectCommand,
}: CamelotVoiceHelpModalProps) {
  if (!isOpen) return null;

  const categories: Array<VoiceCommandItem['category']> = [
    'Access & Gateway',
    'Sovereign Systems',
    'Knight AI & HUD',
  ];

  return (
    <div
      id="camelot-voice-help-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050510]/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="camelot-voice-help-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-commands-title"
        className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border-2 border-[#D4AF37]/60 bg-[#090B14]/95 shadow-[0_0_50px_rgba(212,175,55,0.25)] flex flex-col text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFD700] to-transparent" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D4AF37]/30 bg-[#0D101C]/80">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#00F0FF]/50 bg-[#00F0FF]/10 text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </div>
            <div>
              <h2
                id="voice-commands-title"
                className="font-serif text-base sm:text-lg font-bold uppercase tracking-[0.15em] text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.4)]"
              >
                Voice Navigation Directives
              </h2>
              <p className="text-[11px] font-mono text-cyan-300/80">
                Web Speech API • Real-Time Natural Intent Matching
              </p>
            </div>
          </div>

          <button
            id="close-voice-help-btn"
            type="button"
            onClick={onClose}
            aria-label="Close voice commands help"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4AF37]/40 bg-[#151928] text-slate-400 hover:border-[#FFD700] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body - Scrollable Command List */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 custom-scrollbar">
          {/* Quick Guide Banner */}
          <div className="rounded-xl border border-[#00F0FF]/30 bg-[#001D2B]/40 p-3.5 flex items-center gap-3">
            <span className="text-xl">🎙️</span>
            <div className="text-xs text-cyan-100/90 leading-relaxed font-mono">
              Click <span className="font-bold text-[#00F0FF]">LISTEN</span> or press{' '}
              <span className="font-bold text-[#FFD700]">[ENTER]</span>, then speak any phrase below.
              You can also click any card to simulate the voice trigger.
            </div>
          </div>

          {/* Categorized Commands */}
          {categories.map((category) => {
            const commands = CAMELOT_VOICE_COMMANDS.filter((cmd) => cmd.category === category);
            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FFD700]" />
                  <h3 className="font-serif text-xs font-bold uppercase tracking-[0.2em] text-[#FFD700]/90">
                    {category}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {commands.map((cmd) => (
                    <div
                      key={cmd.phrase}
                      id={`voice-cmd-${cmd.phrase.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => onSelectCommand && onSelectCommand(cmd.phrase)}
                      className={`group relative flex flex-col justify-between rounded-xl border border-white/10 bg-[#0F1424]/70 p-3.5 transition-all duration-200 hover:border-[#D4AF37]/80 hover:bg-[#182038] hover:shadow-[0_0_20px_rgba(212,175,55,0.15)] ${
                        onSelectCommand ? 'cursor-pointer' : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{cmd.icon}</span>
                            <span className="font-serif text-xs font-bold text-white group-hover:text-[#FFD700] tracking-wide transition-colors">
                              &ldquo;{cmd.phrase}&rdquo;
                            </span>
                          </div>
                          {cmd.badge && (
                            <span className="rounded px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-cyan-300 border border-cyan-500/30 bg-cyan-950/40">
                              {cmd.badge}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {cmd.description}
                        </p>
                      </div>

                      {cmd.aliases && cmd.aliases.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap items-center gap-1">
                          <span className="text-[9px] font-mono text-slate-500">Also:</span>
                          {cmd.aliases.slice(0, 3).map((alias) => (
                            <span
                              key={alias}
                              className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-mono text-slate-300 border border-white/5"
                            >
                              &quot;{alias}&quot;
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#D4AF37]/30 bg-[#0D101C]/90 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span>Press <kbd className="rounded border border-white/20 bg-white/10 px-1 py-0.5 text-[10px] text-slate-200">ESC</kbd> or <kbd className="rounded border border-white/20 bg-white/10 px-1 py-0.5 text-[10px] text-slate-200">?</kbd> to toggle</span>
          </div>
          <button
            id="modal-dismiss-btn"
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#D4AF37]/60 bg-[#171D2F] px-4 py-1.5 text-xs font-serif font-bold uppercase tracking-wider text-[#FFD700] hover:bg-[#252E4A] hover:border-[#FFD700] transition-all"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
