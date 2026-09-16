import { describe, it, expect } from 'vitest'
import { createGame } from '../createGame'
import {
  checkInstantLose,
  updateDecliningStreak,
  computeEndTier,
  applyLose,
  applyWin,
} from '../winLose'
import type { GameState } from '../types'

function base(over: Partial<GameState> = {}): GameState {
  return { ...createGame('flash', 42), ...over }
}

describe('checkInstantLose', () => {
  it('loses when trust <= 0', () => {
    expect(checkInstantLose(base({ trust: 0 }))).toBe('trust_collapse')
    expect(checkInstantLose(base({ trust: -1 }))).toBe('trust_collapse')
  })

  it('loses when hospital overrun streak >= 2', () => {
    expect(
      checkInstantLose(base({ hospitalOverrunStreak: 2, trust: 40 })),
    ).toBe('hospital_overrun')
  })

  it('loses when cumulative infected hits failCap', () => {
    const s = base({ trust: 50, hospitalOverrunStreak: 0 })
    expect(
      checkInstantLose({ ...s, cumulativeInfected: s.failCap }),
    ).toBe('fail_cap')
  })

  it('returns null when stable', () => {
    expect(
      checkInstantLose(
        base({ trust: 40, hospitalOverrunStreak: 0, cumulativeInfected: 100 }),
      ),
    ).toBeNull()
  })
})

describe('updateDecliningStreak / win', () => {
  it('increments streak when controlled non-increasing after day 6', () => {
    const s = updateDecliningStreak(
      base({
        day: 8,
        prevNewTrue: 40,
        todayNewTrue: 30,
        hospitalLoad: 50,
        trust: 40,
        decliningStreak: 1,
        cumulativeInfected: 200,
      }),
    )
    expect(s.decliningStreak).toBe(2)
    expect(s.winReady).toBe(false)
  })

  it('sets winReady after 3 consecutive controlled dawns', () => {
    const s = updateDecliningStreak(
      base({
        day: 10,
        prevNewTrue: 20,
        todayNewTrue: 10,
        hospitalLoad: 60,
        trust: 30,
        decliningStreak: 2,
        cumulativeInfected: 200,
      }),
    )
    expect(s.decliningStreak).toBe(3)
    expect(s.winReady).toBe(true)
  })

  it('resets streak if hospital too high', () => {
    const s = updateDecliningStreak(
      base({
        day: 10,
        prevNewTrue: 40,
        todayNewTrue: 20,
        hospitalLoad: 80,
        trust: 40,
        decliningStreak: 2,
        cumulativeInfected: 200,
      }),
    )
    expect(s.decliningStreak).toBe(0)
    expect(s.winReady).toBe(false)
  })
})

describe('computeEndTier', () => {
  it('S tier: win by day 14, trust >= 50, no emergency', () => {
    expect(
      computeEndTier(
        base({ day: 12, trust: 55, usedEmergency: false, everHospital95: false }),
        true,
      ),
    ).toBe('S')
  })

  it('A tier: trust >= 35', () => {
    expect(
      computeEndTier(
        base({ day: 16, trust: 40, usedEmergency: false, everHospital95: false }),
        true,
      ),
    ).toBe('A')
  })

  it('C tier when emergency used', () => {
    expect(
      computeEndTier(
        base({ day: 12, trust: 55, usedEmergency: true, everHospital95: false }),
        true,
      ),
    ).toBe('C')
  })

  it('L when not won', () => {
    expect(computeEndTier(base(), false)).toBe('L')
  })
})

describe('applyWin / applyLose', () => {
  it('marks ended on win', () => {
    const s = applyWin(base({ day: 10, trust: 60, usedEmergency: false }))
    expect(s.ended).toBe(true)
    expect(s.phase).toBe('ended')
    expect(s.endTier).toBe('S')
  })

  it('marks ended on lose', () => {
    const s = applyLose(base({ trust: 0 }), 'trust_collapse')
    expect(s.ended).toBe(true)
    expect(s.loseReason).toBe('trust_collapse')
    expect(s.endTier).toBe('L')
  })
})
