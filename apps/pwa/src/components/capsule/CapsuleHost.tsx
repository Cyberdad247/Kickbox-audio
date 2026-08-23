'use client';
import React from 'react';
import { useBifrost } from '../../context/BifrostContext';
import { useMacros } from '../../context/MacroContext';
import { useTenant } from '../../context/TenantContext';
import { useBackgroundSync } from '../../hooks/useBackgroundSync';
import { useCapsuleState } from '../../hooks/useCapsuleState';
import { useHardwareCompatibility } from '../../hooks/useHardwareCompatibility';
import { usePiPAndBadging } from '../../hooks/usePiPAndBadging';
import { LakishaHUD } from '../LakishaHUD';
import { OODADiagnosticVisualizer } from '../dashboard/OODADiagnosticVisualizer';
import { TenantQuickBar } from '../gateway/TenantQuickBar';
import { GmailNotificationStream } from '../gmail/GmailNotificationStream';
import { CommandPalette } from '../navigation/CommandPalette';
import { CamelotHelperChat } from './CamelotHelperChat';
import { MobileEdgeArchitectureView } from './MobileEdgeArchitectureView';
import { RunicConsole } from './RunicConsole';
import { ProvenanceLedgerService } from '../../lib/provenanceLedger';

// Lazily load tab partitions to reduce initial bundle size and speed up FCP
const Dashboard = React.lazy(() => import('../Dashboard').then((m) => ({ default: m.Dashboard })));
const OfflineLandingView = React.lazy(() =>
  import('../gateway/OfflineLandingView').then((m) => ({ default: m.OfflineLandingView })),
);
const AssimilationKernelView = React.lazy(() =>
  import('./AssimilationKernelView').then((m) => ({ default: m.AssimilationKernelView })),
);
const AvatarKnightScreen = React.lazy(() =>
  import('./AvatarKnightScreen').then((m) => ({ default: m.AvatarKnightScreen })),
);
const BifrostBridgeNexusView = React.lazy(() =>
  import('./BifrostBridgeNexusView').then((m) => ({ default: m.BifrostBridgeNexusView })),
);
const LocalWorkspaceManager = React.lazy(() =>
  import('./LocalWorkspaceManager').then((m) => ({ default: m.LocalWorkspaceManager })),
);
const SovereignCinematicFlow = React.lazy(() =>
  import('./SovereignCinematicFlow').then((m) => ({ default: m.SovereignCinematicFlow })),
);
const TopologicalAgentCanvas = React.lazy(() =>
  import('./TopologicalAgentCanvas').then((m) => ({ default: m.TopologicalAgentCanvas })),
);
const VoiceMacroConfigPanel = React.lazy(() =>
  import('./VoiceMacroConfigPanel').then((m) => ({ default: m.VoiceMacroConfigPanel })),
);
const SettingsTab = React.lazy(() =>
  import('../tabs/SettingsTab').then((m) => ({ default: m.SettingsTab })),
);
const ActivityLogDisplay = React.lazy(() =>
  import('./ActivityLogDisplay').then((m) => ({ default: m.ActivityLogDisplay })),
);
const GoogleDriveExplorer = React.lazy(() =>
  import('../drive/GoogleDriveExplorer').then((m) => ({ default: m.GoogleDriveExplorer })),
);
const GoogleSheetsExplorer = React.lazy(() =>
  import('../drive/GoogleSheetsExplorer').then((m) => ({ default: m.GoogleSheetsExplorer })),
);
const GmailExplorer = React.lazy(() =>
  import('../gmail/GmailExplorer').then((m) => ({ default: m.GmailExplorer })),
);
const FileDriverExplorer = React.lazy(() =>
  import('./FileDriverExplorer').then((m) => ({ default: m.FileDriverExplorer })),
);

function WorkspacePartitionFallback() {
  return (
    <div className="flex h-full min-h-[300px] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
          Mounting MicroVM Partition...
        </span>
      </div>
    </div>
  );
}

export function CapsuleHost({ children }: { children?: React.ReactNode }) {
  const [isRunicConsoleOpen, setIsRunicConsoleOpen] = React.useState(false);
  const [runicHistory, setRunicHistory] = React.useState<LogEntry[]>([
    {
      id: 'init',
      type: 'system',
      text: 'Camelot-OS Runic Console v1000 initialized. Type //help to view Symbolects.',
      timestamp: new Date().toISOString(),
    },
  ]);

  const handleRunicExecute = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const addLog = (type: LogEntry['type'], text: string) => {
      setRunicHistory((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          type,
          text,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    addLog('input', trimmed);
    let outcomeText = '';
    let outcomeType: LogEntry['type'] = 'system';

    if (trimmed.startsWith('//')) {
      const symbolect = trimmed.toLowerCase();
      switch (symbolect) {
        case '//boot':
          outcomeText =
            '[ANYA_Ω] ⚡ Virtual Simulation Terminal instantiated. Hardware telemetry verified. Shared memory backplane mounted.';
          break;
        case '//shield':
          outcomeText = '[SIR_SENTINEL] 🛡️ AgentArmor engaged. Zero-trust sandbox isolation locked.';
          break;
        case '//verify':
          outcomeText =
            '[SIR_GIDEON] 🧪 Shadow VM crucible triggered. Validating TDD and executing Z3 formal logic proofs... [SAT]';
          break;
        case '//gate':
          outcomeText =
            '[MERLIN_Ω] ⚖️ Iron Gate invoked. Awaiting sovereign authorization... {👤✅}';
          break;
        case '//sync':
          outcomeText =
            '[LADY_MNEMOSYNE_Ω] 🌐 Broadcasting CRDT ledger updates across the Worldtree Cloudbrain (NotebookLM)... Synchronized.';
          break;
        case '//seal':
          outcomeText =
            '⚜️_SOVEREIGN_TRUTH: Master cryptographic transaction sealed. Deployment finalized.';
          outcomeType = 'success';
          break;
        case '//help':
          outcomeText =
            'Available Symbolects: //boot, //shield, //verify, //gate, //sync, //seal, //clear';
          break;
        case '//clear':
          setRunicHistory([]);
          ProvenanceLedgerService.record(trimmed, 'Console history cleared.');
          return;
        default:
          outcomeText = `Unknown Symbolect: ${trimmed}. Type //help for a list of available commands.`;
          outcomeType = 'error';
      }
    } else {
      outcomeText =
        'Error: Only Runic Symbolects (prefixed with //) are supported in this terminal.';
      outcomeType = 'error';
    }

    addLog(outcomeType, outcomeText);
    ProvenanceLedgerService.record(trimmed, outcomeText);
  };

  const { serverProjection, setConnectionState } = useCapsuleState();
  const { connected, isReconnecting } = useBifrost();
  const {
    pendingReceipts = [],
    isSyncing = false,
    triggerSync = () => {},
  } = useBackgroundSync() || {};
  const pendingCount = pendingReceipts.filter((r) => r.status === 'pending').length;
  const {
    activeTenant,
    activeCartridge,
    isKnightSwitchAllowed,
    mountCartridge,
    cartridges,
    openGateway,
    showAvatarKnightScreen,
    setShowAvatarKnightScreen,
  } = useTenant();

  const hw = useHardwareCompatibility();
  const { requestPiP } = usePiPAndBadging();
  const { isMacroModalOpen, toggleMacroModal } = useMacros();

  const [activeWorkspaceTab, setActiveWorkspaceTab] = React.useState<
    | 'cinematic'
    | 'avatar'
    | 'kernel'
    | 'dashboard'
    | 'drive'
    | 'sheets'
    | 'gmail'
    | 'filedriver'
    | 'macros'
    | 'offline'
    | 'topology'
    | 'worktree'
    | 'ephemeral'
    | 'bifrost'
    | 'settings'
    | 'activity'
    | 'ooda'
  >('cinematic');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);
  const [isLakishaHudOpen, setIsLakishaHudOpen] = React.useState(false);
  const [isDockOpen, setIsDockOpen] = React.useState(false);
  const [isLakishaMinimized, setIsLakishaMinimized] = React.useState(false);
  const [isLakishaMuted, setIsLakishaMuted] = React.useState(false);
  const [isLakishaCameraEnabled, setIsLakishaCameraEnabled] = React.useState(false);

  React.useEffect(() => {
    const handleLakishaMinimized = (e: Event) => {
      const customEvent = e as CustomEvent<{ minimized: boolean }>;
      setIsLakishaMinimized(customEvent.detail.minimized);
    };
    const handleLakishaMuted = (e: Event) => {
      const customEvent = e as CustomEvent<{ muted: boolean }>;
      setIsLakishaMuted(customEvent.detail.muted);
    };
    const handleLakishaCamera = (e: Event) => {
      const customEvent = e as CustomEvent<{ cameraEnabled: boolean }>;
      setIsLakishaCameraEnabled(customEvent.detail.cameraEnabled);
    };

    window.addEventListener('camelot:lakisha-minimized', handleLakishaMinimized);
    window.addEventListener('camelot:lakisha-muted-state', handleLakishaMuted);
    window.addEventListener('camelot:lakisha-camera-state', handleLakishaCamera);

    try {
      const dockPos = localStorage.getItem('camelot_lakeisha_hud_dock');
      if (dockPos === 'minimized-pill') {
        setIsLakishaMinimized(true);
      }
    } catch {}

    return () => {
      window.removeEventListener('camelot:lakisha-minimized', handleLakishaMinimized);
      window.removeEventListener('camelot:lakisha-muted-state', handleLakishaMuted);
      window.removeEventListener('camelot:lakisha-camera-state', handleLakishaCamera);
    };
  }, []);

  React.useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const target = customEvent.detail.toLowerCase();

      const workspaceTabs = [
        'cinematic',
        'avatar',
        'kernel',
        'dashboard',
        'macros',
        'offline',
        'topology',
        'worktree',
        'ephemeral',
        'bifrost',
        'settings',
        'activity',
      ];
      const dashboardTabs = [
        'overview',
        'knights',
        'properties',
        'streaming',
        'coffee',
        'venture',
        'vault',
        'activities',
      ];

      if (workspaceTabs.includes(target)) {
        setActiveWorkspaceTab(target as any);
      } else if (dashboardTabs.includes(target)) {
        setActiveWorkspaceTab('dashboard');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('koa:navigate_tab', { detail: target }));
        }, 50);
      }
    };
    window.addEventListener('koa:navigate_tab', handleNavigate);
    return () => window.removeEventListener('koa:navigate_tab', handleNavigate);
  }, []);

  const [dockTabExpanded, setDockTabExpanded] = React.useState({
    bifrost: true,
    avatar: true,
    macros: true,
    ephemeral: true,
    lakisha_hud: false,
  });

  React.useEffect(() => {
    try {
      const savedActiveTab = localStorage.getItem('camelot_active_workspace_tab');
      if (
        savedActiveTab &&
        [
          'cinematic',
          'avatar',
          'kernel',
          'dashboard',
          'drive',
          'filedriver',
          'macros',
          'offline',
          'topology',
          'worktree',
          'ephemeral',
          'bifrost',
          'settings',
          'activity',
        ].includes(savedActiveTab)
      ) {
        setActiveWorkspaceTab(savedActiveTab as any);
        if (savedActiveTab === 'avatar') {
          setShowAvatarKnightScreen(true);
        }
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem('camelot_active_workspace_tab', activeWorkspaceTab);
    } catch {}
  }, [activeWorkspaceTab]);

  const toggleDockTabExpanded = (tab: keyof typeof dockTabExpanded, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDockTabExpanded((prev) => ({ ...prev, [tab]: !prev[tab] }));
  };

  React.useEffect(() => {
    const handleOnline = () => setConnectionState('connected');
    const handleOffline = () => setConnectionState('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setConnectionState]);

  if (hw.tier === 'edge-mobile') {
    return <MobileEdgeArchitectureView />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-obsidian text-white/80 relative">
      {/* Hidden Cartridge Trigger */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-16 bg-white/5 border-r border-y border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors z-40 rounded-r-xl group"
        onMouseEnter={() => setIsDockOpen(true)}
        onClick={() => setIsDockOpen(true)}
        title="Open Cartridge Dock"
      >
        <span className="text-xl opacity-50 group-hover:opacity-100 transition-opacity">📼</span>
      </div>

      {/* Cartridge Dock (Sliding Overlay Rail) */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 flex w-64 flex-col items-stretch border-r border-gold/20 bg-smoke-900 py-6 px-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isDockOpen ? 'translate-x-0 shadow-[20px_0_50px_rgba(0,0,0,0.5)]' : '-translate-x-full'
        }`}
        onMouseLeave={() => setIsDockOpen(false)}
      >
        <div className="mb-4 px-2">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-xs uppercase tracking-[0.2em] text-gold">
              Cartridge Dock
            </h1>
            <button
              onClick={() => setIsDockOpen(false)}
              className="text-white/50 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="mt-1 text-[10px] text-white/40">
            Tenant: <strong className="text-white/80">{activeTenant?.handle}</strong>
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden pr-0.5">
          {/* Specific Cartridge Slots for Active Tenant */}
          {cartridges?.map((cart) => {
            const isActive = cart.id === activeCartridge?.id;
            return (
              <div
                key={cart.id}
                onClick={() => mountCartridge(cart.id)}
                title={`${cart.title} (${cart.allowKnightSwitch ? 'Knight Switch Allowed' : 'Locked to Tenant'})`}
                className={`group relative flex cursor-pointer items-center rounded-xl border p-2.5 transform-gpu transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none active:scale-[0.97] ${
                  isActive
                    ? 'border-[#FFD700] bg-[#1a1230] shadow-[0_0_18px_rgba(255,215,0,0.3)] translate-x-1 scale-[1.02] animate-dock-snap'
                    : 'border-white/10 bg-[#120D22]/60 hover:border-white/30 hover:bg-[#120D22] hover:translate-x-1 hover:scale-[1.01]'
                }`}
              >
                <div
                  className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm transition-transform duration-300 group-hover:scale-105 ${
                    isActive
                      ? 'border-[#FFD700] bg-[#0D0B14] shadow-[0_0_8px_rgba(255,215,0,0.5)]'
                      : 'border-white/20 bg-black/40'
                  }`}
                >
                  <span>{cart.icon}</span>
                  {isActive && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  )}
                </div>
                <div className="flex flex-col ml-2.5 overflow-hidden">
                  <span
                    className={`font-display text-[11px] font-bold uppercase truncate transition-colors ${
                      isActive ? 'text-gold-light' : 'text-white/70 group-hover:text-white'
                    }`}
                  >
                    {cart.title}
                  </span>
                  <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider">
                    <span className="text-white/40">{cart.code}</span>
                    <span>·</span>
                    <span
                      className={
                        cart.allowKnightSwitch ? 'text-emerald-400 font-bold' : 'text-white/30'
                      }
                    >
                      {cart.allowKnightSwitch ? 'WEAVER' : 'LOCKED'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="mt-auto pt-3 border-t border-white/10 space-y-2">
            <div className="px-1 font-mono text-[9px] uppercase tracking-widest text-gold/60 flex items-center justify-between">
              <span>Governed Dock Tabs</span>
              <span className="text-[8px] text-white/30 lowercase">auto-persisted</span>
            </div>

            {/* Main Navigation Tabs */}

            <button
              type="button"
              onClick={() => {
                setShowAvatarKnightScreen(false);
                setActiveWorkspaceTab('cinematic');
                setIsDockOpen(false);
              }}
              className={`w-full flex items-center gap-2 rounded-xl border p-2.5 text-left font-mono text-[10px] uppercase tracking-wider transition-all ${
                activeWorkspaceTab === 'cinematic'
                  ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300 font-bold shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                  : 'border-white/10 bg-black/40 text-white/50 hover:text-emerald-300 hover:border-emerald-400/50'
              }`}
            >
              <span className="text-sm">🏰</span>
              <span className="font-bold">Living Workspace</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAvatarKnightScreen(false);
                setActiveWorkspaceTab('topology');
                setIsDockOpen(false);
              }}
              className={`w-full flex items-center gap-2 rounded-xl border p-2.5 text-left font-mono text-[10px] uppercase tracking-wider transition-all ${
                activeWorkspaceTab === 'topology'
                  ? 'border-[#9D4EDD] bg-[#9D4EDD]/20 text-[#9D4EDD] font-bold shadow-[0_0_15px_rgba(157,78,221,0.3)]'
                  : 'border-white/10 bg-black/40 text-white/50 hover:text-[#9D4EDD] hover:border-[#9D4EDD]/50'
              }`}
            >
              <span className="text-sm">🕸️</span>
              <span className="font-bold">Topology Graph</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAvatarKnightScreen(false);
                setActiveWorkspaceTab('kernel');
                setIsDockOpen(false);
              }}
              className={`w-full flex items-center gap-2 rounded-xl border p-2.5 text-left font-mono text-[10px] uppercase tracking-wider transition-all ${
                activeWorkspaceTab === 'kernel'
                  ? 'border-[#00F0FF] bg-[#00F0FF]/20 text-[#00F0FF] font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                  : 'border-white/10 bg-black/40 text-white/50 hover:text-[#00F0FF] hover:border-[#00F0FF]/50'
              }`}
            >
              <span className="text-sm">🧠</span>
              <span className="font-bold">Anya Kernel</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAvatarKnightScreen(false);
                setActiveWorkspaceTab('filedriver');
                setIsDockOpen(false);
              }}
              className={`w-full flex items-center gap-2 rounded-xl border p-2.5 text-left font-mono text-[10px] uppercase tracking-wider transition-all ${
                activeWorkspaceTab === 'filedriver'
                  ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300 font-bold shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                  : 'border-white/10 bg-black/40 text-white/50 hover:text-emerald-300 hover:border-emerald-400/50'
              }`}
            >
              <span className="text-sm">⚡</span>
              <span className="font-bold">File Driver Explorer</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAvatarKnightScreen(false);
                setActiveWorkspaceTab('worktree');
                setIsDockOpen(false);
              }}
              className={`w-full flex items-center gap-2 rounded-xl border p-2.5 text-left font-mono text-[10px] uppercase tracking-wider transition-all ${
                activeWorkspaceTab === 'worktree'
                  ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300 font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                  : 'border-white/10 bg-black/40 text-white/50 hover:text-cyan-300 hover:border-cyan-400/50'
              }`}
            >
              <span className="text-sm">📂</span>
              <span className="font-bold">Local Worktree</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAvatarKnightScreen(false);
                setActiveWorkspaceTab('drive');
                setIsDockOpen(false);
              }}
              className={`w-full flex items-center gap-2 rounded-xl border p-2.5 text-left font-mono text-[10px] uppercase tracking-wider transition-all ${
                activeWorkspaceTab === 'drive'
                  ? 'border-[#4285F4] bg-[#4285F4]/20 text-[#4285F4] font-bold shadow-[0_0_15px_rgba(66,133,244,0.3)]'
                  : 'border-white/10 bg-black/40 text-white/50 hover:text-[#4285F4] hover:border-[#4285F4]/50'
              }`}
            >
              <span className="text-sm">☁️</span>
              <span className="font-bold">Google Drive</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAvatarKnightScreen(false);
                setActiveWorkspaceTab('sheets');
                setIsDockOpen(false);
              }}
              className={`w-full flex items-center gap-2 rounded-xl border p-2.5 text-left font-mono text-[10px] uppercase tracking-wider transition-all ${
                activeWorkspaceTab === 'sheets'
                  ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300 font-bold shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                  : 'border-white/10 bg-black/40 text-white/50 hover:text-emerald-300 hover:border-emerald-400/50'
              }`}
            >
              <span className="text-sm">📊</span>
              <span className="font-bold">Google Sheets</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAvatarKnightScreen(false);
                setActiveWorkspaceTab('gmail');
                setIsDockOpen(false);
              }}
              className={`w-full flex items-center gap-2 rounded-xl border p-2.5 text-left font-mono text-[10px] uppercase tracking-wider transition-all ${
                activeWorkspaceTab === 'gmail'
                  ? 'border-red-500 bg-red-500/20 text-red-400 font-bold shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                  : 'border-white/10 bg-black/40 text-white/50 hover:text-red-400 hover:border-red-500/50'
              }`}
            >
              <span className="text-sm">📧</span>
              <span className="font-bold">Gmail</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAvatarKnightScreen(false);
                setActiveWorkspaceTab('dashboard');
                setIsDockOpen(false);
              }}
              className={`w-full flex items-center gap-2 rounded-xl border p-2.5 text-left font-mono text-[10px] uppercase tracking-wider transition-all ${
                activeWorkspaceTab === 'dashboard'
                  ? 'border-[#FFD700] bg-[#FFD700]/20 text-[#FFD700] font-bold shadow-[0_0_15px_rgba(255,215,0,0.3)]'
                  : 'border-white/10 bg-black/40 text-white/50 hover:text-[#FFD700] hover:border-[#FFD700]/50'
              }`}
            >
              <span className="text-sm">⚡</span>
              <span className="font-bold">Guest Sandbox / Services</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAvatarKnightScreen(false);
                setActiveWorkspaceTab('activity');
                setIsDockOpen(false);
              }}
              className={`w-full flex items-center gap-2 rounded-xl border p-2.5 text-left font-mono text-[10px] uppercase tracking-wider transition-all ${
                activeWorkspaceTab === 'activity'
                  ? 'border-gold-royal bg-gold/20 text-gold-light font-bold shadow-[0_0_15px_rgba(255,215,0,0.3)]'
                  : 'border-white/10 bg-black/40 text-white/50 hover:text-gold-light hover:border-gold/50'
              }`}
            >
              <span className="text-sm">📜</span>
              <span className="font-bold">Activity Ledger</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAvatarKnightScreen(false);
                setActiveWorkspaceTab('settings');
                setIsDockOpen(false);
              }}
              className={`w-full flex items-center gap-2 rounded-xl border p-2.5 text-left font-mono text-[10px] uppercase tracking-wider transition-all ${
                activeWorkspaceTab === 'settings'
                  ? 'border-[#FF5555] bg-[#FF5555]/20 text-[#FF5555] font-bold shadow-[0_0_15px_rgba(255,85,85,0.3)]'
                  : 'border-white/10 bg-black/40 text-white/50 hover:text-[#FF5555] hover:border-[#FF5555]/50'
              }`}
            >
              <span className="text-sm">⚙️</span>
              <span className="font-bold">Configurations</span>
            </button>
          </div>

          <div className="mt-auto border-t border-gold/20 p-6">
            <div className="flex h-12 items-center rounded-md border border-white/10 bg-smoke-800 px-4">
              <span className="text-[10px] uppercase tracking-widest text-white/40">
                Sovereign MicroVM partition active & verified.
              </span>
            </div>
          </div>
        </div>
        {/* Lakisha HUD Docked inside the Cartridge Drawer */}
        <div className="mt-auto border-t border-white/10 pt-4 pb-2">
          <div className="text-[10px] text-white/40 uppercase tracking-widest mb-3 px-2">
            Voice HUD
          </div>
          <LakishaHUD />
        </div>
      </aside>

      {/* Main Workspace Stage */}
      <main className="flex flex-1 flex-col overflow-hidden relative">
        <header className="flex h-16 shrink-0 items-center border-b border-white/10 bg-black/40 pr-6 pl-10 justify-between">
          <div className="flex flex-1 items-center gap-1 overflow-x-auto hide-scrollbar pl-2 pr-4 sm:gap-2">
            <span className="font-display text-xs uppercase tracking-[0.2em] text-white/40">
              {activeWorkspaceTab === 'bifrost'
                ? '🌉 Bifrost Bridge'
                : activeWorkspaceTab === 'avatar'
                  ? '🔒 Knights Governed'
                  : activeWorkspaceTab === 'macros'
                    ? '🎙️ Voice Macros'
                    : activeWorkspaceTab === 'ephemeral'
                      ? '⚡ Ephemeral Isolation VM'
                      : activeWorkspaceTab === 'cinematic'
                        ? '🏰 Living Workspace'
                        : activeWorkspaceTab === 'topology'
                          ? '🕸️ Topology Graph'
                          : activeWorkspaceTab === 'kernel'
                            ? '🧠 Anya Kernel'
                            : activeWorkspaceTab === 'worktree'
                              ? '📂 Local Worktree'
                              : activeWorkspaceTab === 'drive'
                                ? '☁️ Google Drive'
                                : activeWorkspaceTab === 'sheets'
                                  ? '📊 Google Sheets Enclave'
                                  : activeWorkspaceTab === 'gmail'
                                    ? '📧 Gmail Enclave'
                                    : activeWorkspaceTab === 'settings'
                                      ? '⚙️ System Configurations'
                                      : activeWorkspaceTab === 'activity'
                                        ? '📜 Sovereign Activity Ledger'
                                        : '⚡ Guest Sandbox'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Command Palette Button */}
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-[10px] text-white/70 hover:border-[#00F0FF] hover:text-[#00F0FF] transition-all"
              title="Open Command Palette (Cmd+K)"
            >
              <span>⚡</span>
              <span>Cmd+K</span>
            </button>

            {/* Offline Sync Reconciler Button */}
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={triggerSync}
                disabled={isSyncing}
                className="flex items-center gap-1 rounded border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 font-mono text-[9px] text-amber-300 hover:bg-amber-400/20 transition-all"
                title="Reconcile offline receipts with sovereign ledger"
              >
                <span className={isSyncing ? 'animate-spin' : ''}>🔄</span>
                <span>{isSyncing ? 'Syncing...' : `Sync (${pendingCount})`}</span>
              </button>
            )}

            {/* PiP Button */}
            <button
              type="button"
              onClick={requestPiP}
              className="hidden md:flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/50 hover:text-white transition-all"
              title="Picture-in-Picture Cockpit"
            >
              <span>🪟</span>
              <span>PiP</span>
            </button>

            <div className="flex items-center gap-1 rounded border border-white/10 bg-black/40 px-2 py-0.5 font-mono text-[9px] text-white/60">
              <span>HW:</span>
              <span className="text-[#00F0FF] font-bold">
                {hw.cpuCores}C/{hw.deviceMemoryGB}GB
              </span>
            </div>
            <TenantQuickBar />
            <div
              title={
                connected ? 'Bifrost Online' : isReconnecting ? 'Reconnecting' : 'Offline Mode'
              }
              className={`h-2 w-2 rounded-full transition-all ${
                connected
                  ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]'
                  : isReconnecting
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
              }`}
            />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 relative">
          <React.Suspense fallback={<WorkspacePartitionFallback />}>
            {activeWorkspaceTab === 'bifrost' ? (
              <BifrostBridgeNexusView />
            ) : activeWorkspaceTab === 'ephemeral' ? (
              <OfflineLandingView onContinueOffline={() => setActiveWorkspaceTab('dashboard')} />
            ) : activeWorkspaceTab === 'cinematic' ? (
              <SovereignCinematicFlow />
            ) : activeWorkspaceTab === 'topology' ? (
              <TopologicalAgentCanvas />
            ) : activeWorkspaceTab === 'kernel' ? (
              <AssimilationKernelView />
            ) : activeWorkspaceTab === 'worktree' ? (
              <LocalWorkspaceManager />
            ) : activeWorkspaceTab === 'filedriver' ? (
              <FileDriverExplorer />
            ) : activeWorkspaceTab === 'drive' ? (
              <GoogleDriveExplorer />
            ) : activeWorkspaceTab === 'sheets' ? (
              <GoogleSheetsExplorer />
            ) : activeWorkspaceTab === 'gmail' ? (
              <GmailExplorer />
            ) : activeWorkspaceTab === 'avatar' ? (
              <AvatarKnightScreen
                onEnterDashboard={() => {
                  setShowAvatarKnightScreen(false);
                  setActiveWorkspaceTab('dashboard');
                }}
              />
            ) : activeWorkspaceTab === 'macros' ? (
              <VoiceMacroConfigPanel />
            ) : activeWorkspaceTab === 'settings' ? (
              <div className="max-w-4xl mx-auto w-full">
                <div className="mb-6 flex items-center gap-3">
                  <span className="text-2xl">⚙️</span>
                  <h2 className="font-display text-2xl text-white">System Configurations</h2>
                </div>
                <SettingsTab />
              </div>
            ) : activeWorkspaceTab === 'activity' ? (
              <div className="max-w-6xl mx-auto w-full">
                <ActivityLogDisplay />
              </div>
            ) : activeWorkspaceTab === 'ooda' ? (
              <div className="max-w-7xl mx-auto w-full">
                <OODADiagnosticVisualizer floating={false} />
              </div>
            ) : (
              children || <Dashboard />
            )}
          </React.Suspense>
        </div>
      </main>

      {/* Sovereign OODA-MGV Loop Floating Diagnostic Widget (Top-Right HUD) */}
      <OODADiagnosticVisualizer
        floating={true}
        onOpenFullDashboard={() => {
          setActiveWorkspaceTab('dashboard');
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('koa:navigate_tab', { detail: 'OODA Loop' }));
          }, 50);
        }}
      />

      {/* 13-Year-Old Friendly Onboarding & Helper Chat Bubble */}
      <CamelotHelperChat />

      {/* Arthurian Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={(tab) => {
          if (tab === 'avatar') {
            setShowAvatarKnightScreen(true);
          } else {
            setShowAvatarKnightScreen(false);
          }
          setActiveWorkspaceTab(tab as any);
        }}
      />

      {/* Gmail Unread Notification Stream */}
      <GmailNotificationStream />

      {/* Runic Console Overlay */}
      <RunicConsole />
    </div>
  );
}
