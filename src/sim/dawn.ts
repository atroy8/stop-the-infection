import { DISTRICT_ORDER, DISTRICTS, totalBeds } from './districts'
import { PATHOGENS } from './pathogens'
import { nextRng } from './rng'
import { resolveRumors } from './rumors'
import { activeRMult, complianceMult, totalVisible } from './selectors'
import {
  applyLose,
  applyWin,
  checkInstantLose,
  updateDecliningStreak,
} from './winLose'
import type { GameState } from './types'

function tickEffects(state: GameState): GameState {
  const effects = state.effects
    .map((e) => ({ ...e, daysLeft: e.daysLeft - 1 }))
    .filter((e) => e.daysLeft > 0)

  let trust = state.trust
  let testingLevel = state.testingLevel
  let hospitalCapacityBonus = 0
  let surveillanceActive = false
  let surveillanceDays = 0

  for (const e of effects) {
    if (e.trustDrainPerDay) trust -= e.trustDrainPerDay
    if (e.isolationWithoutSupport) trust -= 1
    if (e.testingBonus) testingLevel = Math.max(testingLevel, 0.35 + e.testingBonus)
    if (e.hospitalCapacityBonus)
      hospitalCapacityBonus += e.hospitalCapacityBonus
    if (e.fogReduction) {
      surveillanceActive = true
      surveillanceDays = e.daysLeft
    }
  }

  // Decay testing toward baseline if no surge
  const hasSurge = effects.some((e) => e.kind === 'test_surge')
  if (!hasSurge) {
    const base = state.pathogenId === 'flash' ? 0.35 : 0.18
    testingLevel = testingLevel * 0.92 + base * 0.08
  }

  const cooldowns: Record<string, number> = {}
  for (const [k, v] of Object.entries(state.cooldowns)) {
    if (v > 1) cooldowns[k] = v - 1
  }

  return {
    ...state,
    effects,
    trust,
    testingLevel,
    hospitalCapacityBonus,
    surveillanceActive,
    surveillanceDays,
    cooldowns,
    riskCommYesterday: state.lastRiskCommDay === state.day,
  }
}

function resolveSpread(state: GameState): GameState {
  const pathogen = PATHOGENS[state.pathogenId]
  const compliance = complianceMult(state)
  let rng = state.rngState
  let newTrueTotal = 0
  const districts = { ...state.districts }

  // Travel seed from hub if no travel screen
  const travelBlocked = state.effects.some((e) => e.kind === 'travel_screen')
  if (!travelBlocked && state.pathogenId === 'flash' && state.day <= 12) {
    const r = nextRng(rng)
    rng = r.state
    if (r.value < 0.22) {
      const add = 1 + Math.floor(r.value * 4)
      districts.A = {
        ...districts.A,
        trueActive: districts.A.trueActive + add,
        cumulativeInfected: districts.A.cumulativeInfected + add,
      }
      newTrueTotal += add
    }
  }

  for (const id of DISTRICT_ORDER) {
    const def = DISTRICTS[id]
    const d = districts[id]
    const susceptible = Math.max(
      0,
      def.population - d.cumulativeInfected - d.recovered * 0.3,
    )
    const frac = Math.min(1, d.trueActive / Math.max(1, def.population * 0.15))

    let rEff =
      pathogen.baseR *
      def.density *
      activeRMult(state, id) *
      compliance *
      (0.85 + 0.3 * (1 - frac)) // density-dependent saturation

    // Stacked control suppression: 2+ spread-cut effects → extra brake
    const spreadCuts = state.effects.filter(
      (e) =>
        e.rMult !== undefined &&
        e.rMult < 1 &&
        (e.kind === 'closures' ||
          e.kind === 'contact_tracing' ||
          e.kind === 'isolation_support' ||
          e.kind === 'test_surge' ||
          e.kind === 'travel_screen' ||
          e.kind === 'equity'),
    ).length
    if (spreadCuts >= 2) rEff *= 0.82
    if (spreadCuts >= 3) rEff *= 0.85
    // Shadow: surveillance + testing unlocks real control
    if (
      state.pathogenId === 'shadow' &&
      state.surveillanceActive &&
      state.testingLevel >= 0.4
    ) {
      rEff *= 0.8
    }

    // Equity reduces hidden circulation in D
    const equity = state.effects.find(
      (e) =>
        e.kind === 'equity' &&
        (e.districtId === 'D' || e.districtId === 'city' || !e.districtId),
    )
    if (id === 'D' && equity) rEff *= 0.78

    // Shadow hides better in E
    if (state.pathogenId === 'shadow' && id === 'E') rEff *= 1.08

    // Isolation effect scales with visible/known
    const iso = state.effects.find((e) => e.kind === 'isolation_support')
    if (iso) {
      const knownFrac =
        d.trueActive > 0 ? Math.min(1, d.visible / d.trueActive) : 0
      rEff *= 1 - 0.22 * knownFrac * (iso.districtId && iso.districtId !== 'city' && iso.districtId !== id ? 0.55 : 1)
    }

    // Test surge slight -spread from isolating positives
    if (state.effects.some((e) => e.kind === 'test_surge')) {
      rEff *= 0.94
    }

    // Just-a-flu already in complianceMult via crisis flag; also weaken -R
    // (handled in activeRMult path via compliance)

    const contacts = d.trueActive * rEff * 0.125
    const infectionProb = Math.min(0.45, contacts / Math.max(1, susceptible))
    let rawNew = susceptible * infectionProb
    const noise = nextRng(rng)
    rng = noise.state
    rawNew *= 0.94 + noise.value * 0.12
    let newborn = Math.max(0, Math.round(rawNew))

    // Recovery: higher when isolation packages are active
    let recoverRate = state.pathogenId === 'flash' ? 0.22 : 0.16
    if (iso) recoverRate += 0.08
    if (state.testingLevel > 0.45) recoverRate += 0.03
    const recovered = Math.round(d.trueActive * recoverRate)
    const still = Math.max(0, d.trueActive - recovered + newborn)

    districts[id] = {
      ...d,
      trueActive: still,
      cumulativeInfected: d.cumulativeInfected + newborn,
      recovered: d.recovered + recovered,
    }
    newTrueTotal += newborn
  }

  // Cross-district spillover (mild)
  for (const id of DISTRICT_ORDER) {
    const r = nextRng(rng)
    rng = r.state
    if (r.value < 0.12 && districts[id].trueActive > 25) {
      const pick = nextRng(rng)
      rng = pick.state
      const target = DISTRICT_ORDER[Math.floor(pick.value * DISTRICT_ORDER.length)]
      if (target !== id) {
        districts[target] = {
          ...districts[target],
          trueActive: districts[target].trueActive + 2,
          cumulativeInfected: districts[target].cumulativeInfected + 2,
        }
        newTrueTotal += 2
      }
    }
  }

  const cumulativeInfected = DISTRICT_ORDER.reduce(
    (s, id) => s + districts[id].cumulativeInfected,
    0,
  )

  return {
    ...state,
    districts,
    rngState: rng,
    todayNewTrue: newTrueTotal,
    cumulativeInfected,
  }
}

function resolveVisibility(state: GameState): GameState {
  const pathogen = PATHOGENS[state.pathogenId]
  let rng = state.rngState
  const districts = { ...state.districts }

  let testing = state.testingLevel
  if (state.effects.some((e) => e.kind === 'test_surge')) {
    testing += 0.35
  }
  if (state.effects.some((e) => e.kind === 'sentinel')) {
    testing += 0.08
  }
  if (state.effects.some((e) => e.kind === 'equity')) {
    // boost uptake in D
  }
  if (state.effects.some((e) => e.kind === 'contact_tracing')) {
    testing += 0.05
  }

  const visRate =
    pathogen.visibilityRate *
    (1 - pathogen.asymptomaticBias * 0.5) *
    (0.5 + testing)

  for (const id of DISTRICT_ORDER) {
    const d = districts[id]
    let rate = visRate
    if (id === 'D' && state.effects.some((e) => e.kind === 'equity')) {
      rate *= 1.35
    }
    const r = nextRng(rng)
    rng = r.state
    const newlyVisible = Math.min(
      d.trueActive,
      Math.round(d.trueActive * rate * (0.8 + r.value * 0.4)),
    )
    // Visible decays slower than true; keep max of previous visible*0.7 and new
    const visible = Math.max(
      Math.round(d.visible * 0.65),
      newlyVisible,
      state.effects.some((e) => e.kind === 'contact_tracing')
        ? newlyVisible + Math.round(3 + r.value * 5)
        : newlyVisible,
    )
    districts[id] = { ...d, visible: Math.min(d.trueActive + 5, visible) }
  }

  const peakVisible = Math.max(
    state.peakVisible,
    DISTRICT_ORDER.reduce((s, id) => s + districts[id].visible, 0),
  )

  return { ...state, districts, rngState: rng, peakVisible, testingLevel: testing }
}

function resolveHospitals(state: GameState): GameState {
  const pathogen = PATHOGENS[state.pathogenId]
  const beds = totalBeds() + state.hospitalCapacityBonus
  const trueActive = DISTRICT_ORDER.reduce(
    (s, id) => s + state.districts[id].trueActive,
    0,
  )
  const severe = trueActive * pathogen.severity
  // Soften spike: partial occupancy model + surge beds
  const load = Math.round((severe / Math.max(1, beds)) * 100 * 0.85)
  const hospitalLoad = Math.max(5, Math.min(140, load))
  const peakHospital = Math.max(state.peakHospital, hospitalLoad)
  const everHospital95 = state.everHospital95 || hospitalLoad >= 95

  let hospitalOverrunStreak = state.hospitalOverrunStreak
  if (hospitalLoad >= 100) hospitalOverrunStreak += 1
  else hospitalOverrunStreak = 0

  return {
    ...state,
    hospitalLoad,
    peakHospital,
    everHospital95,
    hospitalOverrunStreak,
  }
}

function opsRegen(state: GameState): GameState {
  const blocked = state.effects.some((e) => e.meta?.blockOpsRegen)
  const overrun = state.hospitalLoad >= 100
  let ops = state.ops
  if (!blocked && !overrun) {
    ops = Math.min(12, ops + 1)
  }
  // Travel screening economic pressure
  if (state.effects.some((e) => e.kind === 'travel_screen' && e.meta?.econPressure)) {
    ops = Math.max(0, ops - 2)
  }
  return { ...state, ops }
}

function flavorPress(state: GameState): GameState {
  const vis = totalVisible(state)
  const lines = [
    `Day ${state.day}: ${vis} reported cases on the board. Hospital load ${Math.round(state.hospitalLoad)}%.`,
    `Ops desk: Trust at ${Math.round(state.trust)}. Fog still thick.`,
    `Incident command — choose carefully. Max 2 interventions today.`,
  ]
  if (state.hospitalLoad >= 80) {
    lines.unshift('WARNING: Bed pressure critical.')
  }
  if (state.trust < 25) {
    lines.unshift('POLITICAL COVER thinning.')
  }
  return {
    ...state,
    pressCrawl: lines[0] ?? state.pressCrawl,
  }
}

/**
 * Advance to next day: spread → visibility → hospitals → rumor → Ops regen → player acts.
 * Call after player commits (or skips) their actions for the current day.
 */
export function advanceDawn(state: GameState): GameState {
  if (state.ended) return state

  let s: GameState = {
    ...state,
    day: state.day + 1,
    actionsToday: 0,
    prevNewTrue: state.todayNewTrue,
  }

  s = tickEffects(s)
  s = resolveSpread(s)
  s = resolveVisibility(s)
  s = resolveHospitals(s)
  s = resolveRumors(s)
  s = opsRegen(s)
  s = updateDecliningStreak(s)
  s = flavorPress(s)

  s = {
    ...s,
    logs: [
      ...s.logs,
      {
        day: s.day,
        kind: 'info',
        text: `Dawn ${s.day}: +${s.todayNewTrue} new true (hidden). Visible ${totalVisible(s)}. Hospital ${Math.round(s.hospitalLoad)}%. Trust ${Math.round(s.trust)}.`,
      },
    ],
  }

  const lose = checkInstantLose(s)
  if (lose) return applyLose(s, lose)

  if (s.winReady) return applyWin(s)

  if (s.day > s.dayLimit) return applyLose(s, 'unresolved')

  return s
}

/** First-day setup already seeded; optional early visibility pass not needed. */
export function startOfDayReady(state: GameState): GameState {
  return state
}
