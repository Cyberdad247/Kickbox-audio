'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  TenantCartridge,
  TenantConfiguration,
  TenantProfile,
  WarpStage,
} from '../types/tenant';

const STORAGE_KEY_TENANTS = 'camelot_tenants_v4';
const STORAGE_KEY_ACTIVE = 'camelot_active_tenant_id_v4';
const STORAGE_KEY_AUTH = 'camelot_authenticated_v4';

export const DEFAULT_TENANTS: TenantProfile[] = [
  {
    id: 'vashon-arch',
    handle: 'VASHON_ARCH',
    name: 'Sovereign Arch-Architect',
    role: 'Human Sovereign Arch-Architect · Master Root Controller',
    tenantId: 'SOV-ARCH-01',
    clearance: 'SOVEREIGN_ARCH_ARCHITECT',
    controllerType: 'HUMAN_ARCH_ARCHITECT',
    humanVerified: true,
    email: 'Vizion711@gmail.com',
    memory: { used: 4.2, total: 8.0 },
    latency: '8ms',
    coreSync: 'OPTIMAL',
    avatar: '👑',
    sigilColor: '#FFD700',
    subAgents: [
      'Sir Boris (Tokens)',
      'Sir Codex (Kinetic)',
      'Lady APIs (ETL)',
      'Anya (Voice Engine)',
    ],
    cipher: 'NO_STD_CHACHA20_POLY1305_HSM',
    description:
      'Master human sovereign Arch-Architect with root hardware enclave clearance and full lattice orchestration authority.',
    lastActive: 'Active Now',
    configuration: {
      theme: 'gold-obsidian',
      activeCartridgeId: 'cart-arch-kernel',
      voicePersona: 'Lakisha',
      autoArmDefense: true,
      allowKnightSwitchOverride: true,
      customTokens: ['TOKEN_VASHON_ARCH', 'SIGIL_SOVEREIGN_ARCH_ARCHITECT'],
      cartridges: [
        {
          id: 'cart-arch-kernel',
          title: 'Sovereign Arch-Architect MicroVM Root Kernel',
          code: 'CART_ARCH_K99',
          category: 'SYSTEM',
          description:
            'Master hypervisor root kernel with unrestricted hardware enclave and referral gatekeeper authority.',
          allowKnightSwitch: false,
          icon: '👑',
          status: 'active',
          runtimeTier: 'Ring 0 Master',
          version: '4.5.0',
        },
        {
          id: 'cart-referral-gateway',
          title: 'Human Referral & Sovereign Invitee Keymaster',
          code: 'CART_REF_GATE',
          category: 'SECURITY',
          description:
            'Issues cryptographic invite tokens, manages human referral quotas, and validates biometric passkeys.',
          allowKnightSwitch: false,
          icon: '🗝️',
          status: 'mounted',
          runtimeTier: 'Ring 0 Security',
          version: '3.2.0',
        },
        {
          id: 'cart-avatar-weaver',
          title: 'Avatar Knight Weaver & Gateway Bridge',
          code: 'CART_WEAVER_V1',
          category: 'AVATAR_WEAVER',
          description:
            'Enables hot-swapping knight personas, holographic projection, and human operator round-table bridging.',
          allowKnightSwitch: true,
          switchableKnights: ['vashon-arch', 'referral-human-01', 'referral-human-02'],
          icon: '🎛️',
          status: 'mounted',
          runtimeTier: 'Ring 1 Enclave',
          version: '1.0.4',
        },
      ],
    },
  },
  {
    id: 'referral-human-01',
    handle: 'HUMAN_REFERRAL_01',
    name: 'Referral Controller #1',
    role: 'Verified Human Invitee · Sovereign Node Operator',
    tenantId: 'REF-HUMAN-01',
    clearance: 'HUMAN_REFERRAL_CONTROLLER',
    controllerType: 'HUMAN_REFERRAL',
    humanVerified: true,
    referralBy: 'VASHON_ARCH',
    referralCode: 'REF-ARCH-711-ALPHA',
    memory: { used: 2.1, total: 4.0 },
    latency: '12ms',
    coreSync: 'OPTIMAL',
    avatar: '🛡️',
    sigilColor: '#00E5FF',
    subAgents: ['Anya (Voice HUD)', 'Sir Sentinel (Hit-Gate)'],
    cipher: 'ED25519_REFERRAL_SEAL',
    description:
      'Verified human sovereign node operator invited via Arch-Architect cryptographic referral signature.',
    lastActive: 'Active Now',
    configuration: {
      theme: 'cyan-obsidian',
      activeCartridgeId: 'cart-human-workspace',
      voicePersona: 'Lakisha',
      autoArmDefense: true,
      allowKnightSwitchOverride: false,
      customTokens: ['TOKEN_REF_ALPHA', 'SIGIL_HUMAN_CONTROLLER'],
      cartridges: [
        {
          id: 'cart-human-workspace',
          title: 'Sovereign Human Workspace & Neural Bridge',
          code: 'CART_HUMAN_W1',
          category: 'SYSTEM',
          description:
            'Sandboxed human workspace with verified referral provenance and hardware mTLS audio gateway.',
          allowKnightSwitch: false,
          icon: '🛡️',
          status: 'active',
          runtimeTier: 'Ring 1 Workspace',
          version: '2.0.0',
        },
        {
          id: 'cart-referral-vault',
          title: 'Verified Referral Isolation & Zero-Trust Enclave',
          code: 'CART_REF_VAULT',
          category: 'SECURITY',
          description:
            'Zero-trust tenant isolation preventing cross-partition leakage and enforcing rate limits.',
          allowKnightSwitch: false,
          icon: '🔐',
          status: 'mounted',
          runtimeTier: 'Ring 1 Security',
          version: '1.5.0',
        },
      ],
    },
  },
  {
    id: 'referral-human-02',
    handle: 'HUMAN_REFERRAL_02',
    name: 'Referral Controller #2',
    role: 'Verified Human Invitee · Sovereign Factory Node',
    tenantId: 'REF-HUMAN-02',
    clearance: 'HUMAN_REFERRAL_CONTROLLER',
    controllerType: 'HUMAN_REFERRAL',
    humanVerified: true,
    referralBy: 'VASHON_ARCH',
    referralCode: 'REF-ARCH-711-BETA',
    memory: { used: 1.9, total: 4.0 },
    latency: '15ms',
    coreSync: 'OPTIMAL',
    avatar: '⚡',
    sigilColor: '#9D4EDD',
    subAgents: ['Anya (Voice HUD)', 'Sir Forge (Compiler)'],
    cipher: 'AES_256_GCM_HARDENED',
    description:
      'Human operator with delegated sovereign tenant workspace and real-time audio/telemetry bridge.',
    lastActive: '5m ago',
    configuration: {
      theme: 'purple-obsidian',
      activeCartridgeId: 'cart-factory-workspace',
      voicePersona: 'Lakisha',
      autoArmDefense: true,
      allowKnightSwitchOverride: false,
      customTokens: ['TOKEN_REF_BETA', 'SIGIL_HUMAN_CONTROLLER'],
      cartridges: [
        {
          id: 'cart-factory-workspace',
          title: 'Sovereign Digital Product Factory Workspace',
          code: 'CART_FACTORY_F1',
          category: 'SYSTEM',
          description:
            'High-speed WASM micro-frontend execution environment and digital product factory tools.',
          allowKnightSwitch: false,
          icon: '⚡',
          status: 'active',
          runtimeTier: 'Ring 1 Workspace',
          version: '3.0.0',
        },
        {
          id: 'cart-human-telemetry',
          title: 'Green Computing & Audio Telemetry Enclave',
          code: 'CART_TELEMETRY_G1',
          category: 'AI_ENGINE',
          description:
            'Continuous Green Computing telemetry, VAD speech processing, and latency monitoring.',
          allowKnightSwitch: false,
          icon: '📊',
          status: 'mounted',
          runtimeTier: 'Ring 2 Telemetry',
          version: '2.1.0',
        },
      ],
    },
  },
];

interface TenantContextValue {
  tenants: TenantProfile[];
  activeTenant: TenantProfile;
  activeCartridge: TenantCartridge | null;
  isKnightSwitchAllowed: boolean;
  isGatewayOpen: boolean;
  isAuthenticated: boolean;
  warpStage: WarpStage;
  targetTenant: TenantProfile | null;
  showAvatarKnightScreen: boolean;
  knightSwitchBlockMessage: string | null;
  selectTenant: (tenant: TenantProfile) => void;
  mountCartridge: (cartridgeId: string) => void;
  openGateway: () => void;
  closeGateway: () => void;
  forceOpenGateway: () => void;
  lockSession: () => void;
  logout: () => void;
  setIsAuthenticated: (auth: boolean) => void;
  setShowAvatarKnightScreen: (show: boolean) => void;
  clearKnightSwitchBlockMessage: () => void;
  addTenant: (newTenant: Omit<TenantProfile, 'id' | 'lastActive'>) => void;
  deleteTenant: (tenantId: string) => void;
  updateConfiguration: (config: Partial<TenantConfiguration>) => void;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenants] = useState<TenantProfile[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_TENANTS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse cached tenants:', e);
      }
    }
    return DEFAULT_TENANTS;
  });

  const [activeTenant, setActiveTenant] = useState<TenantProfile>(() => {
    if (typeof window !== 'undefined') {
      try {
        const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE);
        const match = tenants.find((t) => t.id === activeId);
        if (match) return match;
      } catch (e) {
        console.warn('Failed to parse active tenant:', e);
      }
    }
    return tenants[0] || DEFAULT_TENANTS[0];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(STORAGE_KEY_AUTH) === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const [isGatewayOpen, setIsGatewayOpen] = useState(() => !isAuthenticated);
  const [warpStage, setWarpStage] = useState<WarpStage>('idle');
  const [targetTenant, setTargetTenant] = useState<TenantProfile | null>(null);
  const [showAvatarKnightScreen, setShowAvatarKnightScreen] = useState(true);
  const [knightSwitchBlockMessage, setKnightSwitchBlockMessage] = useState<string | null>(null);

  // Sync auth state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_AUTH, isAuthenticated ? 'true' : 'false');
    } catch (e) {
      console.warn('Failed to persist auth status:', e);
    }
  }, [isAuthenticated]);

  // Derive active mounted cartridge
  const activeCartridgeId = activeTenant.configuration?.activeCartridgeId;
  const activeCartridge: TenantCartridge | null =
    activeTenant.configuration?.cartridges?.find((c) => c.id === activeCartridgeId) ||
    activeTenant.configuration?.cartridges?.[0] ||
    null;

  // Knight switching is ONLY allowed if the active mounted cartridge explicitly enables it
  const isKnightSwitchAllowed = Boolean(activeCartridge?.allowKnightSwitch);

  // Save tenants whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TENANTS, JSON.stringify(tenants));
    } catch (e) {
      console.warn('Failed to store tenants in localStorage:', e);
    }
  }, [tenants]);

  // Save active tenant ID
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, activeTenant.id);
    } catch (e) {
      console.warn('Failed to store active tenant:', e);
    }
  }, [activeTenant]);

  // Mount/Hot-swap a cartridge for the active tenant
  const mountCartridge = useCallback((cartridgeId: string) => {
    setActiveTenant((prev) => {
      if (!prev.configuration) return prev;
      const updatedCartridges = prev.configuration.cartridges.map((c) => ({
        ...c,
        status: c.id === cartridgeId ? ('active' as const) : ('mounted' as const),
      }));

      return {
        ...prev,
        configuration: {
          ...prev.configuration,
          activeCartridgeId: cartridgeId,
          cartridges: updatedCartridges,
        },
      };
    });
  }, []);

  // Tenant Hydration Flow
  const selectTenant = useCallback((tenant: TenantProfile) => {
    setTargetTenant(tenant);
    setWarpStage('decrypting');

    // Stage 1: Decrypt Vault Secrets (450ms)
    setTimeout(() => {
      setWarpStage('hydrating');

      // Stage 2: Hydrate MicroVM Context (450ms)
      setTimeout(() => {
        setWarpStage('warping');

        // Stage 3: Shield Expand Warp Animation (700ms)
        setTimeout(() => {
          setActiveTenant(tenant);
          setIsAuthenticated(true);
          setIsGatewayOpen(false);
          setWarpStage('complete');
          setShowAvatarKnightScreen(true);

          // Stage 4: Reset to idle
          setTimeout(() => {
            setWarpStage('idle');
            setTargetTenant(null);
          }, 350);
        }, 700);
      }, 450);
    }, 450);
  }, []);

  // Request to open Gateway (governed by Cartridge capability)
  const openGateway = useCallback(() => {
    if (isKnightSwitchAllowed) {
      setIsGatewayOpen(true);
      setKnightSwitchBlockMessage(null);
    } else {
      const activeTitle = activeCartridge?.title || 'Current Cartridge';
      setKnightSwitchBlockMessage(
        `Knight switching is restricted under [${activeTitle}]. Mount an [Avatar Knight Weaver] cartridge in the Cartridge Dock to unlock knight switching.`,
      );
    }
  }, [isKnightSwitchAllowed, activeCartridge]);

  // Force open Gateway (for initial login or explicit lock screen)
  const forceOpenGateway = useCallback(() => {
    setIsGatewayOpen(true);
    setKnightSwitchBlockMessage(null);
  }, []);

  const closeGateway = useCallback(() => {
    if (isAuthenticated) {
      setIsGatewayOpen(false);
    }
  }, [isAuthenticated]);

  const lockSession = useCallback(() => {
    setIsAuthenticated(false);
    setIsGatewayOpen(true);
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setIsGatewayOpen(true);
    setShowAvatarKnightScreen(false);
  }, []);

  const clearKnightSwitchBlockMessage = useCallback(() => {
    setKnightSwitchBlockMessage(null);
  }, []);

  const addTenant = useCallback((newTenantData: Omit<TenantProfile, 'id' | 'lastActive'>) => {
    const id = `knight-${Date.now()}`;
    const newProfile: TenantProfile = {
      ...newTenantData,
      id,
      lastActive: 'Just created',
      configuration: {
        theme: 'neutral-smoke',
        activeCartridgeId: `cart-${id}`,
        voicePersona: 'Lakisha',
        autoArmDefense: true,
        allowKnightSwitchOverride: false,
        customTokens: [`TOKEN_${newTenantData.handle}`],
        cartridges: [
          {
            id: `cart-${id}`,
            title: `${newTenantData.name} Standard Core`,
            code: `CART_${newTenantData.tenantId}`,
            category: 'SYSTEM',
            description: `Dedicated microVM cartridge for ${newTenantData.handle}`,
            allowKnightSwitch: false,
            icon: newTenantData.avatar || '🛡️',
            status: 'active',
            runtimeTier: 'Ring 1 Partition',
            version: '1.0.0',
          },
        ],
      },
    };
    setTenants((prev) => [...prev, newProfile]);
  }, []);

  const deleteTenant = useCallback((tenantId: string) => {
    setTenants((prev) => {
      const filtered = prev.filter((t) => t.id !== tenantId);
      return filtered.length > 0 ? filtered : DEFAULT_TENANTS;
    });
  }, []);

  const updateConfiguration = useCallback(
    (config: Partial<TenantConfiguration>) => {
      setTenants((prev) =>
        prev.map((t) =>
          t.id === activeTenant.id
            ? {
                ...t,
                configuration: { ...t.configuration, ...config } as TenantConfiguration,
              }
            : t,
        ),
      );
    },
    [activeTenant.id],
  );

  return (
    <TenantContext.Provider
      value={{
        tenants,
        activeTenant,
        activeCartridge,
        isKnightSwitchAllowed,
        isGatewayOpen,
        isAuthenticated,
        warpStage,
        targetTenant,
        showAvatarKnightScreen,
        knightSwitchBlockMessage,
        selectTenant,
        mountCartridge,
        openGateway,
        closeGateway,
        forceOpenGateway,
        lockSession,
        logout,
        setIsAuthenticated,
        setShowAvatarKnightScreen,
        clearKnightSwitchBlockMessage,
        addTenant,
        deleteTenant,
        updateConfiguration,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
