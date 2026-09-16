import { useCallback, useState } from 'react'
import {
  advanceDawn,
  applyIntervention,
  createGame,
  PATHOGENS,
  type DistrictId,
  type GameState,
  type InterventionId,
  type PathogenId,
} from '../sim'
import { TitleScreen } from './components/TitleScreen'
import { Meters } from './components/Meters'
import { DistrictMap } from './components/DistrictMap'
import { InterventionPanel } from './components/InterventionPanel'
import { LogPanel } from './components/LogPanel'
import { EndCard } from './components/EndCard'

export function GameApp() {
  const [state, setState] = useState<GameState | null>(null)
  const [selected, setSelected] = useState<DistrictId | null>('B')
  const [withSupport, setWithSupport] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  const start = useCallback((id: PathogenId) => {
    setState(createGame(id))
    setSelected('B')
    setToast(null)
  }, [])

  const play = useCallback(
    (id: InterventionId, targeted: boolean) => {
      if (!state || state.ended) return
      const res = applyIntervention(state, id, {
        targeted,
        districtId: selected ?? undefined,
        withSupport,
      })
      if (!res.ok) {
        setToast(res.reason)
        return
      }
      setToast(null)
      setState(res.state)
    },
    [state, selected, withSupport],
  )

  const endDay = useCallback(() => {
    if (!state || state.ended) return
    setState(advanceDawn(state))
    setToast(null)
  }, [state])

  if (!state) {
    return (
      <div className="app-shell">
        <TitleScreen onStart={start} />
      </div>
    )
  }

  const pathogen = PATHOGENS[state.pathogenId]

  return (
    <div className="app-shell">
      <div className="top-bar">
        <div className="brand">Patient Zero</div>
        <div className="day-badge">
          Day {state.day} · {pathogen.name} · Actions {state.actionsToday}/
          {state.maxActionsPerDay}
        </div>
        <button type="button" onClick={() => setState(null)}>
          Abort / New
        </button>
      </div>

      <div className="press-crawl">{state.pressCrawl}</div>

      <Meters state={state} />

      {(state.decliningStreak > 0 || state.hospitalOverrunStreak > 0) && (
        <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '1rem' }}>
          {state.decliningStreak > 0 && (
            <span className="streak">
              Contain streak: {state.decliningStreak}/3 dawns
            </span>
          )}
          {state.hospitalOverrunStreak > 0 && (
            <span className="streak bad">
              Overrun dawns: {state.hospitalOverrunStreak}/2
            </span>
          )}
        </div>
      )}

      <div className="layout">
        <div>
          <DistrictMap
            state={state}
            selected={selected}
            onSelect={setSelected}
          />
          <div className="toggle-row" style={{ marginTop: '0.75rem' }}>
            <label>
              <input
                type="checkbox"
                checked={withSupport}
                onChange={(e) => setWithSupport(e.target.checked)}
              />
              Fund isolation support packages
            </label>
          </div>
          <div className="action-bar">
            <button
              type="button"
              className="primary"
              disabled={state.ended}
              onClick={endDay}
            >
              End day → Dawn
            </button>
            <span className="hint">
              {toast ??
                'Play up to 2 interventions, then advance dawn. Fog hides true infections.'}
            </span>
          </div>
          <LogPanel state={state} />
        </div>
        <InterventionPanel
          state={state}
          selectedDistrict={selected}
          withSupport={withSupport}
          onPlay={play}
        />
      </div>

      {state.ended && (
        <EndCard state={state} onNewGame={() => setState(null)} />
      )}
    </div>
  )
}
