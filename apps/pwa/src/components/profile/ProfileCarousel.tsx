'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTenant } from '../../context/TenantContext';
import type { TenantProfile } from '../../types/tenant';
import { TenantCard } from './TenantCard';

export interface ProfileCarouselProps {
  /** Optional custom list of tenants (defaults to TenantContext if not provided) */
  tenants?: TenantProfile[];
  /** Optional currently selected tenant ID */
  selectedTenantId?: string;
  /** Callback fired when a tenant card is selected / activated */
  onSelectTenant?: (tenant: TenantProfile) => void;
  /** Callback fired when focus / hover changes to a tenant card */
  onFocusTenant?: (tenant: TenantProfile | null, index: number) => void;
  /** Callback fired when the "+ Add Tenant Slot" card is clicked */
  onAddTenant?: () => void;
  /** Whether to render the "+ Add Tenant" card at the end of the carousel */
  showAddSlot?: boolean;
  /** Whether keyboard navigation (ArrowLeft, ArrowRight, Enter) is active */
  enableKeybinds?: boolean;
  /** Additional container styling */
  className?: string;
}

export function ProfileCarousel({
  tenants: propTenants,
  selectedTenantId: propSelectedId,
  onSelectTenant: propOnSelectTenant,
  onFocusTenant,
  onAddTenant,
  showAddSlot = true,
  enableKeybinds = true,
  className = '',
}: ProfileCarouselProps) {
  // Use TenantContext if available as fallback
  let contextTenants: TenantProfile[] = [];
  let contextActiveTenant: TenantProfile | null = null;
  let contextSelectTenant: ((tenant: TenantProfile) => void) | undefined;

  try {
    const ctx = useTenant();
    contextTenants = ctx.tenants;
    contextActiveTenant = ctx.activeTenant;
    contextSelectTenant = ctx.selectTenant;
  } catch {
    // TenantContext not mounted in hierarchy; safe fallback
  }

  const tenants = propTenants || contextTenants;
  const activeTenantId = propSelectedId || contextActiveTenant?.id || (tenants[0]?.id ?? '');
  const handleSelectTenant = propOnSelectTenant || contextSelectTenant || (() => {});

  // Internal index tracking for smooth PS5 console traversal
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const idx = tenants.findIndex((t) => t.id === activeTenantId);
    return idx !== -1 ? idx : 0;
  });

  const carouselRef = useRef<HTMLDivElement>(null);

  // Sync selected index when external tenant id or array changes
  useEffect(() => {
    const idx = tenants.findIndex((t) => t.id === activeTenantId);
    if (idx !== -1) {
      setSelectedIndex(idx);
    }
  }, [activeTenantId, tenants]);

  // Center selected card in viewport with smooth momentum scroll
  const scrollToCard = useCallback((index: number) => {
    if (carouselRef.current) {
      const container = carouselRef.current;
      const cards = container.children;
      if (cards[index]) {
        const targetCard = cards[index] as HTMLElement;
        const offsetLeft =
          targetCard.offsetLeft - container.offsetWidth / 2 + targetCard.offsetWidth / 2;
        container.scrollTo({
          left: offsetLeft,
          behavior: 'smooth',
        });
      }
    }
  }, []);

  useEffect(() => {
    scrollToCard(selectedIndex);
  }, [selectedIndex, scrollToCard]);

  // Handle PS5 style keyboard & controller navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enableKeybinds || tenants.length === 0) return;

      const totalCards = showAddSlot ? tenants.length + 1 : tenants.length;

      if (e.key === 'ArrowRight' || e.key === 'KeyD') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = (prev + 1) % totalCards;
          if (onFocusTenant) {
            onFocusTenant(next < tenants.length ? tenants[next] : null, next);
          }
          return next;
        });
      } else if (e.key === 'ArrowLeft' || e.key === 'KeyA') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = (prev - 1 + totalCards) % totalCards;
          if (onFocusTenant) {
            onFocusTenant(next < tenants.length ? tenants[next] : null, next);
          }
          return next;
        });
      } else if (e.key === 'Home') {
        e.preventDefault();
        setSelectedIndex(0);
        if (onFocusTenant && tenants[0]) onFocusTenant(tenants[0], 0);
      } else if (e.key === 'End') {
        e.preventDefault();
        const lastIdx = totalCards - 1;
        setSelectedIndex(lastIdx);
        if (onFocusTenant) {
          onFocusTenant(lastIdx < tenants.length ? tenants[lastIdx] : null, lastIdx);
        }
      } else if (e.key === 'Enter' || e.key === 'Space') {
        e.preventDefault();
        if (selectedIndex < tenants.length) {
          handleSelectTenant(tenants[selectedIndex]);
        } else if (showAddSlot && onAddTenant) {
          onAddTenant();
        }
      }
    },
    [
      enableKeybinds,
      tenants,
      showAddSlot,
      selectedIndex,
      handleSelectTenant,
      onAddTenant,
      onFocusTenant,
    ],
  );

  useEffect(() => {
    if (!enableKeybinds) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeybinds, handleKeyDown]);

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      {/* Ambient background glow behind carousel active zone */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-96 rounded-full bg-[#FFD700]/10 blur-[90px]" />

      {/* Horizontal Scrollable Carousel Track with Snap Physics */}
      <div
        ref={carouselRef}
        className="flex w-full items-center gap-6 overflow-x-auto px-10 py-8 no-scrollbar scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {tenants.map((tenant, index) => {
          const isSelected = selectedIndex === index;
          const isCurrentActive = contextActiveTenant
            ? tenant.id === contextActiveTenant.id
            : false;

          return (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              isSelected={isSelected}
              isCurrentActive={isCurrentActive}
              onSelect={(t) => {
                setSelectedIndex(index);
                if (onFocusTenant) onFocusTenant(t, index);
                handleSelectTenant(t);
              }}
              onFocus={() => {
                setSelectedIndex(index);
                if (onFocusTenant) onFocusTenant(tenant, index);
              }}
            />
          );
        })}

        {/* ── Optional PS5-Style "+ Add New Knight Slot" ── */}
        {showAddSlot && (
          <div
            onClick={() => {
              setSelectedIndex(tenants.length);
              if (onFocusTenant) onFocusTenant(null, tenants.length);
              if (onAddTenant) onAddTenant();
            }}
            onMouseEnter={() => {
              setSelectedIndex(tenants.length);
              if (onFocusTenant) onFocusTenant(null, tenants.length);
            }}
            className={`group relative flex-shrink-0 cursor-pointer rounded-2xl p-6 transition-all duration-300 transform select-none ${
              selectedIndex === tenants.length
                ? 'w-80 sm:w-96 scale-105 border-2 border-dashed border-[#FFD700] bg-[#120D22]/90 shadow-[0_0_30px_rgba(255,215,0,0.3)] z-20'
                : 'w-64 sm:w-72 scale-90 sm:scale-95 border border-dashed border-white/20 bg-[#120D22]/40 opacity-70 hover:border-[#7B2CBF] hover:opacity-100 hover:scale-95 sm:hover:scale-100 z-10'
            }`}
            style={{ scrollSnapAlign: 'center' }}
          >
            <div className="flex flex-col items-center justify-center py-8 text-center">
              {/* Glowing + Sigil Button */}
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[#00E5FF]/60 bg-[#0D0B14] text-3xl font-light text-[#00E5FF] shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-transform group-hover:scale-110">
                +
              </div>

              <h3 className="mt-5 font-display text-sm font-bold uppercase tracking-[0.2em] text-[#00E5FF]">
                Authorize Referral User
              </h3>

              <p className="mt-2 text-xs text-white/50">
                Provision a verified human referral controller slot with cryptographic invite
                credentials.
              </p>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAddTenant) onAddTenant();
                }}
                className="mt-6 rounded-lg border border-[#00E5FF]/40 bg-[#00E5FF]/10 px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-[#00E5FF] transition-colors hover:border-[#00E5FF] hover:bg-[#00E5FF]/20"
              >
                + Invite Referral User
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
