import type { GameState, GameLogEntry } from './types'
import { DISTRICT_ORDER } from './districts'
import { totalTrueActive, totalVisible } from './selectors'
import { nextRng } from './rng'

function pushLog(state: GameState, entry: Omit<GameLogEntry, 'day'>): GameState {
  return {
    ...state,
    logs: [...state.logs, { ...entry, day: state.day }],
  }
}

/** Pull crisis events when conditions met (dawn rumor check). */
export function resolveRumors(state: GameState): GameState {
  let s = state
  let rng = s.rngState

  // Overreach from closures without comm
  if (s.crisisFlags.overreachArmed) {
    s = {
      ...s,
      trust: s.trust - 8,
      crisisFlags: { ...s.crisisFlags, overreachArmed: false },
      effects: [
        ...s.effects,
        {
          id: `overreach-${s.day}`,
          kind: 'crisis',
          daysLeft: 3,
          closureOpsPenalty: true,
        },
      ],
      pressCrawl:
        'RUMOR: "Overreach" — venues closed without a clear public case. Backlash mounting.',
    }
    s = pushLog(s, {
      kind: 'crisis',
      text: 'CRISIS: Overreach — −8 Trust. Next closures cost +1 Ops.',
    })
  }

  // True high, visible low → "just a flu"
  const trueA = totalTrueActive(s)
  const vis = totalVisible(s)
  if (trueA > 80 && vis < trueA * 0.2 && !s.crisisFlags.justFluActive) {
    const r = nextRng(rng)
    rng = r.state
    if (r.value < 0.55 || trueA > 150) {
      s = {
        ...s,
        rngState: rng,
        crisisFlags: { ...s.crisisFlags, justFluActive: true },
        effects: [
          ...s.effects,
          {
            id: `flu-${s.day}`,
            kind: 'crisis',
            daysLeft: 3,
            meta: { justFlu: true },
          },
        ],
        pressCrawl:
          'VIRAL: "It\'s just a flu" — compliance softens across districts.',
      }
      s = pushLog(s, {
        kind: 'crisis',
        text: 'CRISIS: "It\'s just a flu" — all −R effects −25% for 3 days.',
      })
    }
  }

  // Hospital triage scare
  if (s.hospitalLoad >= 90) {
    const r = nextRng(rng)
    rng = r.state
    if (r.value < 0.7) {
      s = {
        ...s,
        rngState: rng,
        trust: s.trust - 10,
        effects: [
          ...s.effects.filter((e) => e.id !== `triage-block-${s.day}`),
          {
            id: `triage-block-${s.day}`,
            kind: 'crisis',
            daysLeft: 1,
            meta: { blockOpsRegen: true },
          },
        ],
        pressCrawl:
          'ALERT: Triage protocols leaked — public panic as beds vanish.',
      }
      s = pushLog(s, {
        kind: 'crisis',
        text: 'CRISIS: Triage scare — −10 Trust; Ops regen blocked 1 day.',
      })
    }
  }

  // Equity ignored + D hot
  const dHot =
    s.districts.D.trueActive > 40 ||
    s.districts.D.trueActive / 20000 > 0.008
  const everEquity = s.logs.some((l) => l.text.includes('Equity Outreach'))
  if (dHot && !everEquity && s.day >= 5) {
    if (!s.crisisFlags.inequityDebt) {
      s = {
        ...s,
        trust: s.trust - 12,
        crisisFlags: { ...s.crisisFlags, inequityDebt: true },
        effects: [
          ...s.effects,
          {
            id: `inequity-${s.day}`,
            kind: 'crisis',
            daysLeft: 99,
            equityDebt: true,
            trustDrainPerDay: 2,
          },
        ],
        pressCrawl:
          'EXPOSE: Rivermark left behind — inequity story dominates the crawl.',
      }
      s = pushLog(s, {
        kind: 'crisis',
        text: 'CRISIS: Inequity expose — −12 Trust. Play Equity Outreach or lose 2 Trust/day.',
      })
    }
  }

  // Credibility positive after contain streak
  if (
    s.decliningStreak >= 2 &&
    s.lastRiskCommDay === s.day - 1 &&
    !s.crisisFlags.credibilityReady
  ) {
    s = {
      ...s,
      trust: Math.min(100, s.trust + 5),
      crisisFlags: { ...s.crisisFlags, credibilityReady: true },
      pressCrawl:
        'PRESS: Messaging lands — credibility bump as numbers ease.',
    }
    s = pushLog(s, {
      kind: 'good',
      text: 'EVENT: Credibility — +5 Trust after contain streak + communication.',
    })
  }

  // Sync justFlu from effects
  const fluOn = s.effects.some((e) => e.meta?.justFlu)
  if (s.crisisFlags.justFluActive && !fluOn) {
    s = { ...s, crisisFlags: { ...s.crisisFlags, justFluActive: false } }
  }

  s = { ...s, rngState: rng }
  return s
}

export function districtHottest(state: GameState): string {
  let best = DISTRICT_ORDER[0]
  let max = -1
  for (const id of DISTRICT_ORDER) {
    if (state.districts[id].trueActive > max) {
      max = state.districts[id].trueActive
      best = id
    }
  }
  return best
}
