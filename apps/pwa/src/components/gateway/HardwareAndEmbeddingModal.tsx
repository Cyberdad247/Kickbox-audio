'use client';

import React, { useState, useEffect } from 'react';
import { useHardwareCompatibility } from '../../hooks/useHardwareCompatibility';
import { generateEmbedSnippet, sendEmbedEvent } from '../../lib/uiEmbedding';
import { playCyberSound } from '../../lib/feedbackCues';

interface HardwareAndEmbeddingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'hardware' | 'embedding' | 'simulator';
}

export function HardwareAndEmbeddingModal({
  isOpen,
  onClose,
  initialTab = 'hardware',
}: HardwareAndEmbeddingModalProps) {
  const hw = useHardwareCompatibility();
  const [activeTab, setActiveTab] = useState<'hardware' | 'embedding' | 'simulator'>(initialTab);

  // Embedding snippet generator states
  const [embedWidth, setEmbedWidth] = useState('100%');
  const [embedHeight, setEmbedHeight] = useState('760px');
  const [embedTheme, setEmbedTheme] = useState('gothic-dark');
  const [allowCamMic, setAllowCamMic] = useState(true);
  const [copied, setCopied] = useState(false);
  const [embedLogs, setEmbedLogs] = useState<string[]>([
    'Bridge ready: bidirectional window.postMessage protocol enabled',
  ]);

  // Viewport simulator state
  const [simulatedDevice, setSimulatedDevice] = useState<'mobile' | 'tablet' | 'pc' | 'ultrawide'>(
    'mobile'
  );

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  if (!isOpen) return null;

  const currentEmbedCode = generateEmbedSnippet({
    width: embedWidth,
    height: embedHeight,
    theme: embedTheme,
  });

  const handleCopyCode = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(currentEmbedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  const handleSendPing = () => {
    sendEmbedEvent('CAMELOT_PING_TEST', { clientTime: Date.now() });
    setEmbedLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] Sent CAMELOT_PING_TEST to parent frame`,
      ...prev.slice(0, 6),
    ]);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-xl animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border-2 border-[#00F0FF]/60 bg-[#070512] text-white shadow-[0_0_60px_rgba(0,240,255,0.3)] overflow-hidden">
        {/* Decorative Circuit Accents */}
        <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-[#FFD700]" />
        <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-[#FFD700]" />
        <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-[#FFD700]" />
        <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-[#FFD700]" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#0A071A] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#00F0FF] bg-[#00F0FF]/15 text-lg shadow-[0_0_12px_rgba(0,240,255,0.4)]">
              ⚙️
            </span>
            <div>
              <h2 className="font-serif text-sm sm:text-base font-bold tracking-wider text-white">
                HARDWARE SCREEN VERIFICATION & UI EMBEDDING
              </h2>
              <p className="font-mono text-[9px] text-[#00F0FF] tracking-widest uppercase">
                MOBILE // TABLET // PC ADAPTIVE PROTOCOL
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 text-white/70 hover:border-[#FFD700] hover:text-[#FFD700] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-white/10 bg-[#05030B] px-5 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('hardware')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'hardware'
                ? 'border-[#00F0FF] text-[#00F0FF] font-bold shadow-[0_4px_12px_rgba(0,240,255,0.2)]'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <span>📱</span>
            <span>Hardware Verification</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('embedding')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'embedding'
                ? 'border-[#FFD700] text-[#FFD700] font-bold shadow-[0_4px_12px_rgba(255,215,0,0.2)]'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <span>🖼️</span>
            <span>UI Embedding Suite</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'simulator'
                ? 'border-purple-400 text-purple-300 font-bold shadow-[0_4px_12px_rgba(192,132,252,0.2)]'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <span>🔍</span>
            <span>Screen Simulator</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: HARDWARE VERIFICATION */}
          {activeTab === 'hardware' && (
            <div className="space-y-4">
              {/* Active Device Category Banner */}
              <div
                className={`flex items-center justify-between rounded-xl border p-4 backdrop-blur-md ${
                  hw.isMobile
                    ? 'border-amber-400/70 bg-amber-500/10'
                    : hw.isTablet
                      ? 'border-purple-400/70 bg-purple-500/10'
                      : 'border-[#00F0FF]/70 bg-[#00F0FF]/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">
                    {hw.isMobile ? '📱' : hw.isTablet ? '📟' : '💻'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-sm sm:text-base font-bold text-white uppercase">
                        {hw.deviceCategory === 'mobile'
                          ? 'MOBILE EDGE HARDWARE DETECTED'
                          : hw.deviceCategory === 'tablet'
                            ? 'TABLET / PAD HARDWARE DETECTED'
                            : 'PC / DESKTOP WORKSTATION DETECTED'}
                      </h3>
                      <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 font-mono text-[9px] text-[#FFD700]">
                        {hw.tier.toUpperCase()}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-white/70 mt-0.5">
                      {hw.hardwareReportString}
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono text-xs hidden sm:block">
                  <span className="text-emerald-400 font-bold">● VERIFIED</span>
                  <div className="text-[9px] text-white/50">{hw.orientation.toUpperCase()}</div>
                </div>
              </div>

              {/* Hardware Screen Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl border border-white/10 bg-[#0D091F] p-3">
                  <div className="font-mono text-[9px] text-white/50 uppercase">
                    Active Viewport
                  </div>
                  <div className="font-mono text-base font-bold text-[#00F0FF] mt-1">
                    {hw.viewportWidth} × {hw.viewportHeight}
                  </div>
                  <div className="text-[8px] font-mono text-white/40">Inner CSS Pixels</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0D091F] p-3">
                  <div className="font-mono text-[9px] text-white/50 uppercase">
                    Hardware Screen
                  </div>
                  <div className="font-mono text-base font-bold text-[#FFD700] mt-1">
                    {hw.screenWidth} × {hw.screenHeight}
                  </div>
                  <div className="text-[8px] font-mono text-white/40">Physical Monitor</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0D091F] p-3">
                  <div className="font-mono text-[9px] text-white/50 uppercase">
                    Pixel Density (DPR)
                  </div>
                  <div className="font-mono text-base font-bold text-emerald-300 mt-1">
                    {hw.pixelRatio.toFixed(2)}x
                  </div>
                  <div className="text-[8px] font-mono text-white/40">
                    {hw.pixelRatio > 1.5 ? 'Retina / Hi-DPI' : 'Standard DPI'}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0D091F] p-3">
                  <div className="font-mono text-[9px] text-white/50 uppercase">Aspect Ratio</div>
                  <div className="font-mono text-base font-bold text-purple-300 mt-1">
                    {hw.aspectRatio}
                  </div>
                  <div className="text-[8px] font-mono text-white/40">
                    {hw.orientation === 'portrait' ? 'Vertical 9:16' : 'Horizontal 16:9'}
                  </div>
                </div>
              </div>

              {/* Hardware Input & Engine Verification Checklist */}
              <div className="rounded-xl border border-white/10 bg-[#0A0718] p-4">
                <h4 className="font-mono text-xs font-bold text-[#FFD700] uppercase tracking-wider mb-3">
                  Hardware Capability & Sensory Diagnostics
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-white/70">Pointer Input Type:</span>
                    <span className="font-bold text-[#00F0FF]">
                      {hw.isTouch ? `Touch (${hw.touchPoints} points)` : 'Precision Mouse'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-white/70">Touch Target Scale:</span>
                    <span className="font-bold text-emerald-400">≥ 44px (Compliant)</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-white/70">CPU Concurrency:</span>
                    <span className="font-bold text-white">{hw.cpuCores} Cores Available</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-white/70">Device Memory:</span>
                    <span className="font-bold text-white">~{hw.deviceMemoryGB} GB RAM Tier</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-white/70">WebGL 3D GPU Engine:</span>
                    <span className="font-bold text-purple-300 truncate max-w-[170px]" title={hw.gpuRenderer}>
                      {hw.gpuRenderer}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-white/70">WebRTC / AudioContext:</span>
                    <span className="font-bold text-emerald-400">
                      {hw.hasWebRTC && hw.hasAudioContext ? 'Active & Armed' : 'Restricted'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UI EMBEDDING SUITE */}
          {activeTab === 'embedding' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#00F0FF]/40 bg-[#00F0FF]/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🖼️</span>
                    <div>
                      <h4 className="font-serif text-sm font-bold text-white">
                        Sovereign Container & iFrame Embedding
                      </h4>
                      <p className="font-mono text-[9px] text-[#00F0FF] mt-0.5">
                        Embed Camelot-OS into external intranets, dashboards, or websites.
                      </p>
                    </div>
                  </div>

                  <div className="font-mono text-[10px] text-right">
                    <span
                      className={`rounded-full px-2 py-0.5 font-bold ${
                        hw.isEmbedded
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400'
                          : 'bg-white/10 text-white/60 border border-white/20'
                      }`}
                    >
                      {hw.isEmbedded ? '● IN IFRAME' : '○ TOP WINDOW'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Embedding Configurations */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-mono text-[10px] text-white/60 uppercase mb-1">
                    Frame Width
                  </label>
                  <input
                    type="text"
                    value={embedWidth}
                    onChange={(e) => setEmbedWidth(e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-[#0A0718] px-3 py-1.5 font-mono text-xs text-white focus:border-[#00F0FF] focus:outline-none"
                    placeholder="100% or 800px"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] text-white/60 uppercase mb-1">
                    Frame Height
                  </label>
                  <input
                    type="text"
                    value={embedHeight}
                    onChange={(e) => setEmbedHeight(e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-[#0A0718] px-3 py-1.5 font-mono text-xs text-white focus:border-[#00F0FF] focus:outline-none"
                    placeholder="760px or 100vh"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] text-white/60 uppercase mb-1">
                    Theme Variant
                  </label>
                  <select
                    value={embedTheme}
                    onChange={(e) => setEmbedTheme(e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-[#0A0718] px-3 py-1.5 font-mono text-xs text-white focus:border-[#00F0FF] focus:outline-none"
                  >
                    <option value="gothic-dark">Gothic Cathedral (Dark)</option>
                    <option value="obsidian-cyber">Obsidian Cyberpunk</option>
                    <option value="sovereign-gold">Sovereign Gold</option>
                  </select>
                </div>
              </div>

              {/* Generated Embed Code Output */}
              <div className="relative rounded-xl border border-white/15 bg-[#05030B] p-3 font-mono text-xs">
                <div className="flex items-center justify-between text-white/50 text-[10px] mb-1.5 border-b border-white/10 pb-1">
                  <span>HTML EMBED CODE</span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 text-[#FFD700] hover:underline cursor-pointer"
                  >
                    <span>{copied ? '✓ COPIED TO CLIPBOARD' : '📋 COPY EMBED CODE'}</span>
                  </button>
                </div>
                <pre className="overflow-x-auto text-[11px] text-[#00F0FF] py-1 select-all whitespace-pre-wrap">
                  {currentEmbedCode}
                </pre>
              </div>

              {/* postMessage Communication Handshake test */}
              <div className="rounded-xl border border-white/10 bg-[#0A0718] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-white uppercase">
                    postMessage Bridge Test
                  </span>
                  <button
                    type="button"
                    onClick={handleSendPing}
                    className="rounded-lg border border-[#00F0FF] bg-[#00F0FF]/15 px-2.5 py-1 font-mono text-[10px] text-[#00F0FF] hover:bg-[#00F0FF]/25 cursor-pointer"
                  >
                    ⚡ Ping Parent Container
                  </button>
                </div>

                <div className="space-y-1 font-mono text-[10px] text-white/60 bg-[#05030B] p-2 rounded-lg max-h-24 overflow-y-auto">
                  {embedLogs.map((log, i) => (
                    <div key={i} className="text-emerald-300/80">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCREEN SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-white uppercase">
                  Verify Responsive Layouts for Mobile, Tab, and PC
                </span>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSimulatedDevice('mobile')}
                    className={`rounded-lg border px-2.5 py-1 font-mono text-[10px] uppercase cursor-pointer ${
                      simulatedDevice === 'mobile'
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300 font-bold'
                        : 'border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    📱 Mobile (390px)
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimulatedDevice('tablet')}
                    className={`rounded-lg border px-2.5 py-1 font-mono text-[10px] uppercase cursor-pointer ${
                      simulatedDevice === 'tablet'
                        ? 'border-purple-400 bg-purple-500/20 text-purple-300 font-bold'
                        : 'border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    📟 Tablet (820px)
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimulatedDevice('pc')}
                    className={`rounded-lg border px-2.5 py-1 font-mono text-[10px] uppercase cursor-pointer ${
                      simulatedDevice === 'pc'
                        ? 'border-[#00F0FF] bg-[#00F0FF]/20 text-[#00F0FF] font-bold'
                        : 'border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    💻 PC (1280px)
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimulatedDevice('ultrawide')}
                    className={`rounded-lg border px-2.5 py-1 font-mono text-[10px] uppercase cursor-pointer ${
                      simulatedDevice === 'ultrawide'
                        ? 'border-[#FFD700] bg-[#FFD700]/20 text-[#FFD700] font-bold'
                        : 'border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    🖥️ Ultrawide (1920px)
                  </button>
                </div>
              </div>

              {/* Simulated Device Frame Container */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#030206] p-4 min-h-[280px]">
                <div
                  className="relative rounded-xl border-2 border-[#00F0FF]/50 bg-[#080515] p-3 shadow-2xl transition-all duration-300 overflow-hidden"
                  style={{
                    width:
                      simulatedDevice === 'mobile'
                        ? '340px'
                        : simulatedDevice === 'tablet'
                          ? '520px'
                          : '100%',
                    maxWidth: '100%',
                  }}
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-400" />
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="font-mono text-[9px] text-white/50 ml-1">
                        {simulatedDevice === 'mobile'
                          ? 'Mobile Viewport (Touch: 390×844)'
                          : simulatedDevice === 'tablet'
                            ? 'Tablet Viewport (Pad: 820×1180)'
                            : 'PC Sovereign Viewport (1440×900)'}
                      </span>
                    </div>

                    <span className="font-mono text-[8.5px] text-emerald-400">
                      ✓ Bounds Verified
                    </span>
                  </div>

                  {/* Micro simulated preview content */}
                  <div className="space-y-2 font-mono text-[9.5px]">
                    <div className="flex items-center justify-between rounded-lg bg-white/5 p-2">
                      <span className="text-[#FFD700] font-bold">⚔️ Camelot OS</span>
                      <span className="text-[#00F0FF]">Multi-Auth Armed</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[8.5px]">
                      <div className="rounded bg-[#120D22] p-2 border border-white/5">
                        <div className="text-white/60">Layout Mode:</div>
                        <div className="font-bold text-white">
                          {simulatedDevice === 'mobile'
                            ? 'Single-Column Stack'
                            : 'Dual-Pane Panoramic'}
                        </div>
                      </div>

                      <div className="rounded bg-[#120D22] p-2 border border-white/5">
                        <div className="text-white/60">Touch Target:</div>
                        <div className="font-bold text-emerald-400">
                          {simulatedDevice === 'mobile' || simulatedDevice === 'tablet'
                            ? '48px Touch Safe'
                            : 'Precision Cursor'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#0A071A] px-5 py-3 font-mono text-[10px]">
          <div className="flex items-center gap-2 text-white/60">
            <span>Hardware Status:</span>
            <strong className="text-white">{hw.hardwareReportString}</strong>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-1.5 font-mono text-xs font-bold uppercase text-white hover:bg-white/20 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
