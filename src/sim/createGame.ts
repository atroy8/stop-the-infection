import { DISTRICTS, DISTRICT_ORDER, cityPopulation } from './districts'
import { PATHOGENS } from './pathogens'
import type {
  DistrictId,
  DistrictState,
  GameState,
  PathogenId,
} from './types'
import { nextRng } from './rng'

function seedDistricts(
  pathogenId: PathogenId,
  rng: number,
): { districts: Record<DistrictId, DistrictState>; rng: number; seedTrue: number } {
  const districts = {} as Record<DistrictId, DistrictState>
  for (const id of DISTRICT_ORDER) {
    districts[id] = {
      id,
      trueActive: 0,
      visible: 0,
      cumulativeInfected: 0,
      recovered: 0,
      localTrustMod: DISTRICTS[id].trustBias,
    }
  }

  let state = rng
  // Seed patient(s)
  if (pathogenId === 'flash') {
    // Hub + core spark
    districts.A.trueActive = 28
    districts.A.cumulativeInfected = 28
    districts.A.visible = 9
    districts.B.trueActive = 20
    districts.B.cumulativeInfected = 20
    districts.B.visible = 7
  } else {
    // Shadow hides in fringe + underserved
    districts.E.trueActive = 35
    districts.E.cumulativeInfected = 35
    districts.E.visible = 1
    districts.D.trueActive = 24
    districts.D.cumulativeInfected = 24
    districts.D.visible = 2
    const r = nextRng(state)
    state = r.state
    if (r.value > 0.4) {
      districts.B.trueActive = 5
      districts.B.cumulativeInfected = 5
    }
  }

  const seedTrue = DISTRICT_ORDER.reduce((s, id) => s + districts[id].trueActive, 0)
  return { districts, rng: state, seedTrue }
}

export function createGame(pathogenId: PathogenId, seed?: number): GameState {
  const s = seed ?? (Date.now() ^ (Math.random() * 0xffffffff)) | 0
  const { districts, rng, seedTrue } = seedDistricts(pathogenId, s)
  const pop = cityPopulation()
  const pathogen = PATHOGENS[pathogenId]

  return {
    phase: 'playing',
    pathogenId,
    day: 1,
    ops: pathogenId === 'shadow' ? 7 : 6,
    trust: pathogenId === 'shadow' ? 60 : 55,
    districts,
    hospitalLoad: 18 + Math.round(seedTrue * pathogen.severity * 0.4),
    hospitalCapacityBonus: 0,
    effects: [],
    cooldowns: {},
    actionsToday: 0,
    maxActionsPerDay: 2,
    testingLevel: pathogenId === 'flash' ? 0.35 : 0.18,
    surveillanceActive: false,
    surveillanceDays: 0,
    usedEmergency: false,
    everHospital95: false,
    hospitalOverrunStreak: 0,
    decliningStreak: 0,
    prevNewTrue: null,
    todayNewTrue: 0,
    peakHospital: 20,
    peakVisible: DISTRICT_ORDER.reduce((n, id) => n + districts[id].visible, 0),
    cumulativeInfected: seedTrue,
    failCap: Math.floor(pop * 0.4),
    dayLimit: 20,
    logs: [
      {
        day: 1,
        kind: 'alert',
        text: `INCIDENT OPEN — pathogen archetype ${pathogen.name}. Incomplete signals. You have the chair.`,
      },
    ],
    pressCrawl:
      'BREAKING: Unusual respiratory cluster under investigation — officials urge calm as labs scramble.',
    crisisFlags: {
      overreachArmed: false,
      inequityDebt: false,
      coverUpActive: false,
      justFluActive: false,
      powerGrabFired: false,
      credibilityReady: false,
      containStreakDays: 0,
    },
    lastRiskCommDay: -99,
    isolationHasSupport: true,
    lastClosureHadComm: false,
    riskCommYesterday: false,
    winReady: false,
    endTier: null,
    loseReason: null,
    ended: false,
    seed: s,
    rngState: rng,
  }
}
