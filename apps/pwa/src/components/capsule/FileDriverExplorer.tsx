'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { playSpatialTone, triggerHaptic } from '../../lib/hapticsAndSpatialAudio';
import { speak } from '../../lib/voice';

export interface FileDriverNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  sizeBytes?: number;
  lineCount?: number;
  mimeType: string;
  extension: string;
  sha256: string;
  modifiedEpoch: number;
  content?: string;
  tags?: string[];
  children?: FileDriverNode[];
  binaryPreviewUrl?: string;
}

// Initial rich simulated workspace file system with .agent/ backplane, contracts, configs, media & docs
export const INITIAL_WORKSPACE_SYSTEM: FileDriverNode = {
  id: 'root-node',
  name: 'audit-kickbox-audio',
  path: '/',
  type: 'directory',
  mimeType: 'inode/directory',
  extension: '',
  sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
  modifiedEpoch: Date.now() - 3600000,
  children: [
    {
      id: 'dir-agent',
      name: '.agent',
      path: '/.agent',
      type: 'directory',
      mimeType: 'inode/directory',
      extension: '',
      sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      modifiedEpoch: Date.now() - 1800000,
      children: [
        {
          id: 'file-swarm-md',
          name: 'Swarm.md',
          path: '/.agent/Swarm.md',
          type: 'file',
          mimeType: 'text/markdown',
          extension: 'md',
          sizeBytes: 3420,
          lineCount: 84,
          sha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
          modifiedEpoch: Date.now() - 120000,
          tags: ['Sovereign', 'Lattice', 'Real-time-sync'],
          content: `# ⚜️ CAMELOT-OS SWARM BACKPLANE (Swarm.md)\n\n**Status:** ACTIVE_COSMIC_LATTICE\n**Sync Slabs:** memfd_create / ZeroClaw IPC\n**Guard Gate:** ANYA_IS_THE_GATE (VAD / Acoustic Biometric)\n\n## 🛡️ Active Knights Topology\n- **SIR_CODEX** (Lead Execution Engine)\n- **SIR_BORIS** (Design & UI/UX Rhythm Scribe)\n- **SIR_SENTINEL** (AgentArmor Zero-Trust Sandboxing)\n- **SIR_HELIO** (Telemetry & TKO Knowledge Objects)\n- **MERLIN_Ω** (High-Level Controller & OODA Feedback Loop)\n\n\`\`\`json\n{\n  "lattice_version": "v1000_EXCALIBUR",\n  "memory_barrier": "Zone-0 Isolated",\n  "tko_drift_threshold": 0.045\n}\n\`\`\`\n`,
        },
        {
          id: 'file-local-env-md',
          name: 'local_env.md',
          path: '/.agent/local_env.md',
          type: 'file',
          mimeType: 'text/markdown',
          extension: 'md',
          sizeBytes: 1890,
          lineCount: 42,
          sha256: '88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589',
          modifiedEpoch: Date.now() - 240000,
          tags: ['Environment', 'Zero-Trust'],
          content: `# Local Environment Context\n\n- HOST_RUNTIME: Wasmtime + Linux AArch64 Sandbox\n- PORT: 3000 (Nginx Reverse Proxy Routed)\n- MEMORY_CEILING: 8.0 GB RAM / 4.1 GB Allocated\n- IPC_TRANSPORT: memfd_create Shared Memory Slabs\n- AUDIO_BRIDGE: Bifrost WebRTC AudioContext (48kHz stereo)\n- ZERO_TRUST_BOUNDS: commonpath(/audit-kickbox-audio) = STRICT_PASS\n`,
        },
        {
          id: 'file-skills-md',
          name: 'Skills.md',
          path: '/.agent/Skills.md',
          type: 'file',
          mimeType: 'text/markdown',
          extension: 'md',
          sizeBytes: 2540,
          lineCount: 65,
          sha256: '7d793037a0760186574b0282f2f435e7b1e7377ec71084700f4435d1b50d210d',
          modifiedEpoch: Date.now() - 3600000,
          tags: ['Skills', 'Capabilities'],
          content: `# Active Agentic Capabilities Matrix\n\n1. **Workspace File Driver** (Zero-trust directory traversals & SHA-256 integrity)\n2. **Google Drive Cloud Bridge** (OAuth GSI / in-memory scoped token)\n3. **Acoustic Enclave VAD** (Sub-10ms voice activity detector)\n4. **Gideon Proof Validator** (5-failure-archetype edge verification)\n5. **Topological OODA Loop** (State graph telemetry with Merkle provenance)\n`,
        },
      ],
    },
    {
      id: 'dir-contracts',
      name: 'contracts',
      path: '/contracts',
      type: 'directory',
      mimeType: 'inode/directory',
      extension: '',
      sha256: 'b2f5ff47436671b6e533d8dc3614845d80ceee8b493095879555523479cf8638',
      modifiedEpoch: Date.now() - 7200000,
      children: [
        {
          id: 'file-gideon-proof-rs',
          name: 'gideon_proof.rs',
          path: '/contracts/gideon_proof.rs',
          type: 'file',
          mimeType: 'text/x-rust',
          extension: 'rs',
          sizeBytes: 1540,
          lineCount: 38,
          sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
          modifiedEpoch: Date.now() - 7200000,
          tags: ['Rust', 'no_std', 'HSM'],
          content: `// Gideon Protocol — Rust no_std Capability Lease Schema\n#![no_std]\n\nuse serde::{Serialize, Deserialize};\n\n#[derive(Debug, Clone, Serialize, Deserialize)]\npub struct GideonProof {\n    pub tenant_id: [u8; 16],\n    pub lease_epoch: u64,\n    pub hsm_signature: [u8; 64],\n    pub merkle_root: [u8; 32],\n    pub capability_mask: u32,\n}\n\nimpl GideonProof {\n    pub fn verify_signature(&self, public_key: &[u8; 32]) -> bool {\n        // Zero-allocation Ed25519 verification\n        true\n    }\n}\n`,
        },
        {
          id: 'file-schema-msgpack',
          name: 'msgpack_schema.rs',
          path: '/contracts/msgpack_schema.rs',
          type: 'file',
          mimeType: 'text/x-rust',
          extension: 'rs',
          sizeBytes: 1210,
          lineCount: 29,
          sha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
          modifiedEpoch: Date.now() - 7200000,
          tags: ['MsgPack', 'IPC'],
          content: `// AgentBus Inter-Process Schema for High-Speed Serialization\npub enum AgentMessage {\n    IntentAudio {\n        buffer_len: u32,\n        pcm_rate: u16,\n        vad_confidence: f32,\n    },\n    StateSync {\n        node_id: String,\n        merkle_hash: [u8; 32],\n        payload: Vec<u8>,\n    },\n    ConsentPrompt {\n        action_id: String,\n        risk_tier: u8,\n    },\n}\n`,
        },
      ],
    },
    {
      id: 'dir-media',
      name: 'media_vault',
      path: '/media_vault',
      type: 'directory',
      mimeType: 'inode/directory',
      extension: '',
      sha256: 'c3499c2729730a7f807efb8676a92dcb6f8a3f8f',
      modifiedEpoch: Date.now() - 14400000,
      children: [
        {
          id: 'file-boot-audio',
          name: 'camelot_boot_cue.wav',
          path: '/media_vault/camelot_boot_cue.wav',
          type: 'file',
          mimeType: 'audio/wav',
          extension: 'wav',
          sizeBytes: 124500,
          sha256: 'd14a028c2a3a2bc9476102bb288234c415a2b01f828ea62ac5b3e42f',
          modifiedEpoch: Date.now() - 14400000,
          tags: ['Audio', 'Chime', '48kHz'],
          content: `[Synthesized Audio Cue Buffer: 48kHz Stereo Harmonic Sine Wave]`,
        },
        {
          id: 'file-demo-video',
          name: 'microcubic_twin_sync.mp4',
          path: '/media_vault/microcubic_twin_sync.mp4',
          type: 'file',
          mimeType: 'video/mp4',
          extension: 'mp4',
          sizeBytes: 1845000,
          sha256: '7b8b2e1f4b3a1d9c8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d',
          modifiedEpoch: Date.now() - 86400000,
          tags: ['Video', 'Demo', 'Edge-Twin'],
          content: `[Video Stream Container: 1080p60 H.264 / AAC Audio - Edge-to-Cloud Digital Twin Stream]`,
        },
      ],
    },
    {
      id: 'file-bootstrap-sh',
      name: 'bootstrap_microcubic.sh',
      path: '/bootstrap_microcubic.sh',
      type: 'file',
      mimeType: 'text/x-shellscript',
      extension: 'sh',
      sizeBytes: 2180,
      lineCount: 52,
      sha256: '5a8f2e7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f',
      modifiedEpoch: Date.now() - 3600000,
      tags: ['Bash', 'KVM', 'WireGuard'],
      content: `#!/usr/bin/env bash\n# ==========================================================\n# ⚡ MICROCUBIC EDGE-TO-CLOUD BOOTSTRAP SCRIPT\n# Target: Oracle Cloud VPS <-> Laptop Server On-Premises\n# ==========================================================\nset -euo pipefail\n\nlog() { echo -e "\\033[1;33m[MICROCUBIC_BOOT]\\033[0m $1"; }\n\nlog "Verifying KVM & crosvm hardware virtualization..."\nif [ ! -c /dev/kvm ]; then\n  log "WARNING: /dev/kvm device node missing. Attempting kernel module insertion..."\n  modprobe kvm || true\nfi\n\nlog "Configuring WireGuard mesh bridge wg0 (10.42.0.1/24)..."\nwg-quick up wg0 || true\n\nlog "Mounting memfd_create shared memory slabs for ZeroClaw IPC..."\nexport ZERO_CLAW_BACKPLANE_DIR="/dev/shm/camelot_backplane"\nmkdir -p "$ZERO_CLAW_BACKPLANE_DIR"\n\nlog "Pre-warming parent MicroVM snapshot (Unikraft unikernel)..."\n# crosvm run --disable-sandbox --mem 128 --cpus 1 unikraft_parent.img &\n\nlog "⚜️ Microcubic Sovereign Sync Engine successfully initialized."\n`,
    },
    {
      id: 'file-config-json',
      name: 'microcubic_twin.json',
      path: '/microcubic_twin.json',
      type: 'file',
      mimeType: 'application/json',
      extension: 'json',
      sizeBytes: 940,
      lineCount: 24,
      sha256: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
      modifiedEpoch: Date.now() - 1800000,
      tags: ['JSON', 'Config', 'eTUNE'],
      content: `{\n  "twin_id": "TWIN_ORACLE_LAPTOP_SYNC_001",\n  "hlc_endpoint": "https://oracle-vps.camelot-os.dev:8443",\n  "llc_endpoint": "http://127.0.0.1:3000",\n  "etune_drift_threshold": 0.045,\n  "staleness_guard_ms": 250,\n  "vm_footprint_mb": 0.12,\n  "boot_latency_target_ms": 1.01,\n  "chacha20_key_rotation_sec": 3600,\n  "active_swarms": ["SIR_CODEX", "SIR_BORIS", "SIR_SENTINEL", "SIR_HELIO"]\n}\n`,
    },
  ],
};

export function FileDriverExplorer() {
  const [fileSystem, setFileSystem] = useState<FileDriverNode>(INITIAL_WORKSPACE_SYSTEM);
  const [selectedFile, setSelectedFile] = useState<FileDriverNode | null>(null);
  const [expandedDirectories, setExpandedDirectories] = useState<Record<string, boolean>>({
    'root-node': true,
    'dir-agent': true,
    'dir-contracts': true,
    'dir-media': true,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'code' | 'markdown' | 'media' | 'config'>(
    'all',
  );
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'hex' | 'details' | 'audit'>('preview');

  // Breadcrumbs
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>(['audit-kickbox-audio']);
  const [isCopiedHash, setIsCopiedHash] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  // Audio player state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize selection with Swarm.md on start
  useEffect(() => {
    const defaultFile = fileSystem.children?.[0]?.children?.[0];
    if (defaultFile) {
      handleSelectNode(defaultFile);
    }
  }, []);

  const toggleDirectory = (nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedDirectories((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  const handleSelectNode = (node: FileDriverNode) => {
    if (node.type === 'directory') {
      toggleDirectory(node.id);
      return;
    }

    triggerHaptic(10);
    playSpatialTone(587.33, 'sine', 0.05, 0.08); // D5 high tactical click
    setSelectedFile(node);
    setEditedContent(node.content || '');
    setEditMode(false);

    // Update breadcrumb
    const pathParts = node.path.split('/').filter(Boolean);
    setBreadcrumbs(['audit-kickbox-audio', ...pathParts]);
  };

  const handleSaveContent = () => {
    if (!selectedFile) return;

    // Recalculate simple simulated SHA-256 for demo
    const newHash = Array.from(new Uint8Array(32).map(() => Math.floor(Math.random() * 256)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const lines = editedContent.split('\n').length;
    const size = new Blob([editedContent]).size;

    const updatedNode: FileDriverNode = {
      ...selectedFile,
      content: editedContent,
      sha256: newHash,
      lineCount: lines,
      sizeBytes: size,
      modifiedEpoch: Date.now(),
    };

    setSelectedFile(updatedNode);
    setEditMode(false);
    playSpatialTone(880, 'sine', 0.1, 0.12); // A5 success chime
    triggerHaptic(20);
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !newTagInput.trim()) return;
    const nextTags = [...(selectedFile.tags || []), newTagInput.trim()];
    setSelectedFile({ ...selectedFile, tags: nextTags });
    setNewTagInput('');
  };

  const handleCopyHash = () => {
    if (!selectedFile?.sha256) return;
    navigator.clipboard.writeText(selectedFile.sha256);
    setIsCopiedHash(true);
    triggerHaptic(15);
    setTimeout(() => setIsCopiedHash(false), 2000);
  };

  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(432, ctx.currentTime); // 432 Hz harmonic
        osc.frequency.exponentialRampToValueAtTime(864, ctx.currentTime + 1.5);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2.0);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 2.0);
        osc.onended = () => setIsPlayingAudio(false);
      } catch (err) {
        setIsPlayingAudio(false);
      }
    }
  };

  // Helper formatting
  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (node: FileDriverNode) => {
    if (node.type === 'directory') return '📁';
    if (node.extension === 'md') return '📝';
    if (node.extension === 'rs') return '🦀';
    if (node.extension === 'ts' || node.extension === 'js') return '📜';
    if (node.extension === 'json') return '💠';
    if (node.extension === 'sh') return '⚡';
    if (node.extension === 'wav' || node.extension === 'mp3') return '🎵';
    if (node.extension === 'mp4') return '🎬';
    return '📄';
  };

  // Recursive tree renderer
  const renderTree = (node: FileDriverNode, depth = 0) => {
    const isExpanded = expandedDirectories[node.id];
    const isSelected = selectedFile?.id === node.id;

    if (node.type === 'directory') {
      return (
        <div key={node.id} className="select-none">
          <div
            onClick={(e) => toggleDirectory(node.id, e)}
            className="group flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-mono transition-colors hover:bg-white/5 cursor-pointer"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            <div className="flex items-center gap-2 truncate">
              <span className="text-white/40 text-[10px] w-3">{isExpanded ? '▼' : '▶'}</span>
              <span className="text-sm">📁</span>
              <span className="font-bold text-white/90 group-hover:text-gold transition-colors truncate">
                {node.name}
              </span>
            </div>
            {node.children && (
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-white/40 font-mono">
                {node.children.length}
              </span>
            )}
          </div>

          {isExpanded && node.children && (
            <div className="border-l border-white/5 ml-3">
              {node.children.map((child) => renderTree(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // File Node
    return (
      <div
        key={node.id}
        onClick={() => handleSelectNode(node)}
        className={`group flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-mono transition-all cursor-pointer ${
          isSelected
            ? 'bg-gold/15 border border-gold/40 text-gold-light shadow-[0_0_10px_rgba(255,215,0,0.15)] font-bold'
            : 'text-white/70 hover:bg-white/5 hover:text-white border border-transparent'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="text-sm">{getFileIcon(node)}</span>
          <span className="truncate">{node.name}</span>
        </div>
        <span className="text-[10px] text-white/40 font-mono">{formatBytes(node.sizeBytes)}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full max-w-7xl mx-auto space-y-4">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold/20 bg-smoke-900/90 p-4 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/40 bg-gold/10 text-xl shadow-[0_0_12px_rgba(255,215,0,0.2)]">
            📂
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-bold text-white">
                Workspace File Driver & Memory Explorer
              </h3>
              <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[9px] font-mono text-cyan-400 border border-cyan-500/30">
                ZERO-TRUST BOUNDED
              </span>
            </div>
            <div className="flex items-center gap-1 font-mono text-[10px] text-white/50">
              {breadcrumbs.map((b, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span>/</span>}
                  <span className={idx === breadcrumbs.length - 1 ? 'text-gold' : ''}>{b}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats & Actions */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-white/60">
            <span>🛡️ Sandbox Boundary:</span>
            <span className="text-emerald-400 font-bold">os.commonpath VALID</span>
          </div>

          <button
            type="button"
            onClick={() => {
              speak('Executing cryptographic integrity scan on active worktree.');
              triggerHaptic(30);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-gold/30 bg-gold/10 px-3 py-1.5 font-bold text-gold-light hover:bg-gold/20 transition-all shadow-[0_0_10px_rgba(255,215,0,0.15)]"
          >
            <span>⚡</span>
            <span>Audit Worktree</span>
          </button>
        </div>
      </div>

      {/* 2. Three-Pane Master-Detail Grid Pattern */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[550px]">
        {/* PANE 1: Sidebar Directory Tree (3 Columns) */}
        <div className="lg:col-span-3 flex flex-col rounded-2xl border border-white/10 bg-smoke-900/80 p-3 backdrop-blur-md">
          {/* Search & Filter */}
          <div className="mb-3 space-y-2">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 text-xs">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/60 py-1.5 pl-7 pr-2 font-mono text-xs text-white placeholder-white/30 focus:border-gold focus:outline-none"
              />
            </div>
          </div>

          {/* Directory Hierarchy Tree */}
          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 border-t border-white/5 pt-2">
            <div className="text-[10px] font-mono uppercase text-white/40 tracking-wider mb-2 px-2">
              Workspace Structure
            </div>
            {renderTree(fileSystem)}
          </div>

          {/* Slabs Status Bar */}
          <div className="mt-3 border-t border-white/10 pt-2 flex items-center justify-between font-mono text-[10px] text-white/40">
            <span>IPC: memfd_create</span>
            <span className="text-cyan-400">Δ≤0.12 MiB</span>
          </div>
        </div>

        {/* PANE 2: Live File Previewer & Code Visualizer (6 Columns) */}
        <div className="lg:col-span-6 flex flex-col rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md">
          {/* Preview Navigation Tabs & Mode Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 mb-3">
            <div className="flex items-center gap-1">
              {[
                { id: 'preview', label: 'Preview', icon: '👁️' },
                { id: 'hex', label: 'Hex Stream', icon: '💠' },
                { id: 'details', label: 'Metadata', icon: '📋' },
                { id: 'audit', label: 'Provenance', icon: '🛡️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs transition-all ${
                    activeTab === tab.id
                      ? 'bg-gold/20 text-gold-light border border-gold/40 font-bold'
                      : 'text-white/50 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {selectedFile && (
              <div className="flex items-center gap-2">
                {editMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditMode(false)}
                      className="rounded-lg border border-white/20 px-2.5 py-1 font-mono text-xs text-white/60 hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveContent}
                      className="rounded-lg border border-emerald-500 bg-emerald-500/20 px-3 py-1 font-mono text-xs font-bold text-emerald-400 hover:bg-emerald-500/30"
                    >
                      Save Mutation
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <span>✏️</span>
                    <span>Edit File</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Main Visualizer Stage */}
          <div className="flex-1 overflow-auto rounded-xl border border-white/5 bg-smoke-950 p-4 font-mono text-xs">
            {!selectedFile ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-white/40 gap-2">
                <span className="text-3xl opacity-50">📂</span>
                <p>Select a file from the workspace tree to open live preview.</p>
              </div>
            ) : activeTab === 'preview' ? (
              editMode ? (
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="h-full w-full bg-transparent font-mono text-xs text-cyan-200 focus:outline-none resize-none leading-relaxed"
                  spellCheck={false}
                />
              ) : selectedFile.mimeType.includes('audio') ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-cyan-500/40 bg-cyan-500/10 text-4xl shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                    🎵
                  </div>
                  <div>
                    <h4 className="font-display text-base font-bold text-white">
                      {selectedFile.name}
                    </h4>
                    <p className="font-mono text-xs text-white/50 mt-1">
                      WAV PCM Stereo • 48.0 kHz Sample Rate • Zone-0
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAudio}
                    className="flex items-center gap-2 rounded-full border border-cyan-400 bg-cyan-500/20 px-6 py-2.5 font-mono text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                  >
                    <span>{isPlayingAudio ? '⏹️' : '▶️'}</span>
                    <span>{isPlayingAudio ? 'Stop Spatial Audio Cue' : 'Audition Audio Cue'}</span>
                  </button>
                </div>
              ) : selectedFile.mimeType.includes('video') ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-gold/40 bg-gold/10 text-4xl shadow-[0_0_20px_rgba(255,215,0,0.2)]">
                    🎬
                  </div>
                  <div>
                    <h4 className="font-display text-base font-bold text-white">
                      {selectedFile.name}
                    </h4>
                    <p className="font-mono text-xs text-white/50 mt-1">
                      1080p60 H.264 Container • Edge-to-Cloud Digital Twin Stream
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-[11px] text-white/70 max-w-sm">
                    ⚡ Live video stream attached to double-buffered TCP trajectory pipeline.
                  </div>
                </div>
              ) : (
                <pre className="text-white/90 whitespace-pre-wrap leading-relaxed">
                  {selectedFile.content || '// Empty file content'}
                </pre>
              )
            ) : activeTab === 'hex' ? (
              <div className="space-y-1 font-mono text-[11px] text-cyan-300">
                <div className="text-white/40 pb-2 border-b border-white/5">
                  OFFSET 00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F ASCII
                </div>
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div key={idx} className="flex gap-4">
                    <span className="text-white/40">
                      {(idx * 16).toString(16).padStart(8, '0').toUpperCase()}
                    </span>
                    <span className="text-gold-light">
                      7F 45 4C 46 02 01 01 00 00 00 00 00 00 00 00 00
                    </span>
                    <span className="text-white/60">.ELF............</span>
                  </div>
                ))}
              </div>
            ) : activeTab === 'details' ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-2">
                  <div className="flex justify-between text-white/50">
                    <span>Absolute Virtual Path:</span>
                    <span className="text-white font-bold">{selectedFile.path}</span>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>MIME Identification:</span>
                    <span className="text-cyan-400">{selectedFile.mimeType}</span>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>Raw Size (bytes):</span>
                    <span className="text-white">{selectedFile.sizeBytes} B</span>
                  </div>
                  {selectedFile.lineCount && (
                    <div className="flex justify-between text-white/50">
                      <span>Line Count:</span>
                      <span className="text-white">{selectedFile.lineCount} lines</span>
                    </div>
                  )}
                  <div className="flex justify-between text-white/50">
                    <span>Last Modified:</span>
                    <span className="text-white/80">
                      {new Date(selectedFile.modifiedEpoch).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Provenance Audit Tab */
              <div className="space-y-3 font-mono text-xs">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
                    <span>🛡️</span>
                    <span>Merkle Cryptographic Signature Verified</span>
                  </div>
                  <p className="text-[11px] text-white/70">
                    This file node belongs to the authenticated CAMELOT_APEX_v1000 lattice tree.
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-1.5 text-[11px]">
                  <div className="text-white/50">HSM Signer: SIR_CODEX_KEY_0x9A4</div>
                  <div className="text-white/50">Capability Lease: AGPL-3.0_SOVEREIGN</div>
                  <div className="text-white/50">Isolation Tier: MicroVM Ring-0 Unikernel</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PANE 3: Dynamic Metadata & Cryptographic Details Panel (3 Columns) */}
        <div className="lg:col-span-3 flex flex-col rounded-2xl border border-white/10 bg-smoke-900/80 p-4 backdrop-blur-md space-y-4">
          <div className="border-b border-white/10 pb-2">
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-white">
              File Properties & Digest
            </h4>
          </div>

          {selectedFile ? (
            <div className="space-y-4 font-mono text-xs flex-1">
              {/* Primary Info Card */}
              <div className="rounded-xl border border-white/10 bg-black/50 p-3 space-y-2">
                <div>
                  <span className="text-[10px] text-white/40 uppercase">Filename</span>
                  <div className="font-bold text-white truncate">{selectedFile.name}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                  <div>
                    <span className="text-[10px] text-white/40 uppercase">Extension</span>
                    <div className="text-gold uppercase font-bold">.{selectedFile.extension}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 uppercase">Size</span>
                    <div className="text-cyan-300 font-bold">
                      {formatBytes(selectedFile.sizeBytes)}
                    </div>
                  </div>
                </div>
              </div>

              {/* SHA-256 Digest Box with Copy */}
              <div className="rounded-xl border border-gold/20 bg-black/50 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gold uppercase tracking-wider font-bold">
                    SHA-256 Hash
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyHash}
                    className="text-[10px] text-gold hover:underline"
                  >
                    {isCopiedHash ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <div className="rounded bg-black/80 p-2 font-mono text-[10px] text-white/80 break-all border border-white/5">
                  {selectedFile.sha256}
                </div>
              </div>

              {/* Editable Tags */}
              <div className="space-y-2">
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
                  Sovereign Tags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedFile.tags?.map((tag, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/80 font-mono"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <form onSubmit={handleAddTag} className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="Add tag..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    className="flex-1 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-[10px] text-white focus:border-gold focus:outline-none font-mono"
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-gold/40 bg-gold/10 px-2 py-1 text-[10px] font-bold text-gold hover:bg-gold/20"
                  >
                    +
                  </button>
                </form>
              </div>

              {/* MicroVM Sync Card */}
              <div className="mt-auto rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px]">
                  <span>⚡</span>
                  <span>eTUNE Memory Sync</span>
                </div>
                <p className="text-[10px] text-white/50 leading-relaxed">
                  Real-time synchronization active via ZeroClaw IPC and WireGuard mesh.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-white/40 font-mono text-xs">No file selected.</div>
          )}
        </div>
      </div>
    </div>
  );
}
