export type DistrictId = 'A' | 'B' | 'C' | 'D' | 'E'

export type PathogenId = 'flash' | 'shadow'

export type InterventionId =
  | 'test_surge'
  | 'contact_tracing'
  | 'isolation_support'
  | 'hospital_surge'
  | 'risk_comm'
  | 'closures'
  | 'travel_screen'
  | 'sentinel'
  | 'equity'
  | 'emergency'

export type SentinelBand = 'low' | 'med' | 'high' | 'unknown'

export type GamePhase = 'title' | 'playing' | 'ended'

export type EndTier = 'S' | 'A' | 'B' | 'C' | 'L'

export type LoseReason =
  | 'trust_collapse'
  | 'hospital_overrun'
  | 'fail_cap'
  | 'unresolved'
  | null

export interface DistrictDef {
  id: DistrictId
  name: string
  type: string
  population: number
  density: number // spread multiplier
  hospitalBeds: number
  trustBias: number
}

export interface PathogenDef {
  id: PathogenId
  name: string
  tagline: string
  baseR: number
  visibilityRate: number // fraction of true that become visible per day (base)
  severity: number // fraction of active true that need hospital beds
  asymptomaticBias: number // reduces visibility further
  description: string
}

export interface ActiveEffect {
  id: string
  kind: InterventionId | 'crisis' | 'system'
  daysLeft: number
  districtId?: DistrictId | 'city'
  /** multiplicative R modifiers stacked */
  rMult?: number
  testingBonus?: number
  complianceBonus?: number
  hospitalCapacityBonus?: number
  fogReduction?: boolean
  mandateBoost?: boolean
  opsCostDiscount?: number
  trustDrainPerDay?: number
  isolationWithoutSupport?: boolean
  closureOpsPenalty?: boolean
  equityDebt?: boolean
  meta?: Record<string, number | boolean | string>
}

export interface DistrictState {
  id: DistrictId
  trueActive: number
  visible: number
  cumulativeInfected: number
  recovered: number
  localTrustMod: number
}

export interface CooldownState {
  [key: string]: number // interventionId -> days remaining
}

export interface GameLogEntry {
  day: number
  text: string
  kind: 'info' | 'alert' | 'crisis' | 'good' | 'press'
}

export interface GameState {
  phase: GamePhase
  pathogenId: PathogenId
  day: number
  ops: number
  trust: number
  districts: Record<DistrictId, DistrictState>
  hospitalLoad: number // 0-100+ percent of baseline capacity
  hospitalCapacityBonus: number // absolute bed bonus from surge
  effects: ActiveEffect[]
  cooldowns: CooldownState
  actionsToday: number
  maxActionsPerDay: number
  testingLevel: number // 0-1+ capacity
  surveillanceActive: boolean
  surveillanceDays: number
  usedEmergency: boolean
  everHospital95: boolean
  hospitalOverrunStreak: number
  decliningStreak: number
  prevNewTrue: number | null
  todayNewTrue: number
  peakHospital: number
  peakVisible: number
  cumulativeInfected: number
  failCap: number
  dayLimit: number
  logs: GameLogEntry[]
  pressCrawl: string
  crisisFlags: {
    overreachArmed: boolean
    inequityDebt: boolean
    coverUpActive: boolean
    justFluActive: boolean
    powerGrabFired: boolean
    credibilityReady: boolean
    containStreakDays: number
  }
  lastRiskCommDay: number
  isolationHasSupport: boolean
  lastClosureHadComm: boolean
  riskCommYesterday: boolean
  winReady: boolean
  endTier: EndTier | null
  loseReason: LoseReason
  ended: boolean
  seed: number
  rngState: number
}

export interface InterventionDef {
  id: InterventionId
  name: string
  short: string
  opsCost: number
  trustDelta: number // base; may be overridden by logic
  cooldown: number
  citywide: boolean
  canTarget: boolean
  description: string
  bestVs: string
}
