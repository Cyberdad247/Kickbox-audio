'use client';

import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useCamelotStore } from '../../stores/camelotStore';

export interface NavItem {
  id: string;
  label: string;
  sublabel: string;
  rune: string;
  accentColor: string;
  glowColor: string;
}

export interface ExcaliburNavProps {
  activeView?: string;
  onViewChange?: (viewId: string) => void;
  className?: string;
  isExpandedDefault?: boolean;
  highContrast?: boolean;
}

export const EXCALIBUR_NAV_ITEMS: NavItem[] = [
  {
    id: 'roundtable',
    label: 'Home',
    sublabel: 'Round Table Sanctuary',
    rune: '🛡️',
    accentColor: '#00F0FF',
    glowColor: 'rgba(0, 240, 255, 0.3)',
  },
  {
    id: 'worldtree',
    label: 'World Tree',
    sublabel: 'Topological Lattice',
    rune: '🌳',
    accentColor: '#FFD700',
    glowColor: 'rgba(255, 215, 0, 0.3)',
  },
  {
    id: 'avatars',
    label: 'Avatar Select',
    sublabel: 'Scroll of Arms',
    rune: '👑',
    accentColor: '#FF00FF',
    glowColor: 'rgba(255, 0, 255, 0.3)',
  },
  {
    id: 'config',
    label: 'Capsule Config',
    sublabel: 'Bridge & Cryptographic Leases',
    rune: '⚙️',
    accentColor: '#00F0FF',
    glowColor: 'rgba(0, 240, 255, 0.3)',
  },
];

export function ExcaliburNav({
  activeView: propActiveView,
  onViewChange,
  className = '',
  isExpandedDefault = false,
  highContrast: propHighContrast,
}: ExcaliburNavProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(isExpandedDefault);

  // Connect to Zustand store
  const storeActiveView = useCamelotStore((s) => s.activeView);
  const storeSetActiveView = useCamelotStore((s) => s.setActiveView);
  const storeHighContrast = useCamelotStore((s) => s.highContrast);
  const avatarSession = useCamelotStore((s) => s.avatarSession);

  // Connect to Tenant context
  const { activeTenant } = useTenant();

  const activeView = propActiveView ?? storeActiveView;
  const highContrast = propHighContrast ?? storeHighContrast;

  const handleSelect = (item: NavItem) => {
    storeSetActiveView(item.id as any);
    onViewChange?.(item.id);
  };

  return (
    <nav
      id="excalibur-nav-sidebar"
      className={`relative z-20 flex shrink-0 flex-col justify-between border transition-all duration-300 select-none backdrop-blur-[20px] ${
        isExpanded ? 'w-56' : 'w-20'
      } ${className}`}
      style={{
        borderColor: highContrast ? '#FFFFFF' : '#00F0FF',
        borderWidth: '1px',
        backgroundColor: highContrast ? '#050505' : 'rgba(10, 10, 10, 0.85)',
        boxShadow: highContrast
          ? 'none'
          : '0 0 20px rgba(0, 240, 255, 0.15), inset 0 0 12px rgba(0, 240, 255, 0.05)',
      }}
      aria-label="Excalibur Navigation Rail"
    >
      {/* Top Header / Branding & Expand Button */}
      <div>
        <div
          className={`flex items-center border-b p-3 transition-colors ${
            isExpanded ? 'justify-between' : 'justify-center'
          }`}
          style={{
            borderColor: highContrast ? '#FFFFFF' : 'rgba(0, 240, 255, 0.2)',
          }}
        >
          {isExpanded && (
            <div className="flex items-center space-x-2 overflow-hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#00F0FF]/40 bg-[#00F0FF]/10 text-xs font-bold text-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.3)]">
                🗡️
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#00F0FF]">
                  EXCALIBUR
                </span>
                <span className="font-mono text-[8px] uppercase tracking-wider text-white/50">
                  Zone 0 Core
                </span>
              </div>
            </div>
          )}

          <button
            id="excalibur-nav-toggle-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs text-white/70 transition-all hover:border-[#00F0FF]/50 hover:bg-[#00F0FF]/10 hover:text-[#00F0FF]"
            title={isExpanded ? 'Collapse Navigation Rail' : 'Expand Navigation Rail'}
            aria-label={isExpanded ? 'Collapse Navigation' : 'Expand Navigation'}
          >
            {isExpanded ? '◀' : '▶'}
          </button>
        </div>

        {/* Navigation Item Links */}
        <div className="flex flex-col space-y-2 p-2">
          {EXCALIBUR_NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                id={`excalibur-nav-item-${item.id}`}
                onClick={() => handleSelect(item)}
                className={`group relative flex w-full items-center rounded-xl border p-2.5 transition-all ${
                  isActive
                    ? 'border-[#00F0FF] bg-[#00F0FF]/15 text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                    : 'border-white/5 bg-white/5 text-white/60 hover:border-[#00F0FF]/30 hover:bg-[#00F0FF]/5 hover:text-white'
                }`}
                style={{
                  borderColor: isActive ? item.accentColor : undefined,
                  backgroundColor: isActive ? `${item.accentColor}1A` : undefined,
                  boxShadow: isActive ? `0 0 15px ${item.glowColor}` : undefined,
                }}
                title={`${item.label} — ${item.sublabel}`}
              >
                {/* Active Indicator Bar on Left Edge */}
                {isActive && (
                  <span
                    className="absolute left-0 top-2 bottom-2 w-1 rounded-r"
                    style={{ backgroundColor: item.accentColor }}
                  />
                )}

                {/* Rune Icon */}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center text-lg transition-transform group-hover:scale-110">
                  {item.rune}
                </span>

                {/* Expanded Text Descriptions */}
                {isExpanded && (
                  <div className="ml-3 text-left overflow-hidden">
                    <div
                      className="font-mono text-xs font-semibold uppercase tracking-wider truncate"
                      style={{ color: isActive ? item.accentColor : undefined }}
                    >
                      {item.label}
                    </div>
                    <div className="truncate font-mono text-[9px] text-white/40">
                      {item.sublabel}
                    </div>
                  </div>
                )}

                {/* Collapsed Tooltip on Hover */}
                {!isExpanded && (
                  <div className="pointer-events-none absolute left-full ml-3 z-50 hidden whitespace-nowrap rounded-lg border border-[#00F0FF]/30 bg-black/90 px-2.5 py-1 text-left font-mono text-xs text-white shadow-xl backdrop-blur-md group-hover:block">
                    <div className="font-bold text-[#00F0FF]">{item.label}</div>
                    <div className="text-[9px] text-white/50">{item.sublabel}</div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Status Panel & Cyber-Knight Identity Badge */}
      <div
        className="flex flex-col space-y-2 border-t p-2"
        style={{
          borderColor: highContrast ? '#FFFFFF' : 'rgba(0, 240, 255, 0.15)',
        }}
      >
        {/* Active Knight Status Badge */}
        <div
          id="excalibur-nav-knight-badge"
          className={`flex items-center rounded-xl border border-[#FFD700]/30 bg-[#FFD700]/5 p-2 transition-all hover:border-[#FFD700]/60 ${
            isExpanded ? 'justify-start space-x-2.5' : 'justify-center'
          }`}
          title={`Active Cyber-Knight: ${avatarSession.avatarType}`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#FFD700]/40 bg-[#FFD700]/10 text-sm">
            ⚡
          </div>
          {isExpanded && (
            <div className="flex flex-col overflow-hidden text-left">
              <span className="truncate font-mono text-[10px] font-bold uppercase tracking-wider text-[#FFD700]">
                {avatarSession.tenantHandle || activeTenant?.name || 'Vizion711'}
              </span>
              <span className="font-mono text-[8px] uppercase tracking-widest text-white/50">
                {avatarSession.avatarType.replace('Knight_', '')} Sovereign
              </span>
            </div>
          )}
        </div>

        {/* System Lattice Ping Indicator */}
        <div
          className={`flex items-center font-mono text-[9px] text-white/40 ${
            isExpanded ? 'justify-between px-1' : 'justify-center'
          }`}
        >
          {isExpanded && <span>LATTICE</span>}
          <div className="flex items-center space-x-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400">ONLINE</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default ExcaliburNav;
