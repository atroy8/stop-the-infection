import type { GameState } from '../../sim'
import { totalVisible } from '../../sim'

interface Props {
  state: GameState
}

export function Meters({ state }: Props) {
  const vis = totalVisible(state)
  const trustClass =
    state.trust <= 15 ? 'crit' : state.trust < 30 ? 'warn' : ''
  const hospClass =
    state.hospitalLoad >= 100
      ? 'crit'
      : state.hospitalLoad >= 80
        ? 'warn'
        : ''

  return (
    <div className="meters">
      <div className="meter ops">
        <div className="label">Ops</div>
        <div className="value">
          {state.ops}
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}> /12</span>
        </div>
        <div className="bar">
          <span style={{ width: `${(state.ops / 12) * 100}%` }} />
        </div>
      </div>
      <div className={`meter trust ${trustClass}`}>
        <div className="label">Trust</div>
        <div className="value">{Math.round(state.trust)}</div>
        <div className="bar">
          <span style={{ width: `${Math.min(100, state.trust)}%` }} />
        </div>
      </div>
      <div className="meter cases">
        <div className="label">Visible cases</div>
        <div className="value">{vis}</div>
        <div className="bar">
          <span style={{ width: `${Math.min(100, (vis / 200) * 100)}%` }} />
        </div>
      </div>
      <div className={`meter hosp ${hospClass}`}>
        <div className="label">Hospital load</div>
        <div className="value">{Math.round(state.hospitalLoad)}%</div>
        <div className="bar">
          <span style={{ width: `${Math.min(100, state.hospitalLoad)}%` }} />
        </div>
      </div>
    </div>
  )
}
