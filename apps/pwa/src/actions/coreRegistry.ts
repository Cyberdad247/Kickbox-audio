'use client';

export interface KnightMetrics {
  id: string;
  name: string;
  role: string;
  framework: string;
  drive: string;
  tier: string;
  tunnel: string;
  responsibilities: string[];
  escalation: string;
}

export const KNIGHTS_REGISTRY: KnightMetrics[] = [
  {
    id: 'CEO_001',
    name: 'Malik Strategy Vance',
    role: 'KPI Orchestrator',
    framework: 'LangGraph',
    drive: "dreams don't come true visions do.",
    tier: 'S4_Strategic',
    tunnel: 'planned_mTLS_Tunnel_0x001',
    responsibilities: ['daily KPI synthesis', 'priority triage', 'executive decision packet generation'],
    escalation: 'Ambassador Lakisha'
  },
  {
    id: 'CAL_002',
    name: 'Chloe Chronos Stern',
    role: 'Temporal Planner',
    framework: 'Autogen',
    drive: 'control the calendar control the destiny.',
    tier: 'S3_Contextual',
    tunnel: 'planned_mTLS_Tunnel_0x002',
    responsibilities: ['calendar deconfliction', 'booking automation', 'availability indexing'],
    escalation: 'CEO Malik'
  },
  {
    id: 'MAIL_003',
    name: 'Aiden Raven Cross',
    role: 'Inbox Dispatcher',
    framework: 'CrewAI',
    drive: 'write with clarity respond with speed.',
    tier: 'S2_Composite',
    tunnel: 'planned_mTLS_Tunnel_0x003',
    responsibilities: ['inbox filtering', 'draft composition', 'sequential dispatch routing'],
    escalation: 'CEO Malik'
  },
  {
    id: 'PROP_004',
    name: 'Marcus Bastion Vance',
    role: 'Asset Guard',
    framework: 'LangChain',
    drive: 'protection is the first pillar of equity.',
    tier: 'S3_Contextual',
    tunnel: 'planned_mTLS_Tunnel_0x004',
    responsibilities: ['tenant onboarding', 'lease verification', 'property metadata cataloging'],
    escalation: 'CEO Malik'
  },
  {
    id: 'MAINT_005',
    name: 'Gavin Forge Miller',
    role: 'Job Dispatcher',
    framework: 'CrewAI',
    drive: 'fix it once fix it right.',
    tier: 'S2_Composite',
    tunnel: 'planned_mTLS_Tunnel_0x005',
    responsibilities: ['maintenance dispatch', 'vendor matching', 'invoice validation'],
    escalation: 'Property Marcus'
  },
  {
    id: 'RENT_006',
    name: 'Sophia Ledger Stone',
    role: 'Collection Steward',
    framework: 'Semantic Kernel',
    drive: 'reconciliation is truth.',
    tier: 'S3_Contextual',
    tunnel: 'planned_mTLS_Tunnel_0x006',
    responsibilities: ['rent collection tracking', 'late fee assessment', 'bank account reconciliation'],
    escalation: 'CEO Malik'
  },
  {
    id: 'STREAM_007',
    name: 'Leo Audio Sterling',
    role: 'Acoustic Watch',
    framework: 'LangGraph',
    drive: 'bitrate is purity.',
    tier: 'S4_Strategic',
    tunnel: 'planned_mTLS_Tunnel_0x007',
    responsibilities: ['stream quality scoring', 'bitrate optimization', 'decibel drift warnings'],
    escalation: 'CEO Malik'
  },
  {
    id: 'BILL_008',
    name: 'Tessa Audit Sterling',
    role: 'Invoice Auditor',
    framework: 'Autogen',
    drive: 'every penny accounted.',
    tier: 'S3_Contextual',
    tunnel: 'planned_mTLS_Tunnel_0x008',
    responsibilities: ['double entry audit', 'tax reserve estimation', 'vendor payment release'],
    escalation: 'Rent Sophia'
  },
  {
    id: 'COFFEE_009',
    name: 'Barista Micro Sterling',
    role: 'Chassis Fueler',
    framework: 'LangChain',
    drive: 'caffeine is memory.',
    tier: 'S1_Atomic',
    tunnel: 'planned_mTLS_Tunnel_0x009',
    responsibilities: ['chassis fuel state indexing', 'auto delivery trigger', 'roast profiles lookup'],
    escalation: 'CEO Malik'
  },
  {
    id: 'GROWTH_010',
    name: 'Sierra Spark Sterling',
    role: 'Staking Agent',
    framework: 'LangGraph',
    drive: 'yield is velocity.',
    tier: 'S4_Strategic',
    tunnel: 'planned_mTLS_Tunnel_0x010',
    responsibilities: ['yield rate scraping', 'stake distribution planning', 'lending pool updates'],
    escalation: 'CEO Malik'
  }
];

export async function fetchKnightsRegistry(): Promise<KnightMetrics[]> {
  // Simulates edge network resolution delay
  return new Promise((resolve) => {
    setTimeout(() => resolve(KNIGHTS_REGISTRY), 10);
  });
}
