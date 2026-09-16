import type { EndTier, GameState, LoseReason } from './types'
export function checkInstantLose(state: GameState): LoseReason {
  if (state.trust <= 0) return 'trust_collapse'
  if (state.hospitalOverrunStreak >= 2) return 'hospital_overrun'
  if (state.cumulativeInfected >= state.failCap) return 'fail_cap'
  return null
}

export function updateDecliningStreak(state: GameState): GameState {
  const { todayNewTrue, prevNewTrue, hospitalLoad, trust } = state
  let streak = state.decliningStreak

  // Controlled: non-increasing new infections in a control band after the outbreak has developed.
  const inControlBand =
    prevNewTrue !== null &&
    todayNewTrue <= prevNewTrue &&
    todayNewTrue <= 45 &&
    state.day >= 6 &&
    state.cumulativeInfected >= 80

  if (
    inControlBand &&
    hospitalLoad <= 70 &&
    trust >= 25 &&
    state.cumulativeInfected < state.failCap
  ) {
    streak += 1
  } else {
    streak = 0
  }

  // Extra help: if true active is clearly falling and new is low, count even if flat-ish
  if (
    streak === 0 &&
    prevNewTrue !== null &&
    todayNewTrue < prevNewTrue &&
    hospitalLoad <= 70 &&
    trust >= 25 &&
    state.day >= 5 &&
    state.cumulativeInfected < state.failCap
  ) {
    streak = state.decliningStreak + 1
  }

  const winReady = streak >= 3
  return { ...state, decliningStreak: streak, winReady }
}

export function computeEndTier(state: GameState, won: boolean): EndTier {
  if (!won) return 'L'

  const usedEmergency = state.usedEmergency
  const trust = state.trust
  const day = state.day
  const ever95 = state.everHospital95

  if (usedEmergency || ever95) return 'C'
  if (day <= 14 && trust >= 50 && !usedEmergency) return 'S'
  if (trust >= 35) return 'A'
  if (trust < 25) return 'C'
  return 'B'
}

export function applyWin(state: GameState): GameState {
  const tier = computeEndTier(state, true)
  return {
    ...state,
    ended: true,
    phase: 'ended',
    endTier: tier,
    loseReason: null,
    pressCrawl: `CONTROLLED — incidence declining. Tier ${tier}. Debrief ready.`,
    logs: [
      ...state.logs,
      {
        day: state.day,
        kind: 'good',
        text: `VICTORY — Controlled. Tier ${tier}. Days ${state.day}. Trust ${Math.round(state.trust)}. Peak hospital ${Math.round(state.peakHospital)}%.`,
      },
    ],
  }
}

export function applyLose(state: GameState, reason: LoseReason): GameState {
  const labels: Record<Exclude<LoseReason, null>, string> = {
    trust_collapse: 'Trust collapsed — compliance failure. The city no longer follows orders.',
    hospital_overrun: 'Hospitals overrun for two consecutive dawns. Care system failed.',
    fail_cap: 'Hidden infections breached FailCap. The curve took the city.',
    unresolved: 'Day limit reached without control. Unresolved.',
  }
  const text = reason ? labels[reason] : 'Run failed.'
  return {
    ...state,
    ended: true,
    phase: 'ended',
    endTier: 'L',
    loseReason: reason,
    pressCrawl: `FAILURE — ${text}`,
    logs: [
      ...state.logs,
      { day: state.day, kind: 'crisis', text: `LOSE — ${text}` },
    ],
  }
}

export function estimateExcessSevere(state: GameState): number {
  return Math.max(
    0,
    Math.round(state.cumulativeInfected * 0.04 + state.peakHospital * 1.2),
  )
}

