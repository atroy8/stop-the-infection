import { DISTRICT_ORDER, DISTRICTS } from './districts'
import type { DistrictId, GameState, SentinelBand } from './types'

export function totalVisible(state: GameState): number {
  return DISTRICT_ORDER.reduce((s, id) => s + state.districts[id].visible, 0)
}

export function totalTrueActive(state: GameState): number {
  return DISTRICT_ORDER.reduce((s, id) => s + state.districts[id].trueActive, 0)
}

export function sentinelBand(state: GameState, id: DistrictId): SentinelBand {
  if (!state.surveillanceActive) return 'unknown'
  const d = state.districts[id]
  const rate = d.trueActive / DISTRICTS[id].population
  if (rate < 0.004) return 'low'
  if (rate < 0.015) return 'med'
  return 'high'
}

export function districtPressureLabel(state: GameState, id: DistrictId): string {
  const band = sentinelBand(state, id)
  if (band === 'unknown') {
    const v = state.districts[id].visible
    if (v === 0) return '—'
    if (v < 8) return 'sparse'
    if (v < 30) return 'rising'
    return 'hot'
  }
  return band
}

export function opsDiscount(state: GameState): number {
  const em = state.effects.find((e) => e.kind === 'emergency' && (e.opsCostDiscount ?? 0) > 0)
  return em?.opsCostDiscount ?? 0
}

export function complianceMult(state: GameState): number {
  let m = 1
  for (const e of state.effects) {
    if (e.complianceBonus) m += e.complianceBonus
  }
  if (state.crisisFlags.justFluActive) m *= 0.75
  // Trust soft floor panic zone
  if (state.trust < 15) m *= 0.7
  else if (state.trust < 30) m *= 0.85
  return m
}

export function activeRMult(state: GameState, districtId?: DistrictId): number {
  let m = 1
  for (const e of state.effects) {
    if (!e.rMult) continue
    if (!e.districtId || e.districtId === 'city') {
      m *= e.rMult
    } else if (districtId && e.districtId === districtId) {
      m *= e.rMult
    }
  }
  return m
}
