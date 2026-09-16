import type { GameState } from '../../sim'

export function LogPanel({ state }: { state: GameState }) {
  const recent = state.logs.slice(-12).reverse()
  return (
    <div className="panel log-panel">
      {recent.map((e, i) => (
        <div key={`${e.day}-${i}-${e.text.slice(0, 12)}`} className={e.kind}>
          D{e.day}: {e.text}
        </div>
      ))}
    </div>
  )
}
