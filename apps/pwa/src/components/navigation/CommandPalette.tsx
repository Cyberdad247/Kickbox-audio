'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useActivityLog } from '../../context/ActivityLogContext';
import { useBifrost } from '../../context/BifrostContext';
import { useMacros } from '../../context/MacroContext';
import { useTenant } from '../../context/TenantContext';
import { playSpatialTone, triggerHaptic } from '../../lib/hapticsAndSpatialAudio';
import { speak } from '../../lib/voice';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (
    tab:
      | 'cinematic'
      | 'avatar'
      | 'dashboard'
      | 'drive'
      | 'filedriver'
      | 'macros'
      | 'offline'
      | 'topology'
      | 'worktree'
      | 'activity'
      | 'settings'
      | 'kernel'
      | 'bifrost',
  ) => void;
}

interface CommandItem {
  id: string;
  category:
    | 'Knights & Clearance'
    | 'Cartridges & Pills'
    | 'Workspace Tabs'
    | 'Actions & Audio'
    | 'System & Offline';
  title: string;
  subtitle: string;
  icon: string;
  badge?: string;
  action: () => void;
}

export function CommandPalette({ isOpen, onClose, onNavigateTab }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    tenants = [],
    activeTenant,
    switchTenant,
    activeCartridge,
    mountCartridge,
    setShowAvatarKnightScreen,
  } = useTenant();

  const { connected, reconnectNow } = useBifrost();
  const { macros = [], executeMacro } = useMacros() || {};
  const { logActivity } = useActivityLog();

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      triggerHaptic('click');
      playSpatialTone(0.5, 660, 150, 'triangle');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global keydown listeners for Cmd+K and arrow navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or shortcut
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Build command list
  const commands: CommandItem[] = [
    // Tabs
    {
      id: 'tab-cinematic',
      category: 'Workspace Tabs',
      title: 'Living Workspace & 6-Stage Flow',
      subtitle: 'Dynamic weather sky, 3D Reliquary, Tactical Table',
      icon: '🏰',
      badge: 'MAIN',
      action: () => {
        onNavigateTab('cinematic');
        onClose();
      },
    },
    {
      id: 'tab-bifrost',
      category: 'Workspace Tabs',
      title: 'Bifröst Quantum Nexus 3D Bridge',
      subtitle: 'WebGL interactive 3D topology & Tailscale mesh burst visualizer',
      icon: '🌉',
      badge: '3D',
      action: () => {
        onNavigateTab('bifrost');
        onClose();
      },
    },
    {
      id: 'tab-kernel',
      category: 'Workspace Tabs',
      title: 'Anya Ω Assimilation Kernel & νKG Crystals',
      subtitle: '13-layer TOON compression, ColMAD debate loop, Merkle ledger',
      icon: '🧠',
      badge: 'v4.0',
      action: () => {
        onNavigateTab('kernel');
        onClose();
      },
    },
    {
      id: 'tab-topology',
      category: 'Workspace Tabs',
      title: 'Topological Multi-Agent Flow Graph',
      subtitle: 'Real-time message passing between Anya, Merlin, Sentinel & Gideon',
      icon: '🕸️',
      badge: 'NEW',
      action: () => {
        onNavigateTab('topology');
        onClose();
      },
    },
    {
      id: 'tab-filedriver',
      category: 'Workspace Tabs',
      title: 'File Driver Explorer & Detailed Inspector',
      subtitle: 'Directory navigation, file details, hex inspector, and audio/video preview',
      icon: '⚡',
      badge: 'NEW',
      action: () => {
        onNavigateTab('filedriver');
        onClose();
      },
    },
    {
      id: 'tab-drive',
      category: 'Workspace Tabs',
      title: 'Google Drive Sovereign Cloud Explorer',
      subtitle: 'Browse files, upload documents, manage notes and view cloud storage',
      icon: '☁️',
      badge: 'INTEGRATED',
      action: () => {
        onNavigateTab('drive');
        onClose();
      },
    },
    {
      id: 'tab-worktree',
      category: 'Workspace Tabs',
      title: 'Local Workspace Directory & OPFS Worktree',
      subtitle: 'Mount local project folder, run WASM linters, export .camelot',
      icon: '📂',
      badge: 'NEW',
      action: () => {
        onNavigateTab('worktree');
        onClose();
      },
    },
    {
      id: 'tab-avatar',
      category: 'Workspace Tabs',
      title: 'Avatar Knight Cockpit Screen',
      subtitle: 'Visor customizer, armory forge, voice profile',
      icon: '🛡️',
      action: () => {
        onNavigateTab('avatar');
        setShowAvatarKnightScreen(true);
        onClose();
      },
    },
    {
      id: 'tab-dashboard',
      category: 'Workspace Tabs',
      title: 'Services & Telemetry Dashboard',
      subtitle: 'Live process monitor, memory budget, VAD meters',
      icon: '⚡',
      action: () => {
        onNavigateTab('dashboard');
        onClose();
      },
    },
    {
      id: 'tab-ooda-loop',
      category: 'Workspace Tabs',
      title: 'OODA-MGV Loop Diagnostics Visualizer',
      subtitle: 'Observe, Orient, Decide, Act, Verify state transparency & Z3 proofs',
      icon: 'Ω',
      action: () => {
        onNavigateTab('dashboard');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('koa:navigate_tab', { detail: 'OODA Loop' }));
        }, 50);
        onClose();
      },
    },
    {
      id: 'tab-macros',
      category: 'Workspace Tabs',
      title: 'Voice Command & Macro Config',
      subtitle: 'Configure speech intents and automated scripts',
      icon: '🎙️',
      action: () => {
        onNavigateTab('macros');
        onClose();
      },
    },
    {
      id: 'tab-offline',
      category: 'Workspace Tabs',
      title: 'Bifröst Bridge & Offline Radar',
      subtitle: 'Reconnect radar, check local cryptographic registers',
      icon: '📡',
      action: () => {
        onNavigateTab('offline');
        logActivity('TAB_NAVIGATED', 'Navigated to Bifröst Offline Radar', {
          category: 'telemetry',
        });
        onClose();
      },
    },
    {
      id: 'tab-activity',
      category: 'Workspace Tabs',
      title: 'Sovereign Activity & Audit Ledger',
      subtitle: 'Real-time timeline of user actions, voice events, and system telemetry',
      icon: '📜',
      badge: 'LIVE',
      action: () => {
        onNavigateTab('activity');
        logActivity('TAB_NAVIGATED', 'Navigated to Activity & Audit Ledger', {
          category: 'security',
        });
        onClose();
      },
    },

    // Knights
    ...(tenants || []).map((t) => ({
      id: `knight-${t.id}`,
      category: 'Knights & Clearance' as const,
      title: `Switch Knight: ${t.handle}`,
      subtitle: `${t.role} · Clearance: ${t.clearance}`,
      icon: t.avatar,
      badge: t.id === activeTenant?.id ? 'ACTIVE' : undefined,
      action: () => {
        switchTenant(t.id);
        speak(`Switched to Knight ${t.handle}`);
        logActivity(
          'KNIGHT_SWITCHED',
          `Switched active tenant profile to ${t.handle} (${t.role})`,
          {
            category: 'knight',
            actor: t.handle,
            severity: 'info',
          },
        );
        triggerHaptic('consent');
        onClose();
      },
    })),

    // Cartridges
    ...(activeTenant?.configuration?.cartridges || []).map((c) => ({
      id: `cartridge-${c.id}`,
      category: 'Cartridges & Pills' as const,
      title: `Mount Cartridge: ${c.title}`,
      subtitle: `${c.category} · ${c.description}`,
      icon: '💾',
      badge: c.id === activeCartridge?.id ? 'MOUNTED' : undefined,
      action: () => {
        mountCartridge(c);
        speak(`Cartridge ${c.title} mounted.`);
        logActivity('CARTRIDGE_MOUNTED', `Mounted cartridge [${c.title}] (${c.code}) into slot`, {
          category: 'cartridge',
          severity: 'success',
          metadata: { code: c.code, allowSwitch: c.allowKnightSwitch },
        });
        triggerHaptic('pill-slot');
        onClose();
      },
    })),

    // Macros
    ...(macros || []).map((m) => ({
      id: `macro-${m.id}`,
      category: 'Actions & Audio' as const,
      title: `Trigger Macro: "${m.phrase}"`,
      subtitle: `${m.name} · ${m.description || 'Voice Routine'}`,
      icon: '⚡',
      action: () => {
        if (executeMacro) {
          executeMacro(m.id, 'shortcut');
        }
        logActivity('MACRO_TRIGGERED', `Executed voice macro "${m.phrase}" (${m.name})`, {
          category: 'macro',
          severity: 'info',
        });
        triggerHaptic('consent');
        onClose();
      },
    })),

    // System
    {
      id: 'action-reconnect',
      category: 'System & Offline',
      title: 'Bifröst Force Reconnect Handshake',
      subtitle: 'Re-trigger direct mTLS WebRTC handshake',
      icon: '🔄',
      action: () => {
        reconnectNow();
        logActivity(
          'BIFROST_RECONNECT_ATTEMPT',
          'Manual mTLS WebRTC reconnection initiated by user',
          {
            category: 'telemetry',
            severity: 'warn',
          },
        );
        triggerHaptic('click');
        onClose();
      },
    },
    {
      id: 'action-speak-status',
      category: 'Actions & Audio',
      title: 'Vocal Status Briefing',
      subtitle: 'Audio synthesis report of active node health',
      icon: '🔊',
      action: () => {
        speak(
          `System status nominal. Knight ${activeTenant.handle} on guard. All microVM partitions verified.`,
        );
        onClose();
      },
    },
  ];

  // Filter commands
  const filtered = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase()),
  );

  const handleKeyDownInMenu = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
      triggerHaptic('click');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      triggerHaptic('click');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-md transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border-2 border-[#00F0FF]/40 bg-[#0A0A16]/95 text-white shadow-[0_0_60px_rgba(0,240,255,0.25)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDownInMenu}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5 bg-gradient-to-r from-[#180F30] via-[#0E1528] to-[#0A0A14]">
          <span className="text-xl text-[#00F0FF] animate-pulse">⚡</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, knight name, tab, or cartridge..."
            className="flex-1 bg-transparent font-mono text-sm text-white placeholder-white/40 focus:outline-none"
          />
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-white/50">
            <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5">ESC</kbd>
            <span>to close</span>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-white/50 font-mono text-xs">
              No matching commands or knights found for "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    item.action();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#00F0FF]/20 to-[#9D4EDD]/20 border border-[#00F0FF]/50 text-white shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                      : 'border border-transparent hover:bg-white/5 text-white/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{item.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-xs font-bold uppercase tracking-wider text-white truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="rounded bg-[#00F0FF]/20 px-1.5 py-0.2 font-mono text-[8px] font-bold text-[#00F0FF]">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="truncate font-mono text-[10px] text-white/50">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 font-mono text-[9px] text-white/30 uppercase tracking-widest pl-2">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="flex items-center justify-between border-t border-white/10 bg-black/60 px-4 py-2 font-mono text-[10px] text-white/50">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded bg-white/10 px-1">↑</kbd>{' '}
              <kbd className="rounded bg-white/10 px-1">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="rounded bg-white/10 px-1">ENTER</kbd> to select
            </span>
          </div>
          <span className="text-[#00F0FF]">Arthurian Command Palette v1.7.1</span>
        </div>
      </div>
    </div>
  );
}
