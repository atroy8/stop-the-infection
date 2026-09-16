import type { InterventionDef, InterventionId } from './types'

export const INTERVENTION_ORDER: InterventionId[] = [
  'test_surge',
  'contact_tracing',
  'isolation_support',
  'hospital_surge',
  'risk_comm',
  'closures',
  'travel_screen',
  'sentinel',
  'equity',
  'emergency',
]

export const INTERVENTIONS: Record<InterventionId, InterventionDef> = {
  test_surge: {
    id: 'test_surge',
    name: 'Test Surge',
    short: 'Labs',
    opsCost: 2,
    trustDelta: 2,
    cooldown: 2,
    citywide: true,
    canTarget: true,
    description:
      '+testing capacity 2 days → more true infections become visible; slight −spread from isolating positives. Fear spike if hospitals already >80%.',
    bestVs: 'Shadow',
  },
  contact_tracing: {
    id: 'contact_tracing',
    name: 'Contact Tracing',
    short: 'Trace',
    opsCost: 3,
    trustDelta: 0,
    cooldown: 3,
    citywide: true,
    canTarget: true,
    description:
      'Cut local R in high-contact groups for 3 days; finds linked cases. Weak if testing capacity is low.',
    bestVs: 'Shadow',
  },
  isolation_support: {
    id: 'isolation_support',
    name: 'Isolation + Support',
    short: 'Isolate',
    opsCost: 3,
    trustDelta: 3,
    cooldown: 2,
    citywide: true,
    canTarget: true,
    description:
      '−spread from known cases; reduces household amplification. Always pair with support packages — isolation alone burns Trust.',
    bestVs: 'Both',
  },
  hospital_surge: {
    id: 'hospital_surge',
    name: 'Hospital Surge',
    short: 'Beds',
    opsCost: 4,
    trustDelta: 4,
    cooldown: 4,
    citywide: true,
    canTarget: false,
    description:
      '+hospital capacity for 5 days (load % drops); lowers severe outcomes. Does not cut transmission much.',
    bestVs: 'Flash peak',
  },
  risk_comm: {
    id: 'risk_comm',
    name: 'Risk Communication',
    short: 'Comms',
    opsCost: 1,
    trustDelta: 6,
    cooldown: 2,
    citywide: true,
    canTarget: false,
    description:
      '+compliance (interventions ~10% stronger for 3 days); slows rumor growth. Spamming without new facts diminishes returns.',
    bestVs: 'Flash early',
  },
  closures: {
    id: 'closures',
    name: 'Targeted Closures',
    short: 'Close',
    opsCost: 2,
    trustDelta: -8,
    cooldown: 3,
    citywide: true,
    canTarget: true,
    description:
      'Strong −R in closed settings for 4 days. Spawns Overreach rumor unless Communication ran same day or day before.',
    bestVs: 'Flash',
  },
  travel_screen: {
    id: 'travel_screen',
    name: 'Travel Screening',
    short: 'Hub',
    opsCost: 2,
    trustDelta: -3,
    cooldown: 3,
    citywide: false,
    canTarget: false,
    description:
      'Cuts import seed events from Gatewell Hub; mild −city R. Economic pressure may cost Ops next dawn.',
    bestVs: 'Early Flash',
  },
  sentinel: {
    id: 'sentinel',
    name: 'Sentinel / Wastewater',
    short: 'Sentinel',
    opsCost: 2,
    trustDelta: 1,
    cooldown: 4,
    citywide: true,
    canTarget: false,
    description:
      'For 5 days: reduce fog — show infection pressure bands per district; earlier warning.',
    bestVs: 'Shadow',
  },
  equity: {
    id: 'equity',
    name: 'Equity Outreach',
    short: 'Equity',
    opsCost: 2,
    trustDelta: 3,
    cooldown: 3,
    citywide: true,
    canTarget: true,
    description:
      'Boosts compliance & testing where Trust bias is worst; reduces hidden circulation in Rivermark.',
    bestVs: 'Both',
  },
  emergency: {
    id: 'emergency',
    name: 'Emergency Declaration',
    short: 'Declare',
    opsCost: 1,
    trustDelta: -12,
    cooldown: 10,
    citywide: true,
    canTarget: false,
    description:
      '5 days: Ops costs −1 (min 1); closures & tracing +25% power. Hard Trust burn. Early use with low visibility = Power Grab.',
    bestVs: 'Late crisis',
  },
}

export function opsCostFor(
  id: InterventionId,
  targeted: boolean,
  discount: number,
): number {
  const base = INTERVENTIONS[id].opsCost
  let cost = targeted && INTERVENTIONS[id].canTarget ? Math.max(1, base - 1) : base
  if (discount > 0) cost = Math.max(1, cost - discount)
  return cost
}
