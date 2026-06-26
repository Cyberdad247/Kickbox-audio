// KOA Realm seeded data — realistic placeholders for the three business domains
// (Property / Streaming / Coffee) plus the 10-Knight agent roster. Demo data,
// not live financials; structured so a real source can replace it later.

export interface Knight {
  id: string;
  name: string;
  title: string;
  domain: 'Executive' | 'Property' | 'Comms' | 'Streaming' | 'Finance' | 'Logistics' | 'Growth';
  status: 'active' | 'idle' | 'busy';
  task: string;
}

export const KNIGHTS: Knight[] = [
  {
    id: 'malik',
    name: 'Malik',
    title: 'Chief of Staff',
    domain: 'Executive',
    status: 'active',
    task: 'Compiling the daily Sovereign briefing',
  },
  {
    id: 'jalen',
    name: 'Jalen',
    title: 'Calendar',
    domain: 'Executive',
    status: 'idle',
    task: '3 events scheduled today',
  },
  {
    id: 'aaliyah',
    name: 'Aaliyah',
    title: 'Email',
    domain: 'Comms',
    status: 'busy',
    task: 'Triaging 14 inbound threads',
  },
  {
    id: 'marcus',
    name: 'Marcus',
    title: 'Property',
    domain: 'Property',
    status: 'active',
    task: 'Sandusky portfolio review',
  },
  {
    id: 'tyrell',
    name: 'Tyrell',
    title: 'Maintenance',
    domain: 'Property',
    status: 'busy',
    task: '2 work orders dispatched',
  },
  {
    id: 'nia',
    name: 'Nia',
    title: 'Rent',
    domain: 'Finance',
    status: 'active',
    task: 'Rent roll reconciled · 96% collected',
  },
  {
    id: 'isaiah',
    name: 'Isaiah',
    title: 'Streaming',
    domain: 'Streaming',
    status: 'active',
    task: 'Edge nodes nominal · 2.1k live',
  },
  {
    id: 'chloe',
    name: 'Chloe',
    title: 'Billing',
    domain: 'Finance',
    status: 'idle',
    task: 'Next invoice run in 4 days',
  },
  {
    id: 'elijah',
    name: 'Elijah',
    title: 'Inventory',
    domain: 'Logistics',
    status: 'busy',
    task: 'Reordering Ethiopia Yirgacheffe',
  },
  {
    id: 'elena',
    name: 'Elena',
    title: 'Growth',
    domain: 'Growth',
    status: 'active',
    task: 'Q3 expansion model +12.4%',
  },
];

export interface PropertyUnit {
  name: string;
  city: string;
  tenant: string;
  rent: number;
  status: 'Occupied' | 'Maintenance' | 'Vacant';
}

export const PROPERTIES: PropertyUnit[] = [
  {
    name: 'Obsidian Tower · 12',
    city: 'Sandusky',
    tenant: 'A. Whitfield',
    rent: 2400,
    status: 'Occupied',
  },
  { name: 'Gold Quarter · 4', city: 'Sandusky', tenant: '—', rent: 1850, status: 'Maintenance' },
  {
    name: 'Violet Heights · 8',
    city: 'Sandusky',
    tenant: 'R. Okafor',
    rent: 2100,
    status: 'Occupied',
  },
  {
    name: 'Lakeshore · 21',
    city: 'Sandusky',
    tenant: 'M. Delgado',
    rent: 2750,
    status: 'Occupied',
  },
  { name: 'Foundry Lofts · 3', city: 'Sandusky', tenant: '—', rent: 1650, status: 'Vacant' },
  {
    name: 'Cedar Point Row · 9',
    city: 'Sandusky',
    tenant: 'T. Nguyen',
    rent: 1950,
    status: 'Occupied',
  },
];

export interface StreamNode {
  region: string;
  status: 'Live' | 'Standby';
  viewers: number;
  load: number; // 0..1
}

export const STREAM_NODES: StreamNode[] = [
  { region: 'NA-East', status: 'Live', viewers: 1284, load: 0.62 },
  { region: 'NA-Central', status: 'Live', viewers: 842, load: 0.48 },
  { region: 'EU-West', status: 'Standby', viewers: 0, load: 0.05 },
];

export interface CoffeeShipment {
  origin: string;
  lot: string;
  bags: number;
  status: 'Roasting' | 'In Transit' | 'Customs' | 'Delivered';
  eta: string;
}

export const COFFEE: CoffeeShipment[] = [
  {
    origin: 'Ethiopia · Yirgacheffe',
    lot: 'YIR-2207',
    bags: 120,
    status: 'In Transit',
    eta: '3 days',
  },
  { origin: 'Colombia · Huila', lot: 'HUI-1184', bags: 80, status: 'Roasting', eta: '1 day' },
  { origin: 'Guatemala · Antigua', lot: 'ANT-0931', bags: 60, status: 'Customs', eta: '5 days' },
  { origin: 'Kenya · Nyeri', lot: 'NYE-4420', bags: 45, status: 'Delivered', eta: '—' },
];

export const VENTURES = [
  { name: 'Helio Labs', stake: 'Seed', value: 1_200_000 },
  { name: 'Camelot Capital', stake: 'Series A', value: 2_600_000 },
];
