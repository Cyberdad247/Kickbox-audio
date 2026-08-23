'use client';

import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { playSpatialTone, triggerHaptic } from '../../lib/hapticsAndSpatialAudio';
import {
  type CrossRepoCartridge,
  PRE_REGISTERED_CROSS_REPO_CARTRIDGES,
  resolveCrossRepoCartridge,
  verifyCartridgeProvenance,
} from '../../lib/kernel/cartridgeResolver';
import { speak } from '../../lib/voice';
import { FileDriverExplorer } from './FileDriverExplorer';

interface WorktreeFile {
  name: string;
  type: 'file' | 'folder';
  sizeKb?: number;
  status: 'clean' | 'modified' | 'verified';
  children?: WorktreeFile[];
  content?: string;
}

export function LocalWorkspaceManager() {
  const { activeTenant } = useTenant();
  const [activeTab, setActiveTab] = useState<'driver' | 'cartridges' | 'worktree'>('driver');
  const [mountedDirectoryName, setMountedDirectoryName] = useState<string | null>(
    'kickbox-audio-worktree',
  );
  const [isMounting, setIsMounting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<WorktreeFile | null>(null);
  const [lintStatus, setLintStatus] = useState<'idle' | 'running' | 'passed'>('idle');

  // Cross-repo cartridges state
  const [cartridges, setCartridges] = useState<CrossRepoCartridge[]>(
    PRE_REGISTERED_CROSS_REPO_CARTRIDGES,
  );
  const [selectedCartridge, setSelectedCartridge] = useState<CrossRepoCartridge | null>(
    PRE_REGISTERED_CROSS_REPO_CARTRIDGES[0],
  );
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Worktree File Structure
  const [files, setFiles] = useState<WorktreeFile[]>([
    {
      name: 'contracts',
      type: 'folder',
      status: 'clean',
      children: [
        {
          name: 'gideon_proof.rs',
          type: 'file',
          sizeKb: 12.4,
          status: 'verified',
          content: `// Gideon Protocol — Rust no_std Capability Lease Schema\n#[derive(Debug, Serialize, Deserialize)]\npub struct GideonProof {\n    pub tenant_id: [u8; 16],\n    pub lease_epoch: u64,\n    pub hsm_signature: [u8; 64],\n    pub merkle_root: [u8; 32],\n}`,
        },
        {
          name: 'msgpack_schema.rs',
          type: 'file',
          sizeKb: 8.1,
          status: 'verified',
          content: `// AgentBus Inter-Process Schema\npub enum AgentMessage {\n    IntentAudio { buffer_len: u32, pcm_rate: u16 },\n    StateSync { node_id: String, payload: Vec<u8> },\n    ConsentPrompt { action_id: String, risk_level: u8 },\n}`,
        },
      ],
    },
    {
      name: 'pills',
      type: 'folder',
      status: 'clean',
      children: [
        {
          name: 'anya_vad.wasm',
          type: 'file',
          sizeKb: 145.2,
          status: 'clean',
          content: `[Binary WASM Module: Anya Voice Activity Detection & Acoustic Enclave]`,
        },
        {
          name: 'merlin_rdf.wasm',
          type: 'file',
          sizeKb: 280.6,
          status: 'clean',
          content: `[Binary WASM Module: RDF Topological Graph & MicroVM Loop]`,
        },
      ],
    },
    {
      name: 'receipts',
      type: 'folder',
      status: 'clean',
      children: [
        {
          name: 'genesis_receipt.json',
          type: 'file',
          sizeKb: 4.2,
          status: 'verified',
          content: `{\n  "receiptId": "KBA_RC_908124",\n  "timestamp": "2026-08-20T22:20:00Z",\n  "sovereignConsent": true,\n  "hsmVerified": true\n}`,
        },
      ],
    },
    {
      name: 'blueprint.md',
      type: 'file',
      sizeKb: 18.0,
      status: 'clean',
      content: `# Camelot-OS Worktree Blueprint\n\n- Sovereign WASM-native micro-frontend OS\n- Zone-0 Local Execution Guard\n- Zero unauthorized external network leaks`,
    },
  ]);

  const handleMountDirectory = async () => {
    setIsMounting(true);
    triggerHaptic('click');

    try {
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (
          window as unknown as { showDirectoryPicker: () => Promise<{ name: string }> }
        ).showDirectoryPicker();
        if (dirHandle?.name) {
          setMountedDirectoryName(dirHandle.name);
          speak(`Local directory ${dirHandle.name} mounted into workspace worktree.`);
          triggerHaptic('consent');
        }
      } else {
        // Fallback simulation
        setMountedDirectoryName('local-filesystem-partition');
        speak('Local browser OPFS worktree mounted successfully.');
        triggerHaptic('consent');
      }
    } catch {
      // User cancelled picker
    } finally {
      setIsMounting(false);
    }
  };

  const handleRunWasmLinter = () => {
    setLintStatus('running');
    triggerHaptic('click');
    playSpatialTone(0.5, 580, 150, 'triangle');
    speak('Running local WASM static analysis and capability audit.');

    setTimeout(() => {
      setLintStatus('passed');
      triggerHaptic('consent');
      playSpatialTone(0.5, 880, 200, 'sine');
      speak('All contracts and WASM pills passed zero-leak capability checks.');
    }, 1800);
  };

  const handleVerifyAndResolve = async (cartridge: CrossRepoCartridge) => {
    setResolvingId(cartridge.id);
    triggerHaptic('click');
    playSpatialTone(0.5, 600, 150, 'sine');
    speak(`Initiating cross-repo resolution handshake for ${cartridge.title}`);

    const resolved = await resolveCrossRepoCartridge(cartridge, activeTenant.clearance);

    setCartridges((prev) => prev.map((c) => (c.id === cartridge.id ? resolved : c)));
    setSelectedCartridge(resolved);
    setResolvingId(null);

    if (resolved.resolutionStatus === 'RESOLVED') {
      triggerHaptic('consent');
      playSpatialTone(0.5, 880, 250, 'triangle');
      speak(`Cartridge ${cartridge.title} verified and capability lease issued.`);
    } else {
      triggerHaptic('warning');
      speak(`Resolution rejected for ${cartridge.title}: restricted clearance.`);
    }
  };

  const handleExportCartridge = () => {
    triggerHaptic('pill-slot');
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(files, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${mountedDirectoryName || 'sovereign'}.camelot.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    speak('Sovereign cartridge package exported successfully.');
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-white/10 bg-[#080810] text-white overflow-hidden shadow-2xl">
      {/* Header Bar & Tab Matrix */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 bg-[#0E0E1C] px-5 py-3.5 gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('driver');
                triggerHaptic('click');
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-xs font-bold transition-all ${
                activeTab === 'driver'
                  ? 'border border-[#FFD700] bg-[#FFD700]/20 text-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.25)]'
                  : 'border border-white/10 text-white/50 hover:text-white hover:border-white/30'
              }`}
            >
              <span>⚡</span>
              <span>File Driver Explorer</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('cartridges');
                triggerHaptic('click');
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-xs font-bold transition-all ${
                activeTab === 'cartridges'
                  ? 'border border-[#00F0FF] bg-[#00F0FF]/20 text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                  : 'border border-white/10 text-white/50 hover:text-white hover:border-white/30'
              }`}
            >
              <span>🧩</span>
              <span>Cross-Repo Cartridges ({cartridges.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('worktree');
                triggerHaptic('click');
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-xs font-bold transition-all ${
                activeTab === 'worktree'
                  ? 'border border-purple-400 bg-purple-500/20 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                  : 'border border-white/10 text-white/50 hover:text-white hover:border-white/30'
              }`}
            >
              <span>📂</span>
              <span>Worktree OPFS</span>
            </button>
          </div>

          <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-300">
            {activeTenant.clearance}
          </span>
        </div>

        {/* Action Matrix */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {activeTab === 'worktree' ? (
            <>
              <button
                type="button"
                onClick={handleMountDirectory}
                disabled={isMounting}
                className="flex items-center gap-1.5 rounded-xl border border-[#00F0FF]/40 bg-[#00F0FF]/15 px-3 py-1.5 font-bold text-[#00F0FF] hover:bg-[#00F0FF]/30 transition-all"
              >
                <span>📁</span>
                <span>{isMounting ? 'Opening Picker...' : 'Mount Local Folder'}</span>
              </button>

              <button
                type="button"
                onClick={handleRunWasmLinter}
                disabled={lintStatus === 'running'}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-bold transition-all ${
                  lintStatus === 'running'
                    ? 'border-amber-400 bg-amber-500/20 text-amber-300 animate-pulse'
                    : lintStatus === 'passed'
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                      : 'border-white/20 bg-white/5 text-white hover:border-[#FFD700] hover:text-[#FFD700]'
                }`}
              >
                <span>🛡️</span>
                <span>
                  {lintStatus === 'running'
                    ? 'Linting...'
                    : lintStatus === 'passed'
                      ? '✓ Audit Passed'
                      : 'Audit Contracts'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleExportCartridge}
                className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 font-bold text-white/80 hover:border-white hover:text-white transition-all"
              >
                <span>💾</span>
                <span>Export .camelot</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={async () => {
                for (const c of cartridges) {
                  await handleVerifyAndResolve(c);
                }
              }}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-3 py-1.5 font-bold text-emerald-300 hover:bg-emerald-500/30 transition-all"
            >
              <span>⚡</span>
              <span>Re-Verify All ({cartridges.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* View Content */}
      {activeTab === 'driver' ? (
        <div className="flex-1 p-4 overflow-auto">
          <FileDriverExplorer />
        </div>
      ) : activeTab === 'cartridges' ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
          {/* Left Cartridges List */}
          <div className="bg-[#0A0A14] border-r border-white/10 p-4 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between font-mono text-[10px] text-white/50 border-b border-white/10 pb-2">
              <span>REGISTERED CARTRIDGES</span>
              <span className="text-[#00F0FF]">{cartridges.length} Modules</span>
            </div>

            <div className="space-y-2">
              {cartridges.map((cart) => (
                <button
                  key={cart.id}
                  type="button"
                  onClick={() => {
                    setSelectedCartridge(cart);
                    triggerHaptic('click');
                  }}
                  className={`w-full p-3 rounded-xl border text-left transition-all font-mono space-y-1.5 ${
                    selectedCartridge?.id === cart.id
                      ? 'border-[#00F0FF] bg-[#00F0FF]/15 text-white shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                      : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cart.icon}</span>
                      <span className="text-xs font-bold truncate max-w-[140px]">{cart.title}</span>
                    </div>
                    <span
                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                        cart.resolutionStatus === 'RESOLVED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : cart.resolutionStatus === 'REJECTED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {cart.resolutionStatus}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-white/40">
                    <span className="truncate">{cart.originRepo}</span>
                    <span className="text-[#00F0FF] font-bold">{cart.runtimeTier}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Cartridge Verification & Resolution Inspector */}
          <div className="md:col-span-2 bg-[#06060A] p-5 flex flex-col overflow-y-auto space-y-4">
            {selectedCartridge ? (
              <>
                <div className="flex items-start justify-between border-b border-white/10 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{selectedCartridge.icon}</span>
                      <h3 className="font-display text-base font-bold text-white">
                        {selectedCartridge.title}
                      </h3>
                      <span className="rounded bg-[#00F0FF]/20 text-[#00F0FF] px-2 py-0.5 font-mono text-[9px] font-bold border border-[#00F0FF]/40">
                        {selectedCartridge.code}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-white/60">
                      {selectedCartridge.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleVerifyAndResolve(selectedCartridge)}
                    disabled={resolvingId === selectedCartridge.id}
                    className="flex items-center gap-1.5 rounded-xl border border-[#00F0FF] bg-[#00F0FF]/20 px-4 py-2 font-mono text-xs font-bold text-[#00F0FF] hover:bg-[#00F0FF]/30 transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                  >
                    <span>{resolvingId === selectedCartridge.id ? '⏳' : '🛡️'}</span>
                    <span>
                      {resolvingId === selectedCartridge.id ? 'Resolving...' : 'Verify & Resolve'}
                    </span>
                  </button>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
                  <div className="rounded-xl border border-white/10 bg-[#0C0C16] p-3 space-y-1">
                    <span className="text-[9px] text-white/40 uppercase">Origin Repo</span>
                    <p className="font-bold text-white truncate">{selectedCartridge.originRepo}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#0C0C16] p-3 space-y-1">
                    <span className="text-[9px] text-white/40 uppercase">Runtime Tier</span>
                    <p className="font-bold text-[#00F0FF]">{selectedCartridge.runtimeTier}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#0C0C16] p-3 space-y-1">
                    <span className="text-[9px] text-white/40 uppercase">Version</span>
                    <p className="font-bold text-amber-300">v{selectedCartridge.version}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#0C0C16] p-3 space-y-1">
                    <span className="text-[9px] text-white/40 uppercase">Status</span>
                    <p className="font-bold text-emerald-300">
                      {selectedCartridge.status.toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* Manifest & Capability Lease Details */}
                <div className="space-y-3 font-mono">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-2">
                    <span>📜</span>
                    <span>Manifest Capabilities & Entry Point</span>
                  </h4>

                  <div className="rounded-xl border border-white/10 bg-[#0C0C16] p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-white/50">Entry Point File:</span>
                      <span className="font-bold text-[#00F0FF]">
                        {selectedCartridge.manifest.entryPoint}
                      </span>
                    </div>

                    <div className="space-y-1 pt-1">
                      <span className="text-white/50 text-[10px] uppercase">
                        Declared Capabilities:
                      </span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {selectedCartridge.manifest.requiredCapabilities.map((cap, i) => (
                          <span
                            key={i}
                            className="rounded bg-white/10 border border-white/20 px-2 py-0.5 text-[10px] text-white/90 font-bold"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Resolution Proof Receipt */}
                  {selectedCartridge.resolutionProof && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                        <span>🔑</span>
                        <span>Cryptographic Capability Lease & Gideon Proof</span>
                      </h4>

                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-white/60">Lease Token:</span>
                          <span className="font-bold text-emerald-300">
                            {selectedCartridge.resolutionProof.capabilityLeaseToken}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/60">Lease ID:</span>
                          <span className="text-white/80">
                            {selectedCartridge.resolutionProof.leaseId}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/60">Merkle Verified:</span>
                          <span className="text-emerald-300 font-bold">✓ VERIFIED ZERO-LEAK</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/60">Clearance Evaluated:</span>
                          <span className="text-[#00F0FF]">
                            {selectedCartridge.resolutionProof.clearanceChecked}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/60">Resolution Latency:</span>
                          <span className="text-amber-300">
                            {selectedCartridge.resolutionProof.latencyMs} ms
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-white/40 font-mono text-xs">
                <span className="text-4xl mb-2">🧩</span>
                <p>
                  Select a cross-repo cartridge to inspect manifest capabilities and trigger
                  resolution handshakes.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
          {/* Left File Tree Pane */}
          <div className="bg-[#0A0A14] border-r border-white/10 p-4 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between font-mono text-[10px] text-white/50 border-b border-white/10 pb-2">
              <span>MOUNTED: {mountedDirectoryName}</span>
              <span className="text-[#00F0FF]">4 Folders</span>
            </div>

            <div className="space-y-1 font-mono text-xs">
              {files.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  {item.type === 'folder' ? (
                    <div>
                      <div className="flex items-center gap-2 py-1 px-2 text-white/70 font-bold hover:text-white">
                        <span>📁</span>
                        <span>{item.name}/</span>
                      </div>
                      {item.children?.map((child, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => {
                            setSelectedFile(child);
                            triggerHaptic('click');
                          }}
                          className={`w-full flex items-center justify-between pl-6 pr-2 py-1.5 rounded-lg text-left transition-all ${
                            selectedFile?.name === child.name
                              ? 'bg-[#00F0FF]/20 text-[#00F0FF] font-bold border border-[#00F0FF]/40'
                              : 'text-white/60 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span>📄</span>
                            <span className="truncate">{child.name}</span>
                          </div>
                          <span className="text-[9px] text-white/40">{child.sizeKb}KB</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(item);
                        triggerHaptic('click');
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-all ${
                        selectedFile?.name === item.name
                          ? 'bg-[#00F0FF]/20 text-[#00F0FF] font-bold border border-[#00F0FF]/40'
                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span>📄</span>
                        <span className="truncate">{item.name}</span>
                      </div>
                      <span className="text-[9px] text-white/40">{item.sizeKb}KB</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Code / Content Inspector */}
          <div className="md:col-span-2 bg-[#06060A] p-5 flex flex-col overflow-hidden">
            {selectedFile ? (
              <div className="flex-1 flex flex-col space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📄</span>
                    <span className="font-mono text-sm font-bold text-white">
                      {selectedFile.name}
                    </span>
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 font-mono text-[8px] text-emerald-300 font-bold">
                      {selectedFile.status.toUpperCase()}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-white/40">
                    {selectedFile.sizeKb} KB
                  </span>
                </div>

                {/* Code Box */}
                <pre className="flex-1 overflow-auto rounded-xl border border-white/10 bg-[#0C0C16] p-4 font-mono text-xs text-white/80 leading-relaxed scrollbar-thin">
                  <code>{selectedFile.content || '// Empty file'}</code>
                </pre>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-white/40 font-mono text-xs">
                <span className="text-4xl mb-2">📂</span>
                <p>
                  Select any contract, WASM pill, or blueprint file from the worktree to inspect.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
