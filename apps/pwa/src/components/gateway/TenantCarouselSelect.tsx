'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTenant } from '../../context/TenantContext';
import { speak } from '../../lib/voice';

export interface TenantCarouselSelectProps {
  onSelectTenantComplete?: () => void;
  onOpenArmoryCustomizer?: () => void;
}

// 12 Ornate Heraldic Crests matching the Arthurian Round Table
interface HeraldicCrest {
  id: string;
  name: string;
  subtitle: string;
  role: string;
  clearance: string;
  heraldryColor: string;
  svgPath: (color: string) => React.ReactNode;
}

const HERALDIC_CRESTS: HeraldicCrest[] = [
  {
    id: 'phoenix-one',
    name: 'VASHAWN ARCH-ARCHITECT',
    subtitle: 'SOVEREIGN ROOT ENCLAVE',
    role: 'VaShawn Arch-Architect · Ring 0 Root',
    clearance: 'SOVEREIGN_ARCH_ARCHITECT',
    heraldryColor: '#FFD700',
    svgPath: (color) => (
      <g stroke={color} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* Crown / Solar halo */}
        <path d="M42 22 L46 26 L50 20 L54 26 L58 22 L56 29 L44 29 Z" fill={color} fillOpacity="0.3" />
        <circle cx="50" cy="16" r="2.5" fill={color} />
        {/* Number 1 in center */}
        <path d="M48 38 L51 35 L51 55 M47 55 L55 55" strokeWidth="2.4" stroke={color} />
        {/* Wings spread */}
        <path d="M44 36 C34 32 22 36 18 46 C24 45 32 48 42 54" />
        <path d="M56 36 C66 32 78 36 82 46 C76 45 68 48 58 54" />
        <path d="M43 42 C32 40 24 46 20 56 C28 54 35 56 44 61" />
        <path d="M57 42 C68 40 76 46 80 56 C72 54 65 56 56 61" />
        {/* Serpent / Runic branch base */}
        <path d="M30 68 C38 62 62 62 70 68 C64 73 36 73 30 68 Z" fill={color} fillOpacity="0.2" />
        <circle cx="38" cy="68" r="1.5" fill={color} />
        <circle cx="50" cy="68" r="1.5" fill={color} />
        <circle cx="62" cy="68" r="1.5" fill={color} />
        <path d="M36 72 C40 77 46 79 50 79 C54 79 60 77 64 72" />
      </g>
    ),
  },
  {
    id: 'crowned-eagle',
    name: 'IMPERIAL AVALON EAGLE',
    subtitle: 'SOVEREIGN HIGH GUARD',
    role: 'Imperial Node · High Vanguard',
    clearance: 'HUMAN_REFERRAL_CONTROLLER',
    heraldryColor: '#FFD700',
    svgPath: (color) => (
      <g stroke={color} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M46 20 L50 16 L54 20 L50 24 Z" fill={color} fillOpacity="0.4" />
        <path d="M47 24 C45 28 45 32 50 34 C55 32 55 28 53 24" />
        <path d="M45 34 C30 28 18 34 16 48 C24 47 34 50 44 56" />
        <path d="M55 34 C70 28 82 34 84 48 C76 47 66 50 56 56" />
        <path d="M46 45 C34 44 26 50 22 62 C30 60 38 62 46 66" />
        <path d="M54 45 C66 44 74 50 78 62 C70 60 62 62 54 66" />
        <path d="M44 60 C44 72 50 76 50 76 C50 76 56 72 56 60 Z" fill={color} fillOpacity="0.25" />
        <path d="M40 74 L36 80 M60 74 L64 80" />
      </g>
    ),
  },
  {
    id: 'knight-blade',
    name: 'EXCALIBUR WARDEN',
    subtitle: 'HIT-GATE HITL ENCLAVE',
    role: 'Hit-Gate Sentinel · Security Guard',
    clearance: 'SOVEREIGN_ARCH_ARCHITECT',
    heraldryColor: '#00F0FF',
    svgPath: (color) => (
      <g stroke={color} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* Sword blade & hilt */}
        <path d="M50 16 L50 68 M42 28 L58 28 M46 16 L54 16 M48 72 L52 72" strokeWidth="2" />
        {/* Shield outline behind sword */}
        <path d="M30 26 C42 22 58 22 70 26 C70 52 50 72 50 72 C50 72 30 52 30 26 Z" strokeWidth="1.4" fill={color} fillOpacity="0.15" />
        {/* Knight helmet visor */}
        <circle cx="50" cy="40" r="8" />
        <path d="M45 40 L55 40 M46 43 L54 43" />
      </g>
    ),
  },
  {
    id: 'wyvern-dragon',
    name: 'DRAKE OF CAMELOT',
    subtitle: 'GPU KINETIC SYNTHESIZER',
    role: 'Kinetic Engine · WASM Shaper',
    clearance: 'HUMAN_REFERRAL_CONTROLLER',
    heraldryColor: '#FFD700',
    svgPath: (color) => (
      <g stroke={color} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M52 20 C42 18 36 24 38 32 C40 38 48 38 46 44 C44 50 36 52 38 60 C40 68 52 74 60 72 C66 70 66 62 60 58 C56 55 58 48 62 44 C66 38 62 24 52 20 Z" />
        <path d="M48 36 C34 30 20 32 18 42 C26 44 34 46 42 50" />
        <path d="M58 36 C72 30 86 32 88 42 C80 44 72 46 64 50" />
        <circle cx="44" cy="26" r="1.5" fill={color} />
      </g>
    ),
  },
  {
    id: 'lion-rampant',
    name: 'ROYAL LION RAMPANT',
    subtitle: 'ENTERPRISE TENANT PARTITION',
    role: 'Enterprise Governor · Multi-Tenant',
    clearance: 'SOVEREIGN_ARCH_ARCHITECT',
    heraldryColor: '#FFD700',
    svgPath: (color) => (
      <g stroke={color} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* Crown */}
        <path d="M46 18 L48 22 L52 18 L56 22 L58 18 L57 24 L47 24 Z" fill={color} fillOpacity="0.4" />
        {/* Lion head & mane */}
        <path d="M48 24 C42 26 40 32 44 36 C42 40 44 46 48 48 C46 54 48 64 54 70 C58 74 66 74 68 68 C64 66 60 62 62 56 C64 50 60 44 58 38 C60 32 56 26 48 24 Z" />
        {/* Front paws */}
        <path d="M44 34 L32 30 M44 38 L30 38 M46 46 L34 50" strokeWidth="2" />
        {/* Tail curled */}
        <path d="M66 68 C74 66 78 56 74 48 C70 42 66 46 68 50" />
      </g>
    ),
  },
  {
    id: 'celestial-star',
    name: 'NORTH STAR SEED',
    subtitle: 'AUTONOMOUS AGENT LATTICE',
    role: 'Lattice Dispatcher · Zero-Trust',
    clearance: 'HUMAN_REFERRAL_CONTROLLER',
    heraldryColor: '#00F0FF',
    svgPath: (color) => (
      <g stroke={color} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 14 L50 86 M14 50 L86 50" strokeWidth="2" />
        <path d="M26 26 L74 74 M26 74 L74 26" strokeWidth="1.2" strokeDasharray="3 2" />
        <circle cx="50" cy="50" r="16" strokeWidth="1.8" />
        <circle cx="50" cy="50" r="6" fill={color} />
        <circle cx="50" cy="50" r="28" strokeWidth="1" strokeOpacity="0.4" />
      </g>
    ),
  },
  {
    id: 'arch-crown',
    name: 'CROWN OF CAMELOT',
    subtitle: 'GENESIS TENANT PARTITION',
    role: 'Root Arch-Authority · Genesis Seal',
    clearance: 'SOVEREIGN_ARCH_ARCHITECT',
    heraldryColor: '#FFD700',
    svgPath: (color) => (
      <g stroke={color} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M30 36 L38 24 L50 36 L62 24 L70 36 L66 60 L34 60 Z" fill={color} fillOpacity="0.25" strokeWidth="2" />
        <circle cx="38" cy="22" r="2.5" fill={color} />
        <circle cx="50" cy="20" r="3" fill={color} />
        <circle cx="62" cy="22" r="2.5" fill={color} />
        <path d="M34 60 C42 66 58 66 66 60 C58 72 42 72 34 60 Z" fill={color} fillOpacity="0.4" />
        <circle cx="44" cy="48" r="2" fill={color} />
        <circle cx="50" cy="48" r="2.5" fill={color} />
        <circle cx="56" cy="48" r="2" fill={color} />
      </g>
    ),
  },
  {
    id: 'twin-swords',
    name: 'DUAL RUNIC BLADES',
    subtitle: 'DEEP MEMORY ENCLAVE',
    role: 'Memory Vault · Cross-Platform Sync',
    clearance: 'HUMAN_REFERRAL_CONTROLLER',
    heraldryColor: '#00F0FF',
    svgPath: (color) => (
      <g stroke={color} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 20 L68 76 M68 20 L32 76" strokeWidth="2" />
        <path d="M26 26 L38 26 M62 26 L74 26" strokeWidth="2" />
        <circle cx="50" cy="48" r="14" fill={color} fillOpacity="0.15" strokeWidth="1.5" />
        <path d="M44 48 L56 48 M50 42 L50 54" strokeWidth="1.8" />
      </g>
    ),
  },
  {
    id: 'gryphon-sigil',
    name: 'AVALON GRYPHON',
    subtitle: 'BIFROST WEBRTC BRIDGE',
    role: 'Audio Bridge · Live Telemetry',
    clearance: 'SOVEREIGN_ARCH_ARCHITECT',
    heraldryColor: '#FFD700',
    svgPath: (color) => (
      <g stroke={color} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M48 22 C42 22 36 28 38 36 C42 34 46 36 48 40 C46 48 52 56 60 60 C66 64 74 62 76 56 C74 50 68 46 64 42 C62 34 56 24 48 22 Z" />
        <path d="M38 34 L26 30 M42 42 L24 44" strokeWidth="2" />
        <path d="M52 32 C64 24 78 28 82 38 C74 38 66 40 58 46" />
        <circle cx="44" cy="28" r="1.5" fill={color} />
      </g>
    ),
  },
  {
    id: 'templar-cross',
    name: 'SOLAR TEMPLAR CROSS',
    subtitle: 'HARDWARE KEY SECURITY',
    role: 'Biometric Passkey · YubiKey Enclave',
    clearance: 'HUMAN_REFERRAL_CONTROLLER',
    heraldryColor: '#FFD700',
    svgPath: (color) => (
      <g stroke={color} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M44 16 L56 16 L52 38 L74 34 L74 46 L52 50 L56 72 L44 72 L48 50 L26 46 L26 34 L48 38 Z" fill={color} fillOpacity="0.25" strokeWidth="1.8" />
        <circle cx="50" cy="44" r="8" fill={color} fillOpacity="0.3" />
        <circle cx="50" cy="44" r="2" fill={color} />
      </g>
    ),
  },
  {
    id: 'pegasus-wings',
    name: 'ASCENDING PEGASUS',
    subtitle: 'EDGE RUNTIME EXPEDITION',
    role: 'Cloudflare Worker · Edge MicroVM',
    clearance: 'SOVEREIGN_ARCH_ARCHITECT',
    heraldryColor: '#00F0FF',
    svgPath: (color) => (
      <g stroke={color} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M46 30 C40 26 34 32 36 40 C38 46 44 48 46 54 C48 62 56 68 64 66 C70 64 72 58 68 52 C66 46 62 42 58 38 C56 32 52 26 46 30 Z" />
        <path d="M46 38 C34 26 18 28 14 38 C22 39 32 42 42 48" />
        <path d="M48 42 C38 34 26 36 20 48 C28 47 36 50 44 56" />
        <circle cx="42" cy="34" r="1.5" fill={color} />
      </g>
    ),
  },
  {
    id: 'falcon-allseeing',
    name: 'ALL-SEEING FALCON',
    subtitle: 'PROVENANCE & AUDIT GATE',
    role: 'Audit Log · Ledger Provenance',
    clearance: 'HUMAN_REFERRAL_CONTROLLER',
    heraldryColor: '#FFD700',
    svgPath: (color) => (
      <g stroke={color} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M46 22 C42 26 42 32 46 36 C42 44 46 56 50 64 C54 68 60 68 62 62 C60 56 56 50 54 44 C56 36 54 26 46 22 Z" />
        <path d="M44 32 C30 26 16 30 14 42 C22 42 32 46 40 52" />
        <path d="M52 32 C66 26 80 30 82 42 C74 42 64 46 56 52" />
        <circle cx="47" cy="28" r="1.5" fill={color} />
      </g>
    ),
  },
];

export function TenantCarouselSelect({
  onSelectTenantComplete,
  onOpenArmoryCustomizer,
}: TenantCarouselSelectProps) {
  const { tenants, activeTenant, selectTenant } = useTenant();
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [isWarping, setIsWarping] = useState<boolean>(false);
  const [isAutoSpin, setIsAutoSpin] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalShields = HERALDIC_CRESTS.length;
  const angleStep = 360 / totalShields;

  const currentCrest = HERALDIC_CRESTS[selectedIndex] || HERALDIC_CRESTS[0];
  const matchingTenant = tenants[selectedIndex % tenants.length] || activeTenant;

  // Sync index to rotation
  const selectShield = useCallback(
    (index: number) => {
      const normalizedIndex = (index + totalShields) % totalShields;
      setSelectedIndex(normalizedIndex);
      const targetAngle = -normalizedIndex * angleStep;
      setRotationAngle(targetAngle);
    },
    [angleStep, totalShields]
  );

  const rotateNext = useCallback(() => {
    selectShield(selectedIndex + 1);
  }, [selectShield, selectedIndex]);

  const rotatePrev = useCallback(() => {
    selectShield(selectedIndex - 1);
  }, [selectShield, selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        rotateNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        rotatePrev();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rotateNext, rotatePrev]);

  // Mouse & Touch Dragging Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartX;
    if (Math.abs(deltaX) > 40) {
      if (deltaX > 0) {
        rotatePrev();
      } else {
        rotateNext();
      }
      setDragStartX(e.clientX);
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleConfirm = () => {
    setIsWarping(true);
    speak(`Sovereign partition ${currentCrest.name} authorized. Entering Round Table.`);
    setTimeout(() => {
      if (matchingTenant) {
        selectTenant(matchingTenant);
      }
      if (onSelectTenantComplete) {
        onSelectTenantComplete();
      }
    }, 1200);
  };

  const TENANT_CAROUSEL_UI_IMAGE = 'https://i.postimg.cc/pr4kqMNj/a-2-Stage-Tenant-Car.png';

  return (
    <div
      id="stage-tenant-carousel-screen"
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`relative flex h-screen w-full flex-col items-center justify-between overflow-hidden bg-[#020205] text-white select-none transition-all duration-700 ${
        isWarping ? 'scale-105 opacity-90 blur-[2px]' : 'scale-100 opacity-100'
      }`}
    >
      {/* ── HIGH FIDELITY MASTER UI BACKDROP LAYER ── */}
      <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden pointer-events-none">
        <img
          src={TENANT_CAROUSEL_UI_IMAGE}
          alt="Camelot Stage 2 Tenant Carousel UI"
          className="h-full w-full object-cover object-center scale-[1.01] transition-transform duration-1000 ease-out"
        />
        {/* Subtle dynamic ambient glow overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020205]/60 via-transparent to-[#020205]/40" />
      </div>

      {/* ── CENTRAL VOLUMETRIC LIGHT BEAM & PLASMA FLICKER ── */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[75vh] w-[200px] bg-gradient-to-b from-[#00F0FF]/25 via-[#9D4EDD]/15 to-transparent blur-3xl mix-blend-screen animate-pulse" />
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[65vh] w-[35px] bg-gradient-to-b from-white/40 via-[#00F0FF]/20 to-transparent blur-md mix-blend-screen" />

      {/* ═══════════════════════════════════════════════════════════
          HUD CORNER 1: TOP-LEFT TELEMETRY (OS COASS_ACCEL)
      ═══════════════════════════════════════════════════════════ */}
      <header className="pointer-events-none absolute top-4 left-6 z-30 flex items-start gap-4">
        {/* Cyan Star Crosshair glyph */}
        <div className="mt-8 flex h-7 w-7 items-center justify-center text-[#00F0FF] animate-pulse">
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.5">
            <path d="M12 2 L12 22 M2 12 L22 12 M6 6 L18 18 M6 18 L18 6" />
            <circle cx="12" cy="12" r="3" fill="#00F0FF" fillOpacity="0.4" />
          </svg>
        </div>

        {/* Top-Left Chamfered Sci-Fi Frame */}
        <div className="relative rounded-tl-xl border-t-2 border-l-2 border-[#00F0FF]/80 bg-[#040914]/85 p-3.5 pr-8 backdrop-blur-md shadow-[0_0_20px_rgba(0,240,255,0.25)] [clip-path:polygon(0_0,100%_0,92%_100%,0_100%)]">
          <div className="flex items-center gap-4">
            {/* Dual Orbital Concentric Dials */}
            <div className="relative flex h-14 w-14 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[#00F0FF]/40 border-t-[#FFD700] border-r-[#FFD700] animate-[spin_8s_linear_infinite]" />
              <div className="absolute inset-1.5 rounded-full border border-dashed border-[#00F0FF]/60 animate-[spin_12s_linear_infinite_reverse]" />
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00F0FF]/10 text-[9px] font-mono text-[#00F0FF] font-bold">
                {String(selectedIndex + 1).padStart(2, '0')}
              </div>
            </div>

            {/* Readouts */}
            <div className="flex flex-col gap-1 font-mono text-[9px]">
              <span className="font-bold tracking-widest text-[#00F0FF] uppercase">OS COASS_ACCEL</span>
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-6 rounded-sm bg-[#FFD700]" />
                <span className="h-1.5 w-4 rounded-sm bg-[#00F0FF]" />
                <span className="h-1.5 w-2 rounded-sm bg-white/40" />
              </div>
              <div className="flex items-center gap-2 text-white/70">
                <span>VAD: 99.8%</span>
                <span>·</span>
                <span className="text-[#FFD700] font-semibold">LATTICE OK</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
          HUD CORNER 2: TOP-RIGHT TELEMETRY (MGL-VIB SZ_SYS 100)
      ═══════════════════════════════════════════════════════════ */}
      <div className="pointer-events-none absolute top-4 right-6 z-30 flex items-start gap-4">
        {/* Top-Right Chamfered Sci-Fi Frame */}
        <div className="relative rounded-tr-xl border-t-2 border-r-2 border-[#00F0FF]/80 bg-[#040914]/85 p-3.5 pl-8 backdrop-blur-md shadow-[0_0_20px_rgba(0,240,255,0.25)] [clip-path:polygon(8%_0,100%_0,100%_100%,0_100%)]">
          <div className="flex items-center gap-4">
            {/* Sparkline & Readouts */}
            <div className="flex flex-col items-end gap-1 font-mono text-[9px]">
              <span className="font-bold tracking-widest text-[#00F0FF] uppercase">MGL-VIB SZ_SYS 100</span>
              {/* Telemetry Waveform Sparkline */}
              <svg className="h-4 w-28 stroke-[#FFD700] fill-none" viewBox="0 0 100 20" strokeWidth="1.5">
                <path d="M0 10 L15 10 L25 3 L35 15 L45 8 L55 12 L65 2 L75 16 L85 10 L100 10" />
              </svg>
              <div className="flex items-center gap-2 text-white/70">
                <span>RING 0</span>
                <span>·</span>
                <span className="text-emerald-400 font-semibold">SYNCED</span>
              </div>
            </div>

            {/* Circular Gauge */}
            <div className="relative flex h-14 w-14 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[#00F0FF]/50 border-b-[#FFD700] animate-[spin_6s_linear_infinite]" />
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00F0FF]/10 text-[9px] font-mono text-[#00F0FF] font-bold">
                SEC
              </div>
            </div>
          </div>
        </div>

        {/* Floating Ring Gauge */}
        <div className="mt-8 flex h-6 w-6 items-center justify-center rounded-full border border-[#00F0FF]/50 text-[8px] font-mono text-[#00F0FF] animate-spin">
          ◎
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CENTER STAGE: INTERACTIVE SHIELD SELECTION & CAROUSEL
      ═══════════════════════════════════════════════════════════ */}
      <main className="relative flex flex-1 w-full items-center justify-center overflow-visible z-20">
        {/* Interactive Center Focus Shield Aura Overlay */}
        <div className="pointer-events-none absolute flex flex-col items-center justify-center">
          <div className="h-[220px] w-[180px] rounded-full bg-[#9D4EDD]/20 blur-3xl animate-pulse" />
        </div>

        {/* ── 3D HERALDIC SHIELDS RING CAROUSEL ── */}
        <div
          className="relative flex items-center justify-center w-full max-w-4xl h-[420px] pointer-events-auto"
          style={{
            transformStyle: 'preserve-3d',
            perspective: '1200px',
          }}
        >
          {HERALDIC_CRESTS.map((crest, index) => {
            // Calculate 3D cylindrical position
            const itemAngle = index * angleStep + rotationAngle;
            const rad = (itemAngle * Math.PI) / 180;
            const radiusX = 340; // Horizontal ellipse spread
            const radiusZ = 160; // Depth perspective

            const x = Math.sin(rad) * radiusX;
            const z = Math.cos(rad) * radiusZ;
            const scale = (z + 240) / 400; // Closer shields are larger
            const isCenterSelected = Math.abs(((itemAngle % 360) + 360) % 360) < 16;
            const opacity = Math.max(0.35, (z + 200) / 360);

            return (
              <div
                key={crest.id}
                onClick={() => selectShield(index)}
                className={`absolute cursor-pointer transition-all duration-500 ease-out ${
                  isCenterSelected ? 'z-40' : z > 0 ? 'z-20' : 'z-10'
                }`}
                style={{
                  transform: `translate3d(${x}px, ${-z * 0.16 + (isCenterSelected ? -20 : 0)}px, ${z}px) scale(${
                    scale * (isCenterSelected ? 1.25 : 0.88)
                  })`,
                  opacity: opacity,
                  pointerEvents: 'auto',
                }}
              >
                {/* ── VIOLET/PURPLE PLASMA ENERGY AURA AROUND SHIELD BASE ── */}
                <div
                  className={`pointer-events-none absolute -inset-6 rounded-full blur-xl mix-blend-screen transition-opacity duration-500 ${
                    isCenterSelected
                      ? 'bg-gradient-to-t from-[#9D4EDD] via-[#7B2CBF] to-transparent opacity-95 animate-pulse'
                      : 'bg-[#7B2CBF]/40 opacity-40'
                  }`}
                />

                {/* ── HERALDIC SHIELD CONTAINER ── */}
                <div
                  className={`relative flex h-[140px] w-[105px] flex-col items-center justify-center rounded-b-[42px] rounded-t-lg border-2 p-2 backdrop-blur-md transition-all duration-500 ${
                    isCenterSelected
                      ? 'border-white bg-[#0B0D18]/90 shadow-[0_0_35px_rgba(0,240,255,0.9),0_0_55px_rgba(255,255,255,0.8),inset_0_0_20px_rgba(255,215,0,0.3)] ring-4 ring-[#00F0FF]/80 scale-105'
                      : 'border-[#FFD700]/70 bg-[#08070F]/85 shadow-[0_0_20px_rgba(157,78,221,0.5)] hover:border-[#00F0FF] hover:scale-100'
                  }`}
                  style={{
                    clipPath: 'polygon(0% 0%, 100% 0%, 100% 75%, 50% 100%, 0% 75%)',
                  }}
                >
                  {/* Ornate Gold Filigree Crest SVG */}
                  <svg viewBox="0 0 100 100" className="h-20 w-20 drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]">
                    {crest.svgPath(isCenterSelected ? '#FFFFFF' : crest.heraldryColor)}
                  </svg>

                  {/* Shield Top Studs */}
                  <div className="absolute top-1 left-2 h-1 w-1 rounded-full bg-[#FFD700]" />
                  <div className="absolute top-1 right-2 h-1 w-1 rounded-full bg-[#FFD700]" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Left / Right Arrow Triggers */}
        <button
          type="button"
          onClick={rotatePrev}
          aria-label="Previous Tenant Shield"
          className="absolute left-6 md:left-12 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-[#00F0FF]/60 bg-[#040914]/85 font-mono text-2xl text-[#00F0FF] backdrop-blur-md hover:bg-[#00F0FF] hover:text-black transition-all shadow-[0_0_25px_rgba(0,240,255,0.4)] cursor-pointer"
        >
          ‹
        </button>

        <button
          type="button"
          onClick={rotateNext}
          aria-label="Next Tenant Shield"
          className="absolute right-6 md:right-12 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-[#00F0FF]/60 bg-[#040914]/85 font-mono text-2xl text-[#00F0FF] backdrop-blur-md hover:bg-[#00F0FF] hover:text-black transition-all shadow-[0_0_25px_rgba(0,240,255,0.4)] cursor-pointer"
        >
          ›
        </button>
      </main>

      {/* ═══════════════════════════════════════════════════════════
          HUD CORNER 3: BOTTOM-LEFT TELEMETRY (LOCALE RUN TELEMETRY)
      ═══════════════════════════════════════════════════════════ */}
      <footer className="pointer-events-none absolute bottom-4 left-6 z-30 flex items-end gap-4">
        {/* Bottom-Left Chamfered Sci-Fi Frame */}
        <div className="relative rounded-bl-xl border-b-2 border-l-2 border-[#00F0FF]/80 bg-[#040914]/85 p-3.5 pr-8 backdrop-blur-md shadow-[0_0_20px_rgba(0,240,255,0.25)] [clip-path:polygon(0_0,92%_0,100%_100%,0_100%)]">
          <div className="flex items-center gap-4">
            {/* Triple Ring Status Dials */}
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#00F0FF] bg-[#00F0FF]/10 text-[8px] font-mono text-[#00F0FF] font-bold">
                01
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#00F0FF]/60 text-[8px] font-mono text-white/60">
                02
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#00F0FF]/40 text-[8px] font-mono text-white/40">
                03
              </div>
            </div>

            {/* Readouts */}
            <div className="flex flex-col gap-0.5 font-mono text-[9px]">
              <span className="font-bold tracking-widest text-[#00F0FF] uppercase">LOCALE RUN TELEMETRY</span>
              <div className="flex items-center gap-2 text-white/70">
                <span>01 MASTER NODE</span>
                <span>·</span>
                <span className="text-[#FFD700] font-semibold">HSM SECURE</span>
              </div>
              {/* Segmented Level Meter */}
              <div className="mt-1 flex items-center gap-1">
                <span className="h-1 w-3 bg-[#00F0FF]" />
                <span className="h-1 w-3 bg-[#00F0FF]" />
                <span className="h-1 w-3 bg-[#00F0FF]" />
                <span className="h-1 w-3 bg-[#FFD700]" />
                <span className="h-1 w-3 bg-white/20" />
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════════
          HUD CORNER 4: BOTTOM-RIGHT TELEMETRY (REF 500 / CORE LOCK)
      ═══════════════════════════════════════════════════════════ */}
      <div className="pointer-events-none absolute bottom-4 right-6 z-30 flex items-end gap-4">
        {/* Bottom-Right Chamfered Sci-Fi Frame */}
        <div className="relative rounded-br-xl border-b-2 border-r-2 border-[#00F0FF]/80 bg-[#040914]/85 p-3.5 pl-8 backdrop-blur-md shadow-[0_0_20px_rgba(0,240,255,0.25)] [clip-path:polygon(8%_0,100%_0,100%_100%,0_100%)]">
          <div className="flex items-center gap-4">
            {/* Stacked Amber / Gold Level Bars */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-6 rounded-sm bg-[#FFD700]" />
                <span className="h-1.5 w-8 rounded-sm bg-[#FFD700]" />
                <span className="h-1.5 w-4 rounded-sm bg-[#FFD700]/40" />
              </div>
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-10 rounded-sm bg-[#FFD700]" />
                <span className="h-1.5 w-5 rounded-sm bg-[#FFD700]" />
                <span className="h-1.5 w-3 rounded-sm bg-[#FFD700]/30" />
              </div>
            </div>

            {/* Readouts */}
            <div className="flex flex-col items-end gap-0.5 font-mono text-[9px]">
              <span className="font-bold tracking-widest text-[#FFD700] uppercase">REF 500</span>
              <div className="flex items-center gap-2 text-white/70">
                <span className="text-[#00F0FF] font-semibold">CORE LOCK</span>
                <span>·</span>
                <span>8ms LATENCY</span>
              </div>
              <span className="text-[8px] text-white/50">MEM: 4.2GB / 8.0GB</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          BOTTOM-CENTER HUD: CHOOSE YOUR SELECTION / CHOOSE YOUR TENANT
      ═══════════════════════════════════════════════════════════ */}
      <div className="relative z-30 mb-8 flex flex-col items-center gap-3">
        {/* Main Sci-Fi Button Container Matching Reference Image */}
        <button
          type="button"
          onClick={handleConfirm}
          className="group relative flex flex-col items-center justify-center rounded-lg border-2 border-[#00F0FF] bg-[#050D1A]/90 px-10 py-3.5 backdrop-blur-xl shadow-[0_0_35px_rgba(0,240,255,0.5),inset_0_0_15px_rgba(0,240,255,0.25)] hover:border-[#FFD700] hover:bg-[#08152A] hover:shadow-[0_0_45px_rgba(255,215,0,0.7)] transition-all cursor-pointer"
        >
          {/* Corner Notch Accents */}
          <div className="absolute top-0 left-0 h-2 w-2 border-t-2 border-l-2 border-white" />
          <div className="absolute top-0 right-0 h-2 w-2 border-t-2 border-r-2 border-white" />
          <div className="absolute bottom-0 left-0 h-2 w-2 border-b-2 border-l-2 border-white" />
          <div className="absolute bottom-0 right-0 h-2 w-2 border-b-2 border-r-2 border-white" />

          {/* Line 1: CHOOSE YOUR SELECTION */}
          <span className="font-mono text-[13px] font-bold uppercase tracking-[0.28em] text-[#00F0FF] group-hover:text-[#FFD700] transition-colors">
            CHOOSE YOUR SELECTION
          </span>

          {/* Line 2: CHOOSE YOUR TENANT / PARTITION NAME */}
          <span className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/90 group-hover:text-white">
            CHOOSE YOUR TENANT · {currentCrest.name}
          </span>
        </button>

        {/* Quick Helper Subtitle */}
        <div className="flex items-center gap-2 font-mono text-[10px] text-white/60 bg-black/40 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">
          <span>Use [← / →] or Drag to Rotate</span>
          <span>·</span>
          <span>Press [Enter] to Confirm</span>
        </div>
      </div>
    </div>
  );
}

export default TenantCarouselSelect;
