export interface TenantMemory {
  used: number; // GB
  total: number; // GB
}

export type SecurityClearance =
  | 'SOVEREIGN_ARCH_ARCHITECT'
  | 'HUMAN_REFERRAL_CONTROLLER'
  | 'SOVEREIGN_ROOT'
  | 'ARCHITECT_PRIME'
  | 'KINETIC_CORE'
  | 'SECURITY_SENTINEL'
  | 'GUEST_SANDBOX';

export type ControllerType = 'HUMAN_ARCH_ARCHITECT' | 'HUMAN_REFERRAL';

export interface TenantCartridge {
  id: string;
  title: string;
  code: string;
  category: 'SYSTEM' | 'AI_ENGINE' | 'SECURITY' | 'AVATAR_WEAVER' | 'CUSTOM';
  description: string;
  /** ONLY cartridges with allowKnightSwitch=true permit switching knights */
  allowKnightSwitch?: boolean;
  switchableKnights?: string[];
  icon: string;
  status: 'active' | 'mounted' | 'standby' | 'locked';
  runtimeTier: string;
  version: string;
}

export interface TenantConfiguration {
  theme: string;
  activeCartridgeId: string;
  cartridges: TenantCartridge[];
  voicePersona: 'Lakisha' | 'Anya' | 'Merlin' | 'Sir Boris' | 'Custom';
  autoArmDefense: boolean;
  allowKnightSwitchOverride: boolean;
  customTokens: string[];
  wakeWordEnabled?: boolean;
  wakeWord?: string;
}

export interface TenantProfile {
  id: string;
  handle: string;
  name: string;
  role: string;
  tenantId: string;
  clearance: SecurityClearance;
  controllerType?: ControllerType;
  humanVerified?: boolean;
  referralCode?: string;
  referralBy?: string;
  email?: string;
  memory: TenantMemory;
  latency: string;
  coreSync: 'OPTIMAL' | 'STABLE' | 'DEGRADED' | 'EPHEMERAL';
  avatar: string;
  sigilColor: string;
  subAgents: string[];
  cipher: string;
  description: string;
  lastActive: string;
  configuration?: TenantConfiguration;
}

export type WarpStage = 'idle' | 'decrypting' | 'hydrating' | 'warping' | 'complete';
