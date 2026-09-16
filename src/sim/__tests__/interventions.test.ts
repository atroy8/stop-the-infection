import { describe, it, expect } from 'vitest'
import { createGame } from '../createGame'
import { applyIntervention, canPlay } from '../applyIntervention'
import { advanceDawn } from '../dawn'
import { INTERVENTIONS } from '../interventions'

describe('interventions', () => {
  it('Test Surge spends Ops and raises testing / effects', () => {
    const g = createGame('shadow', 99)
    const before = g.ops
    const res = applyIntervention(g, 'test_surge')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.state.ops).toBe(before - INTERVENTIONS.test_surge.opsCost)
    expect(res.state.effects.some((e) => e.kind === 'test_surge')).toBe(true)
    expect(res.state.actionsToday).toBe(1)
    expect(res.state.cooldowns.test_surge).toBe(2)
  })

  it('blocks third action in a day', () => {
    let g = createGame('flash', 7)
    const r1 = applyIntervention(g, 'risk_comm')
    expect(r1.ok).toBe(true)
    if (!r1.ok) return
    g = r1.state
    const r2 = applyIntervention(g, 'sentinel')
    expect(r2.ok).toBe(true)
    if (!r2.ok) return
    g = r2.state
    const gate = canPlay(g, 'travel_screen')
    expect(gate.ok).toBe(false)
  })

  it('targeted costs 1 less Ops (min 1)', () => {
    const g = createGame('flash', 3)
    const city = applyIntervention(g, 'closures', { targeted: false })
    const tgt = applyIntervention(g, 'closures', {
      targeted: true,
      districtId: 'B',
    })
    expect(city.ok && tgt.ok).toBe(true)
    if (!city.ok || !tgt.ok) return
    expect(g.ops - city.state.ops).toBe(2)
    expect(g.ops - tgt.state.ops).toBe(1)
  })

  it('Emergency can only be used once', () => {
    let g = createGame('flash', 11)
    // give enough trust buffer
    g = { ...g, trust: 80, day: 8 }
    const r1 = applyIntervention(g, 'emergency')
    expect(r1.ok).toBe(true)
    if (!r1.ok) return
    g = r1.state
    // advance past cooldown artificially
    g = { ...g, cooldowns: {}, actionsToday: 0, usedEmergency: true }
    const gate = canPlay(g, 'emergency')
    expect(gate.ok).toBe(false)
  })

  it('dawn advances day and regenerates Ops when not overrun', () => {
    let g = createGame('flash', 21)
    g = { ...g, ops: 4, hospitalLoad: 40 }
    const next = advanceDawn(g)
    expect(next.day).toBe(g.day + 1)
    expect(next.ops).toBeGreaterThanOrEqual(5)
    expect(next.actionsToday).toBe(0)
  })

  it('Risk Communication increases trust when no cover-up', () => {
    const g = createGame('flash', 5)
    const before = g.trust
    const res = applyIntervention(g, 'risk_comm')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.state.trust).toBeGreaterThan(before)
  })
})
