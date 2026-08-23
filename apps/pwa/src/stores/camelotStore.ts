import { create } from 'zustand';

export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking';
export type AvatarType = 'Knight_Cyber' | 'Knight_Arcane' | 'Knight_Data';
export type GovernorMode = 'normal' | 'constrained' | 'preservation';
export type ReceiptStatus = 'verified' | 'pending' | 'failed';
export type IntentRune = '🛡️' | '🗡️' | '📜' | '⚙️' | '✨';

export interface GideonReceipt {
  id: string;
  timestamp: string;
  action: string;
  status: ReceiptStatus;
  capabilityLease: string;
  excaliburSignature: string;
  hash: string;
  payload: Record<string, unknown>;
  latencyMs: number;
}

export interface AvatarSession {
  tenantId: string;
  tenantHandle: string;
  activeCartridgeId: string;
  avatarType: AvatarType;
  state: AvatarState;
  transcriptStream: string;
  viseme: number;
  isUnlocked: boolean;
  isPttActive: boolean;
}

export interface IntentProposal {
  rawText: string;
  rune: IntentRune;
  status: 'idle' | 'proposing' | 'evaluated' | 'bound';
  lastEvaluatedAt?: string;
}

export interface ResourceGovernorState {
  mode: GovernorMode;
  ramUsagePercent: number;
  cpuUsagePercent: number;
  latencyMs: number;
  webGlEnabled: boolean;
  particlesEnabled: boolean;
}

export interface CamelotState {
  // 1. Avatar Session
  avatarSession: AvatarSession;

  // 2. Audio Clock & Heartbeat
  audioClock: number;

  // 3. Gideon Receipt Stream
  receiptFeed: GideonReceipt[];
  selectedReceipt: GideonReceipt | null;
  receiptFilter: 'all' | 'verified' | 'pending' | 'failed';

  // 4. Intent Input & Proposal State
  intentProposal: IntentProposal;

  // 5. Resource Governor
  resourceGovernor: ResourceGovernorState;

  // 6. Global UI Shell Preferences
  activeView: 'roundtable' | 'worldtree' | 'avatars' | 'config' | 'vault';
  highContrast: boolean;

  // --- Actions ---
  // Avatar Session Actions
  setAvatarState: (state: AvatarState) => void;
  setAvatarType: (avatarType: AvatarType) => void;
  setTenantSession: (tenantId: string, tenantHandle: string) => void;
  setActiveCartridgeId: (cartridgeId: string) => void;
  setTranscriptStream: (stream: string) => void;
  setViseme: (viseme: number) => void;
  setUnlocked: (unlocked: boolean) => void;
  setPttActive: (active: boolean) => void;

  // Audio Clock Actions
  setAudioClock: (clock: number) => void;
  tickAudioClock: (delta?: number) => void;

  // Gideon Receipt Actions
  addReceipt: (receipt: GideonReceipt) => void;
  updateReceiptStatus: (id: string, status: ReceiptStatus) => void;
  setSelectedReceipt: (receipt: GideonReceipt | null) => void;
  setReceiptFilter: (filter: 'all' | 'verified' | 'pending' | 'failed') => void;
  clearReceipts: () => void;

  // Intent Actions
  setIntentText: (text: string) => void;
  submitIntentProposal: (query: string) => GideonReceipt;

  // Resource Governor Actions
  updateGovernorMetrics: (ram: number, cpu: number, latency: number) => void;
  setGovernorMode: (mode: GovernorMode) => void;
  purgeEphemeralCache: () => void;

  // Shell Navigation & Compliance Actions
  setActiveView: (view: 'roundtable' | 'worldtree' | 'avatars' | 'config' | 'vault') => void;
  setHighContrast: (enabled: boolean) => void;
}

// Initial Seed Receipts
const SEED_RECEIPTS: GideonReceipt[] = [
  {
    id: 'rcpt-019a-excalibur',
    timestamp: '19:25:01.104',
    action: 'CAP_HSM_CHACHA20_LEASE',
    status: 'verified',
    capabilityLease: 'urn:camelot:lease:tenant:hsm:write',
    excaliburSignature: '0x8f2a...c4b9_sig_excalibur_v1.7',
    hash: '0x99fbc18402ac...e771',
    latencyMs: 14,
    payload: {
      tenant: 'Vizion711',
      zone: 'Zone_0_Observer',
      enclave: 'Lakisha_Voice_OS',
      cipher: 'NO_STD_CHACHA20_POLY1305',
    },
  },
  {
    id: 'rcpt-019b-bifrost',
    timestamp: '19:25:15.820',
    action: 'BIFROST_WEBRTC_FRAME_AUDIO',
    status: 'verified',
    capabilityLease: 'urn:camelot:lease:audio:viseme:stream',
    excaliburSignature: '0x4c1e...99da_sig_bifrost_v4',
    hash: '0x32eef01198aa...b109',
    latencyMs: 17,
    payload: {
      clock: 104520,
      channels: 2,
      codec: 'opus/48000',
      vadState: 'active_speech',
    },
  },
  {
    id: 'rcpt-019c-gideon',
    timestamp: '19:25:40.012',
    action: 'GIDEON_CONSENT_ATTESTATION',
    status: 'pending',
    capabilityLease: 'urn:camelot:lease:governance:bind',
    excaliburSignature: '0x0000...pending_gideon_attestation',
    hash: '0x77fa88be...2110',
    latencyMs: 29,
    payload: {
      action: 'BIND_CONSENT_POLICY',
      target: 'WorldTree_Root_Partition',
      quorum: '3_of_5_Knights',
    },
  },
];

// Helper to determine rune from text prefix
function deriveIntentRune(text: string): IntentRune {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) return '🛡️';
  if (trimmed.startsWith('sync') || trimmed.startsWith('update')) return '🛡️';
  if (trimmed.startsWith('query') || trimmed.startsWith('find') || trimmed.startsWith('search'))
    return '🗡️';
  if (trimmed.startsWith('approve') || trimmed.startsWith('bind') || trimmed.startsWith('consent'))
    return '📜';
  if (trimmed.startsWith('build') || trimmed.startsWith('deploy') || trimmed.startsWith('run'))
    return '⚙️';
  return '✨';
}

// BroadcastChannel for cross-context / worker synchronization if supported
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('camelot_os_sync');
  } catch (err) {
    console.warn('[camelotStore] BroadcastChannel initialization skipped:', err);
  }
}

export const useCamelotStore = create<CamelotState>((set, get) => ({
  // 1. Initial Avatar Session
  avatarSession: {
    tenantId: 'tenant-primary',
    tenantHandle: 'Vizion711',
    activeCartridgeId: 'cartridge-kba-voice',
    avatarType: 'Knight_Cyber',
    state: 'idle',
    transcriptStream: 'Sovereign Enclave standing by. Voice OS & Gideon verification active.',
    viseme: 0,
    isUnlocked: true,
    isPttActive: false,
  },

  // 2. Initial Audio Clock
  audioClock: 0,

  // 3. Initial Receipt Stream
  receiptFeed: SEED_RECEIPTS,
  selectedReceipt: null,
  receiptFilter: 'all',

  // 4. Initial Intent Proposal
  intentProposal: {
    rawText: '',
    rune: '🛡️',
    status: 'idle',
  },

  // 5. Initial Resource Governor
  resourceGovernor: {
    mode: 'normal',
    ramUsagePercent: 48,
    cpuUsagePercent: 22,
    latencyMs: 16,
    webGlEnabled: true,
    particlesEnabled: true,
  },

  // 6. UI Shell Preferences
  activeView: 'roundtable',
  highContrast: false,

  // --- Actions ---

  setAvatarState: (state) =>
    set((prev) => {
      const updated = { ...prev.avatarSession, state };
      broadcastChannel?.postMessage({ type: 'AVATAR_STATE', state, clock: prev.audioClock });
      return { avatarSession: updated };
    }),

  setAvatarType: (avatarType) =>
    set((prev) => {
      const updated = { ...prev.avatarSession, avatarType };
      broadcastChannel?.postMessage({ type: 'AVATAR_TYPE', avatarType });
      return { avatarSession: updated };
    }),

  setTenantSession: (tenantId, tenantHandle) =>
    set((prev) => ({
      avatarSession: { ...prev.avatarSession, tenantId, tenantHandle },
    })),

  setActiveCartridgeId: (activeCartridgeId) =>
    set((prev) => ({
      avatarSession: { ...prev.avatarSession, activeCartridgeId },
    })),

  setTranscriptStream: (transcriptStream) =>
    set((prev) => ({
      avatarSession: { ...prev.avatarSession, transcriptStream },
    })),

  setViseme: (viseme) =>
    set((prev) => ({
      avatarSession: { ...prev.avatarSession, viseme },
    })),

  setUnlocked: (isUnlocked) =>
    set((prev) => ({
      avatarSession: { ...prev.avatarSession, isUnlocked },
    })),

  setPttActive: (isPttActive) =>
    set((prev) => ({
      avatarSession: { ...prev.avatarSession, isPttActive },
    })),

  setAudioClock: (audioClock) =>
    set(() => {
      broadcastChannel?.postMessage({ type: 'AUDIO_CLOCK', audioClock });
      return { audioClock };
    }),

  tickAudioClock: (delta = 1) =>
    set((prev) => {
      const next = (prev.audioClock + delta) % 1000000;
      return { audioClock: next };
    }),

  addReceipt: (receipt) =>
    set((prev) => ({
      receiptFeed: [receipt, ...prev.receiptFeed],
    })),

  updateReceiptStatus: (id, status) =>
    set((prev) => ({
      receiptFeed: prev.receiptFeed.map((r) => (r.id === id ? { ...r, status } : r)),
    })),

  setSelectedReceipt: (selectedReceipt) => set({ selectedReceipt }),

  setReceiptFilter: (receiptFilter) => set({ receiptFilter }),

  clearReceipts: () => set({ receiptFeed: [] }),

  setIntentText: (rawText) =>
    set(() => ({
      intentProposal: {
        rawText,
        rune: deriveIntentRune(rawText),
        status: 'idle',
      },
    })),

  submitIntentProposal: (query) => {
    const state = get();
    const rune = deriveIntentRune(query);
    const id = `rcpt-${Date.now().toString(36)}`;
    const newReceipt: GideonReceipt = {
      id,
      timestamp: new Date().toLocaleTimeString(),
      action: `INTENT_PROPOSAL_${rune === '🗡️' ? 'QUERY' : rune === '📜' ? 'CONSENT' : 'SYNC'}`,
      status: 'pending',
      capabilityLease: 'urn:camelot:lease:intent:proposal',
      excaliburSignature:
        '0x' +
        Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      hash:
        '0x' +
        Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      latencyMs: Math.round(14 + Math.random() * 16),
      payload: {
        rawIntent: query,
        rune,
        tenant: state.avatarSession.tenantHandle,
        audioClockTick: state.audioClock,
      },
    };

    set((prev) => ({
      receiptFeed: [newReceipt, ...prev.receiptFeed],
      intentProposal: {
        rawText: '',
        rune: '🛡️',
        status: 'proposing',
        lastEvaluatedAt: new Date().toISOString(),
      },
      avatarSession: {
        ...prev.avatarSession,
        state: 'thinking',
        transcriptStream: `Evaluating proposal: "${query}" through Sentinel & Gideon verification...`,
      },
    }));

    // Auto-resolve pending receipt after simulated evaluation
    setTimeout(() => {
      const currentState = get();
      currentState.updateReceiptStatus(id, 'verified');
      set((prev) => ({
        avatarSession: {
          ...prev.avatarSession,
          state: 'speaking',
          transcriptStream: `Proposal verified: "${query}" bound to capability lease.`,
        },
      }));
      setTimeout(() => {
        set((prev) => ({
          avatarSession: {
            ...prev.avatarSession,
            state: 'idle',
          },
        }));
      }, 3000);
    }, 1200);

    return newReceipt;
  },

  updateGovernorMetrics: (ramUsagePercent, cpuUsagePercent, latencyMs) =>
    set((prev) => {
      let mode: GovernorMode = 'normal';
      let webGlEnabled = true;
      let particlesEnabled = true;

      if (ramUsagePercent >= 92) {
        mode = 'preservation';
        webGlEnabled = false;
        particlesEnabled = false;
      } else if (ramUsagePercent >= 85) {
        mode = 'constrained';
        webGlEnabled = false;
        particlesEnabled = true;
      }

      return {
        resourceGovernor: {
          mode,
          ramUsagePercent,
          cpuUsagePercent,
          latencyMs,
          webGlEnabled,
          particlesEnabled,
        },
      };
    }),

  setGovernorMode: (mode) =>
    set((prev) => ({
      resourceGovernor: {
        ...prev.resourceGovernor,
        mode,
        webGlEnabled: mode === 'normal',
        particlesEnabled: mode !== 'preservation',
      },
    })),

  purgeEphemeralCache: () =>
    set((prev) => ({
      resourceGovernor: {
        ...prev.resourceGovernor,
        mode: 'normal',
        ramUsagePercent: 54,
        webGlEnabled: true,
        particlesEnabled: true,
      },
    })),

  setActiveView: (activeView) => set({ activeView }),

  setHighContrast: (highContrast) => set({ highContrast }),
}));
