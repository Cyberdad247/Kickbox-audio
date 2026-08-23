'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface BiometricScanHUDProps {
  isScanning: boolean;
  status: 'idle' | 'scanning' | 'acquiring' | 'verifying' | 'success' | 'failed';
  detectedPayload?: string | null;
  mode?: 'qr' | 'face_neural';
  progress?: number;
  onModeToggle?: () => void;
  className?: string;
}

export function BiometricScanHUD({
  isScanning,
  status,
  detectedPayload,
  mode = 'qr',
  progress = 0,
  onModeToggle,
  className = '',
}: BiometricScanHUDProps) {
  const [frameCount, setFrameCount] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [activeNodes, setActiveNodes] = useState<{ x: number; y: number; id: number }[]>([]);

  // Constellation / Landmark node generation for holographic biometric mesh
  useEffect(() => {
    if (!isScanning) {
      setActiveNodes([]);
      return;
    }

    // Generate static/jitter nodes for facial or optical mesh tracking
    const nodes = [
      { id: 1, x: 30, y: 35 },
      { id: 2, x: 70, y: 35 },
      { id: 3, x: 50, y: 50 },
      { id: 4, x: 38, y: 65 },
      { id: 5, x: 62, y: 65 },
      { id: 6, x: 50, y: 78 },
      { id: 7, x: 22, y: 50 },
      { id: 8, x: 78, y: 50 },
    ];
    setActiveNodes(nodes);
  }, [isScanning]);

  // Frame tick & confidence simulation animation
  useEffect(() => {
    if (!isScanning) return;

    const interval = setInterval(() => {
      setFrameCount((prev) => (prev + 1) % 9999);
      if (status === 'verifying' || status === 'success') {
        setConfidence(100);
      } else if (isScanning) {
        setConfidence((prev) => {
          const target = Math.floor(75 + Math.random() * 24);
          return Math.min(99, Math.max(60, Math.floor(prev * 0.7 + target * 0.3)));
        });
      }
    }, 120);

    return () => clearInterval(interval);
  }, [isScanning, status]);

  // Get status message
  const getStatusLabel = () => {
    if (status === 'success') return 'CIPHER KEY MATCHED';
    if (status === 'verifying') return 'VERIFYING BIOMETRIC HASH';
    if (detectedPayload) return 'PAYLOAD DETECTED';
    if (isScanning)
      return mode === 'face_neural' ? 'MAPPING FACIAL BIOMETRICS' : 'SEARCHING OPTICAL RETICLE';
    return 'STANDBY';
  };

  return (
    <div
      className={`pointer-events-none absolute inset-0 flex flex-col justify-between overflow-hidden p-2.5 select-none ${className}`}
    >
      {/* ── Top HUD Header & Live Sensor Metrics ── */}
      <div className="flex items-center justify-between text-[10px] font-mono text-white/90">
        {/* Left: Active Camera Sensor Beacon */}
        <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/70 px-2 py-1 backdrop-blur-md">
          <span
            className={`h-2 w-2 rounded-full ${
              status === 'success'
                ? 'bg-emerald-400 shadow-[0_0_8px_#34D399]'
                : isScanning
                  ? 'bg-[#00E5FF] animate-ping'
                  : 'bg-amber-400'
            }`}
          />
          <span className="font-bold uppercase tracking-wider text-[#00E5FF]">
            {mode === 'face_neural' ? 'NEURAL CAM' : 'OPTICAL CAM'}
          </span>
          <span className="text-white/40">|</span>
          <span className="text-white/70">60 FPS</span>
        </div>

        {/* Right: Confidence Index & Frame Counter */}
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/70 px-2 py-1 backdrop-blur-md">
          <div className="flex items-center gap-1">
            <span className="text-white/50">CONF:</span>
            <span className={`font-bold ${confidence > 90 ? 'text-[#FFD700]' : 'text-[#00E5FF]'}`}>
              {status === 'success' ? '100%' : `${confidence}%`}
            </span>
          </div>
          <span className="text-white/40">#</span>
          <span className="text-white/60">{String(frameCount).padStart(4, '0')}</span>
        </div>
      </div>

      {/* ── Center Reticle, Biometric Mesh & Laser Sweep ── */}
      <div className="relative flex flex-1 items-center justify-center">
        {/* Outer Circular Optical Ring */}
        <div
          className={`relative flex h-36 w-36 items-center justify-center rounded-full border border-dashed transition-all duration-500 ${
            status === 'success'
              ? 'border-emerald-400 bg-emerald-400/10 shadow-[0_0_35px_rgba(52,211,153,0.5)] scale-105'
              : status === 'verifying'
                ? 'border-[#FFD700] bg-[#FFD700]/10 shadow-[0_0_30px_rgba(255,215,0,0.4)] animate-pulse'
                : isScanning
                  ? 'border-[#00E5FF]/60 shadow-[0_0_20px_rgba(0,229,255,0.25)]'
                  : 'border-white/20 opacity-40'
          }`}
        >
          {/* Rotating Compass Tick Marks Ring */}
          <div
            className={`absolute inset-0 rounded-full border border-dotted border-white/30 ${
              isScanning ? 'animate-[spin_10s_linear_infinite]' : ''
            }`}
          />

          {/* Secondary Fast Counter-Rotating Ring */}
          <div
            className={`absolute -inset-2 rounded-full border-t-2 border-b-2 border-[#00E5FF]/40 ${
              isScanning ? 'animate-[spin_6s_linear_infinite_reverse]' : ''
            }`}
          />

          {/* Precision Corner Crosshair Brackets */}
          <div className="absolute -top-1 -left-1 h-4 w-4 border-t-2 border-l-2 border-[#FFD700]" />
          <div className="absolute -top-1 -right-1 h-4 w-4 border-t-2 border-r-2 border-[#FFD700]" />
          <div className="absolute -bottom-1 -left-1 h-4 w-4 border-b-2 border-l-2 border-[#FFD700]" />
          <div className="absolute -bottom-1 -right-1 h-4 w-4 border-b-2 border-r-2 border-[#FFD700]" />

          {/* Laser Sweep Beam */}
          {isScanning && status !== 'success' && (
            <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent shadow-[0_0_12px_#00E5FF] animate-[bounce_2s_infinite]" />
          )}

          {/* Landmark Biometric Constellation Points (Face/Pattern Mesh) */}
          {isScanning && activeNodes.length > 0 && (
            <svg className="absolute inset-0 h-full w-full opacity-70" viewBox="0 0 100 100">
              {/* Triangular Intersect Mesh Lines */}
              <polygon
                points="30,35 70,35 50,50"
                fill="none"
                stroke="#00E5FF"
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
              <polygon
                points="38,65 62,65 50,78"
                fill="none"
                stroke="#FFD700"
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
              <line x1="30" y1="35" x2="38" y2="65" stroke="#00E5FF" strokeWidth="0.5" />
              <line x1="70" y1="35" x2="62" y2="65" stroke="#00E5FF" strokeWidth="0.5" />
              <line x1="50" y1="50" x2="50" y2="78" stroke="#7B2CBF" strokeWidth="0.5" />

              {/* Pulsing Landmark Feature Nodes */}
              {activeNodes.map((node) => (
                <circle
                  key={node.id}
                  cx={node.x}
                  cy={node.y}
                  r="2"
                  fill="#FFD700"
                  className="animate-pulse"
                />
              ))}
            </svg>
          )}

          {/* Success Checkmark Glyph */}
          {status === 'success' && (
            <div className="flex flex-col items-center justify-center text-emerald-400">
              <span className="text-3xl font-bold drop-shadow-[0_0_10px_#34D399]">✓</span>
              <span className="mt-1 font-mono text-[9px] uppercase tracking-widest text-emerald-300">
                UNLOCKED
              </span>
            </div>
          )}

          {/* Scanning Reticle Core Icon */}
          {status !== 'success' && (
            <div className="flex flex-col items-center justify-center opacity-80">
              <span className="text-xl">{mode === 'face_neural' ? '👤' : '⚡'}</span>
            </div>
          )}
        </div>

        {/* Horizontal Axis Grid Lines */}
        <div className="pointer-events-none absolute inset-x-4 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-[#00E5FF]/30 to-transparent" />
        <div className="pointer-events-none absolute inset-y-4 left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#00E5FF]/30 to-transparent" />
      </div>

      {/* ── Bottom Telemetry & Waveform Oscilloscope ── */}
      <div className="flex flex-col gap-1.5">
        {/* Status Badge & Dynamic Phase Readout */}
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/70 px-2.5 py-1 text-[10px] font-mono backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === 'success' ? 'bg-emerald-400' : 'bg-[#FFD700] animate-ping'
              }`}
            />
            <span className="font-bold text-white tracking-wider">{getStatusLabel()}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {progress > 0 && <span className="text-[#00E5FF] font-bold">{progress}%</span>}
            <span className="text-white/40">LATTICE_GATE</span>
          </div>
        </div>

        {/* Dynamic Waveform Oscilloscope Bars */}
        <div className="flex h-2 items-end justify-between gap-1 overflow-hidden px-1">
          {[40, 75, 20, 90, 60, 30, 85, 45, 95, 35, 70, 50, 80, 25, 65].map((height, i) => (
            <div
              key={i}
              className="w-full rounded-xs bg-gradient-to-t from-[#7B2CBF] via-[#00E5FF] to-[#FFD700] opacity-75 transition-all duration-200"
              style={{
                height: isScanning
                  ? `${Math.max(15, height + ((frameCount * 7) % 70)) % 100}%`
                  : '15%',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
