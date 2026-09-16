import {
  INTERVENTION_ORDER,
  INTERVENTIONS,
  canPlay,
  opsCostFor,
  opsDiscount,
  type DistrictId,
  type GameState,
  type InterventionId,
} from '../../sim'

interface Props {
  state: GameState
  selectedDistrict: DistrictId | null
  withSupport: boolean
  onPlay: (id: InterventionId, targeted: boolean) => void
}

export function InterventionPanel({
  state,
  selectedDistrict,
  withSupport,
  onPlay,
}: Props) {
  const discount = opsDiscount(state)

  return (
    <div className="panel">
      <h2>Interventions</h2>
      <div className="iv-list">
        {INTERVENTION_ORDER.map((id) => {
          const def = INTERVENTIONS[id]
          const cityCost = opsCostFor(id, false, discount)
          const tgtCost = opsCostFor(id, true, discount)
          const cd = state.cooldowns[id] ?? 0
          const cityGate = canPlay(state, id, { targeted: false })
          const tgtGate = canPlay(state, id, {
            targeted: true,
            districtId: selectedDistrict ?? undefined,
          })

          return (
            <div key={id} className="iv">
              <div>
                <div className="title">{def.name}</div>
                <div className="meta">
                  Ops {cityCost}
                  {def.canTarget ? ` · tgt ${tgtCost}` : ''} · CD {def.cooldown}d
                  {cd > 0 ? ` · locked ${cd}d` : ''} · Trust Δ {def.trustDelta >= 0 ? '+' : ''}
                  {def.trustDelta}
                </div>
              </div>
              <div className="iv-actions">
                <button
                  type="button"
                  disabled={!cityGate.ok}
                  title={!cityGate.ok ? cityGate.reason : def.description}
                  onClick={() => onPlay(id, false)}
                >
                  Citywide
                </button>
                {def.canTarget && (
                  <button
                    type="button"
                    disabled={!tgtGate.ok}
                    title={
                      !tgtGate.ok
                        ? tgtGate.reason
                        : `Target ${selectedDistrict ?? '?'}: ${def.description}`
                    }
                    onClick={() => onPlay(id, true)}
                  >
                    Target {selectedDistrict ?? '—'}
                  </button>
                )}
              </div>
              <div className="desc">
                {def.description}
                {id === 'isolation_support'
                  ? withSupport
                    ? ' [support ON]'
                    : ' [support OFF — Trust risk]'
                  : ''}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
