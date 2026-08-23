'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTenant } from '../../context/TenantContext';
import type { TenantCartridge } from '../../types/tenant';

export interface TenantCartridgeCarouselProps {
  /** Optional custom cartridges (defaults to active tenant's cartridges) */
  cartridges?: TenantCartridge[];
  /** Callback fired when a cartridge is mounted */
  onMountCartridge?: (cartridgeId: string) => void;
  /** Whether to enable keyboard navigation */
  enableKeybinds?: boolean;
  className?: string;
}

const CATEGORIES = ['ALL', 'SYSTEM', 'AI_ENGINE', 'SECURITY', 'AVATAR_WEAVER'] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

export function TenantCartridgeCarousel({
  cartridges: propCartridges,
  onMountCartridge,
  enableKeybinds = true,
  className = '',
}: TenantCartridgeCarouselProps) {
  const { activeTenant, activeCartridge, mountCartridge: contextMountCartridge } = useTenant();

  const handleMount = onMountCartridge || contextMountCartridge;
  const rawCartridges = propCartridges || activeTenant.configuration?.cartridges || [];

  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter cartridges based on category and search query
  const filteredCartridges = rawCartridges.filter((c) => {
    const matchesCategory = selectedCategory === 'ALL' || c.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Sync selected index with active cartridge on initial mount or list change
  useEffect(() => {
    if (activeCartridge) {
      const idx = filteredCartridges.findIndex((c) => c.id === activeCartridge.id);
      if (idx !== -1) {
        setSelectedIndex(idx);
      }
    }
  }, [activeCartridge, filteredCartridges]);

  // Center selected card in scroll view
  const scrollToCard = useCallback((index: number) => {
    if (trackRef.current) {
      const container = trackRef.current;
      const cards = container.children;
      if (cards[index]) {
        const target = cards[index] as HTMLElement;
        const offset = target.offsetLeft - container.offsetWidth / 2 + target.offsetWidth / 2;
        container.scrollTo({ left: offset, behavior: 'smooth' });
      }
    }
  }, []);

  useEffect(() => {
    scrollToCard(selectedIndex);
  }, [selectedIndex, scrollToCard]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enableKeybinds || filteredCartridges.length === 0) return;
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return;

      if (e.key === 'ArrowRight' || e.key === 'KeyD') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCartridges.length);
      } else if (e.key === 'ArrowLeft' || e.key === 'KeyA') {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + filteredCartridges.length) % filteredCartridges.length,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = filteredCartridges[selectedIndex];
        if (target) {
          handleMount(target.id);
        }
      }
    },
    [enableKeybinds, filteredCartridges, selectedIndex, handleMount],
  );

  useEffect(() => {
    if (!enableKeybinds) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeybinds, handleKeyDown]);

  return (
    <div className={`relative flex flex-col w-full overflow-hidden ${className}`}>
      {/* Category Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
          {CATEGORIES.map((cat) => {
            const isCatActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setSelectedIndex(0);
                }}
                className={`rounded-lg px-2.5 py-1 uppercase tracking-wider transition-all ${
                  isCatActive
                    ? 'border border-[#FFD700] bg-[#FFD700]/20 text-[#FFD700] font-bold shadow-[0_0_12px_rgba(255,215,0,0.3)]'
                    : 'border border-white/10 bg-white/5 text-white/50 hover:border-white/25 hover:text-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search tenant cartridges..."
              className="h-7 w-48 rounded-lg border border-white/10 bg-[#0D0B14] px-2.5 text-xs text-white placeholder-white/30 focus:border-[#00E5FF] focus:outline-none focus:ring-1 focus:ring-[#00E5FF]/40 font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
          <span className="font-mono text-[10px] text-white/40">
            {filteredCartridges.length} / {rawCartridges.length}
          </span>
        </div>
      </div>

      {/* Empty State */}
      {filteredCartridges.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-white/40">
          <span className="text-3xl mb-2">🎛️</span>
          <p className="font-mono text-xs uppercase tracking-wider">No cartridges matching query</p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('ALL');
              setSearchQuery('');
            }}
            className="mt-3 rounded border border-white/20 px-3 py-1 text-xs text-[#00E5FF] hover:border-[#00E5FF]"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Horizontal Carousel Track */
        <div
          ref={trackRef}
          className="flex w-full items-center gap-5 overflow-x-auto px-6 py-6 no-scrollbar scroll-smooth"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {filteredCartridges.map((cartridge, index) => {
            const isSelected = selectedIndex === index;
            const isMounted = cartridge.id === activeCartridge?.id;

            return (
              <div
                key={cartridge.id}
                onClick={() => {
                  setSelectedIndex(index);
                  if (isSelected && !isMounted) {
                    handleMount(cartridge.id);
                  }
                }}
                className={`group relative flex-shrink-0 cursor-pointer rounded-2xl p-5 transition-all duration-300 transform select-none ${
                  isSelected
                    ? 'w-72 sm:w-80 scale-105 border-2 border-[#FFD700] bg-gradient-to-b from-[#1E1235] via-[#120D22] to-[#0D0B14] shadow-[0_0_35px_rgba(255,215,0,0.35)] z-20'
                    : 'w-60 sm:w-64 scale-95 border border-[#7B2CBF]/30 bg-[#120D22]/80 opacity-75 hover:opacity-100 hover:scale-100 hover:border-[#7B2CBF] z-10'
                }`}
                style={{ scrollSnapAlign: 'center' }}
              >
                {/* Active Indicator Halo */}
                {isSelected && (
                  <div className="absolute -inset-1 -z-10 rounded-2xl bg-gradient-to-r from-[#FFD700]/20 via-[#7B2CBF]/30 to-[#00E5FF]/20 blur-md animate-pulse" />
                )}

                {/* Top Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`relative flex h-10 w-10 items-center justify-center rounded-xl border text-xl ${
                        isSelected
                          ? 'border-[#FFD700] bg-[#0D0B14] shadow-[0_0_12px_rgba(255,215,0,0.5)]'
                          : 'border-white/20 bg-black/40'
                      }`}
                    >
                      <span>{cartridge.icon}</span>
                      {isMounted && (
                        <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                      )}
                    </div>
                    <div>
                      <h4
                        className={`font-display text-xs font-bold uppercase tracking-wider ${
                          isSelected ? 'text-white' : 'text-white/80 group-hover:text-white'
                        }`}
                      >
                        {cartridge.title}
                      </h4>
                      <span className="font-mono text-[9px] uppercase text-[#00E5FF]">
                        {cartridge.code} · v{cartridge.version}
                      </span>
                    </div>
                  </div>

                  {isMounted && (
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-400/50 px-2 py-0.5 font-mono text-[8px] font-bold text-emerald-300 uppercase">
                      ACTIVE
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="mt-3 line-clamp-2 text-xs text-white/60 group-hover:text-white/80">
                  {cartridge.description}
                </p>

                {/* Metadata Matrix */}
                <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-2.5 font-mono text-[10px] space-y-1">
                  <div className="flex items-center justify-between text-white/50">
                    <span>RUNTIME:</span>
                    <span className="text-white">{cartridge.runtimeTier}</span>
                  </div>
                  <div className="flex items-center justify-between text-white/50">
                    <span>CATEGORY:</span>
                    <span className="text-[#00E5FF]">{cartridge.category}</span>
                  </div>
                  <div className="flex items-center justify-between text-white/50">
                    <span>KNIGHT SWITCH:</span>
                    <span
                      className={
                        cartridge.allowKnightSwitch ? 'text-emerald-400 font-bold' : 'text-rose-400'
                      }
                    >
                      {cartridge.allowKnightSwitch ? 'ALLOWED ✓' : 'LOCKED ✗'}
                    </span>
                  </div>
                </div>

                {/* Mount Action Button */}
                <div className="mt-4 pt-3 border-t border-white/10">
                  {isMounted ? (
                    <div className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-400/15 py-1.5 font-mono text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
                      <span>✓</span>
                      <span>CURRENTLY MOUNTED</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMount(cartridge.id);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-[#FFD700]/50 bg-[#FFD700]/15 py-1.5 font-mono text-[10px] font-bold text-[#FFD700] hover:bg-[#FFD700]/25 transition-all shadow-[0_0_10px_rgba(255,215,0,0.2)]"
                    >
                      <span>🎛️</span>
                      <span>Mount Cartridge</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Keyboard Controls Footer */}
      <div className="flex items-center justify-between border-t border-white/10 pt-3 font-mono text-[10px] text-white/40">
        <div className="flex items-center gap-3">
          <span>
            NAVIGATION: <strong className="text-white/70">← / → (A / D)</strong>
          </span>
          <span>·</span>
          <span>
            MOUNT: <strong className="text-white/70">ENTER / CLICK</strong>
          </span>
        </div>
        <div>
          TENANT: <span className="text-[#00E5FF]">{activeTenant.handle}</span>
        </div>
      </div>
    </div>
  );
}
