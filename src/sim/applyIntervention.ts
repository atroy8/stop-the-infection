import { INTERVENTIONS, opsCostFor } from './interventions'
import { opsDiscount } from './selectors'
import { applyLose, checkInstantLose } from './winLose'
import type {
  DistrictId,
  GameState,
  InterventionId,
  ActiveEffect,
} from './types'

export interface PlayOptions {
  targeted?: boolean
  districtId?: DistrictId
  /** Isolation: fund support packages (default true) */
  withSupport?: boolean
}

export type PlayResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: string; state: GameState }

function clampTrust(t: number): number {
  return Math.max(0, Math.min(100, t))
}

export function canPlay(
  state: GameState,
  id: InterventionId,
  opts: PlayOptions = {},
): { ok: true } | { ok: false; reason: string } {
  if (state.ended) return { ok: false, reason: 'Run ended.' }
  if (state.actionsToday >= state.maxActionsPerDay)
    return { ok: false, reason: 'Max 2 interventions per day.' }
  if ((state.cooldowns[id] ?? 0) > 0)
    return { ok: false, reason: `On cooldown (${state.cooldowns[id]}d).` }
  if (id === 'emergency' && state.usedEmergency)
    return { ok: false, reason: 'Emergency already used this run.' }

  const def = INTERVENTIONS[id]
  const targeted = Boolean(opts.targeted && def.canTarget)
  if (targeted && !opts.districtId)
    return { ok: false, reason: 'Pick a district for targeted play.' }

  let discount = opsDiscount(state)
  let cost = opsCostFor(id, targeted, discount)
  if (
    id === 'closures' &&
    state.effects.some((e) => e.closureOpsPenalty)
  ) {
    cost += 1
  }
  if (state.ops < cost) return { ok: false, reason: `Need ${cost} Ops.` }

  return { ok: true }
}

export function applyIntervention(
  state: GameState,
  id: InterventionId,
  opts: PlayOptions = {},
): PlayResult {
  const gate = canPlay(state, id, opts)
  if (!gate.ok) return { ok: false, reason: gate.reason, state }

  const def = INTERVENTIONS[id]
  const targeted = Boolean(opts.targeted && def.canTarget)
  const districtId = targeted ? opts.districtId : undefined
  const scopeMult = targeted ? 0.55 : 1
  const discount = opsDiscount(state)
  let cost = opsCostFor(id, targeted, discount)
  if (
    id === 'closures' &&
    state.effects.some((e) => e.closureOpsPenalty)
  ) {
    cost += 1
  }

  let s: GameState = {
    ...state,
    ops: state.ops - cost,
    actionsToday: state.actionsToday + 1,
    cooldowns: { ...state.cooldowns, [id]: def.cooldown },
  }

  const mandate = s.effects.some((e) => e.mandateBoost)
  const effects: ActiveEffect[] = [...s.effects]
  let trust = s.trust
  let log = ''
  let press = s.pressCrawl

  switch (id) {
    case 'test_surge': {
      trust += targeted ? 1 : 2
      effects.push({
        id: `test-${s.day}`,
        kind: 'test_surge',
        daysLeft: 2,
        districtId: districtId ?? 'city',
        testingBonus: 0.4 * scopeMult,
        rMult: 1 - 0.08 * scopeMult,
      })
      if (s.hospitalLoad > 80) {
        trust -= 4
        log = 'Test Surge online — cascade of cases revealed. Fear spike (−4 Trust).'
        press = 'LAB DUMP: Case counts jump as testing floods the system.'
      } else {
        log = 'Test Surge deployed — visibility up for 2 days.'
        press = 'Labs expand capacity. Positives feed isolation queues.'
      }
      break
    }
    case 'contact_tracing': {
      if (s.trust < 40) trust -= 2
      const weak = s.testingLevel < 0.3
      let power = (weak ? 0.78 : 0.62) 
      power = 1 - (1 - power) * scopeMult
      if (mandate) power *= 0.9 // stronger cut = lower mult
      // mandate: closures & tracing +25% power → multiply reduction by 1.25
      if (mandate) {
        const reduction = 1 - power
        power = 1 - reduction * 1.25
      }
      if (s.crisisFlags.justFluActive) {
        const reduction = 1 - power
        power = 1 - reduction * 0.75
      }
      effects.push({
        id: `trace-${s.day}`,
        kind: 'contact_tracing',
        daysLeft: 3,
        districtId: districtId ?? 'city',
        rMult: power,
      })
      log = weak
        ? 'Tracing live — but weak without testing capacity.'
        : 'Contact tracing cutting local R for 3 days.'
      press = 'Trace teams map clusters. Linked cases surface.'
      break
    }
    case 'isolation_support': {
      const withSupport = opts.withSupport !== false
      s = { ...s, isolationHasSupport: withSupport }
      if (withSupport) trust += targeted ? 2 : 3
      else trust -= 5
      effects.push({
        id: `iso-${s.day}`,
        kind: 'isolation_support',
        daysLeft: 4,
        districtId: districtId ?? 'city',
        rMult: 1 - 0.25 * scopeMult,
        isolationWithoutSupport: !withSupport,
      })
      log = withSupport
        ? 'Isolation + support packages funded.'
        : 'Isolation WITHOUT support — compliance will bleed Trust.'
      press = withSupport
        ? 'Support packages roll out with isolation orders.'
        : 'Orders without aid — frustration spikes on the crawl.'
      break
    }
    case 'hospital_surge': {
      trust += 4
      effects.push({
        id: `hosp-${s.day}`,
        kind: 'hospital_surge',
        daysLeft: 5,
        districtId: 'city',
        hospitalCapacityBonus: 420,
      })
      // Immediate load relief
      s = {
        ...s,
        hospitalLoad: Math.max(10, Math.round(s.hospitalLoad * 0.62)),
      }
      log = 'Hospital surge — capacity up 5 days. Transmission unchanged.'
      press = 'Field hospitals and cancel-elective protocols online.'
      break
    }
    case 'risk_comm': {
      const spam = s.lastRiskCommDay === s.day - 1 || s.lastRiskCommDay === s.day
      const coverUp = s.crisisFlags.coverUpActive
      if (coverUp) {
        trust -= 10
        log = 'Blitz during cover-up rumor — Trust crater (−10).'
        press = 'Comms collapse: blitz read as spin.'
      } else {
        trust += spam ? 3 : 6
        log = spam
          ? 'Risk comm (diminishing) — half effect.'
          : 'Risk communication blitz — compliance up 3 days.'
        press = 'Clear messaging cuts through the noise.'
      }
      const bonus = spam ? 0.05 : 0.1
      effects.push({
        id: `comm-${s.day}`,
        kind: 'risk_comm',
        daysLeft: 3,
        districtId: 'city',
        complianceBonus: bonus,
      })
      s = { ...s, lastRiskCommDay: s.day, riskCommYesterday: true }
      // Clears impending overreach if same day
      if (s.crisisFlags.overreachArmed) {
        s = {
          ...s,
          crisisFlags: { ...s.crisisFlags, overreachArmed: false },
        }
        log += ' Overreach rumor defused.'
      }
      break
    }
    case 'closures': {
      const hadComm =
        s.lastRiskCommDay === s.day || s.lastRiskCommDay === s.day - 1
      if (targeted) trust -= 4
      else trust -= 6
      // Shadow without data: extra trust loss
      if (
        s.pathogenId === 'shadow' &&
        !s.surveillanceActive &&
        s.testingLevel < 0.35
      ) {
        trust -= 3
      }
      let power = 1 - 0.48 * scopeMult
      if (mandate) {
        const reduction = 1 - power
        power = 1 - reduction * 1.25
      }
      if (s.crisisFlags.justFluActive) {
        const reduction = 1 - power
        power = 1 - reduction * 0.75
      }
      effects.push({
        id: `close-${s.day}`,
        kind: 'closures',
        daysLeft: 5,
        districtId: districtId ?? 'city',
        rMult: power,
      })
      if (!hadComm) {
        s = {
          ...s,
          crisisFlags: { ...s.crisisFlags, overreachArmed: true },
        }
        log = 'Closures active — Overreach rumor armed (no recent comms).'
      } else {
        log = 'Closures with clear rationale — Trust hit contained.'
      }
      press = targeted
        ? `Venues shuttered in district ${districtId}.`
        : 'Citywide closures — nightlife and schools dark.'
      s = { ...s, lastClosureHadComm: hadComm }
      break
    }
    case 'travel_screen': {
      trust -= 3
      effects.push({
        id: `travel-${s.day}`,
        kind: 'travel_screen',
        daysLeft: 3,
        districtId: 'A',
        rMult: 0.9,
        meta: { econPressure: true },
      })
      log = 'Travel screening at Gatewell Hub — import seeds cut. Econ pressure possible.'
      press = 'Hub controls: screening lines snake through Gatewell.'
      break
    }
    case 'sentinel': {
      trust += 1
      effects.push({
        id: `sent-${s.day}`,
        kind: 'sentinel',
        daysLeft: 5,
        districtId: 'city',
        fogReduction: true,
      })
      s = {
        ...s,
        surveillanceActive: true,
        surveillanceDays: 5,
      }
      log = 'Sentinel / wastewater online — district pressure bands unlocked 5 days.'
      press = 'Wastewater signals mapped. Fog thins.'
      break
    }
    case 'equity': {
      const clearDebt = s.crisisFlags.inequityDebt
      // Citywide Trust +3; +8 in D when focused
      trust += 3
      if (districtId === 'D' || !targeted) {
        trust += targeted && districtId === 'D' ? 5 : 3
        s = {
          ...s,
          districts: {
            ...s.districts,
            D: {
              ...s.districts.D,
              localTrustMod: Math.min(10, s.districts.D.localTrustMod + 8),
            },
          },
        }
      }
      effects.push({
        id: `eq-${s.day}`,
        kind: 'equity',
        daysLeft: 4,
        districtId: districtId ?? 'city',
        rMult: districtId === 'D' || !targeted ? 0.9 : 0.95,
        complianceBonus: 0.05,
      })
      if (clearDebt) {
        s = {
          ...s,
          crisisFlags: { ...s.crisisFlags, inequityDebt: false },
        }
        // strip debt effects from working list
        for (let i = effects.length - 1; i >= 0; i--) {
          if (effects[i].equityDebt) effects.splice(i, 1)
        }
        log = 'Equity Outreach — inequity debt cleared. Rivermark compliance up.'
      } else {
        log = 'Equity Outreach deployed — testing uptake & compliance where bias is worst.'
      }
      press = 'Outreach teams in Rivermark. Trust repair underway.'
      break
    }
    case 'emergency': {
      trust -= 12
      effects.push({
        id: `em-${s.day}`,
        kind: 'emergency',
        daysLeft: 5,
        districtId: 'city',
        opsCostDiscount: 1,
        mandateBoost: true,
        trustDrainPerDay: 2,
      })
      s = { ...s, usedEmergency: true }
      // Power grab if day <= 4
      if (s.day <= 4 && !s.crisisFlags.powerGrabFired) {
        trust -= 15
        s = {
          ...s,
          crisisFlags: { ...s.crisisFlags, powerGrabFired: true },
        }
        log = 'Emergency declared EARLY — Power Grab (−15 Trust). Desperation tool.'
        press = 'POWER GRAB: Declaration with thin case visibility. Outrage.'
      } else if (totalVis(s) < 20 && s.day <= 6) {
        trust -= 15
        log = 'Emergency with low visibility — massive overreach (−15).'
        press = 'Declaration without a visible curve — city smells a power grab.'
      } else {
        log = 'Emergency Declaration — Ops discount & mandate power for 5 days. Trust bleeding.'
        press = 'STATE OF EMERGENCY. Mandate options unlocked. Clock is loud.'
      }
      break
    }
  }

  trust = clampTrust(trust)
  s = {
    ...s,
    trust,
    effects,
    pressCrawl: press,
    logs: [
      ...s.logs,
      {
        day: s.day,
        kind: trust < state.trust ? 'alert' : 'info',
        text: `${def.name}${targeted ? ` @${districtId}` : ''}: ${log} (−${cost} Ops)`,
      },
    ],
  }

  const lose = checkInstantLose(s)
  if (lose) return { ok: true, state: applyLose(s, lose) }

  return { ok: true, state: s }
}

function totalVis(state: GameState): number {
  return (['A', 'B', 'C', 'D', 'E'] as const).reduce(
    (n, id) => n + state.districts[id].visible,
    0,
  )
}

/** End player phase and roll dawn. */
export function endDay(state: GameState): GameState {
  if (state.ended) return state
  // dynamic import avoided — caller uses advanceDawn
  return state
}
