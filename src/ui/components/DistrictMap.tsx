import {
  DISTRICT_ORDER,
  DISTRICTS,
  sentinelBand,
  type DistrictId,
  type GameState,
} from '../../sim'

interface Props {
  state: GameState
  selected: DistrictId | null
  onSelect: (id: DistrictId) => void
}

export function DistrictMap({ state, selected, onSelect }: Props) {
  return (
    <div className="panel">
      <h2>City districts</h2>
      <div className="district-grid">
        {DISTRICT_ORDER.map((id) => {
          const def = DISTRICTS[id]
          const d = state.districts[id]
          const band = sentinelBand(state, id)
          const hot = d.visible >= 25 || (band === 'high')
          return (
            <button
              key={id}
              type="button"
              className={`district ${selected === id ? 'selected' : ''} ${hot ? 'hot' : ''}`}
              onClick={() => onSelect(id)}
            >
              <div className="name">
                {id} · {def.name}
              </div>
              <div className="type">
                {def.type} · dens {def.density.toFixed(2)}
              </div>
              <div className="stats">
                <span>Vis {d.visible}</span>
                <span className={`band ${band}`}>
                  {state.surveillanceActive ? `sig ${band}` : 'fog'}
                </span>
              </div>
            </button>
          )
        })}
      </div>
      <p className="fog-note">
        {state.surveillanceActive
          ? `Sentinel active — pressure bands visible (${state.surveillanceDays}d left). True counts stay classified.`
          : 'Fog of war: you see reported cases only. Deploy Sentinel / wastewater to reveal pressure bands.'}
      </p>
    </div>
  )
}
