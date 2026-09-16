import {
  estimateExcessSevere,
  PATHOGENS,
  type GameState,
} from '../../sim'

interface Props {
  state: GameState
  onNewGame: () => void
}

const TIER_NAME: Record<string, string> = {
  S: 'Clean contain',
  A: 'Solid',
  B: 'Contained',
  C: 'Pyrrhic',
  L: 'Failed',
}

export function EndCard({ state, onNewGame }: Props) {
  const won = state.endTier !== 'L' && state.endTier !== null
  const pathogen = PATHOGENS[state.pathogenId]

  return (
    <div className="end-overlay">
      <div className={`end-card ${won ? 'win' : 'lose'}`}>
        <h2>{won ? 'Controlled' : 'Incident failed'}</h2>
        <div className="tier">{state.endTier ?? 'L'}</div>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          {TIER_NAME[state.endTier ?? 'L']} · {pathogen.name}
          {!won && state.loseReason ? ` · ${state.loseReason.replace(/_/g, ' ')}` : ''}
        </p>
        <div className="end-stats">
          <div>
            <div className="k">Days to resolve</div>
            <div className="v">{state.day}</div>
          </div>
          <div>
            <div className="k">Final Trust</div>
            <div className="v">{Math.round(state.trust)}</div>
          </div>
          <div>
            <div className="k">Peak hospital</div>
            <div className="v">{Math.round(state.peakHospital)}%</div>
          </div>
          <div>
            <div className="k">Excess severe (est.)</div>
            <div className="v">{estimateExcessSevere(state)}</div>
          </div>
        </div>
        <div className="actions">
          <button type="button" className="primary" onClick={onNewGame}>
            New game
          </button>
        </div>
      </div>
    </div>
  )
}
