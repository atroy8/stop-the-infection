import { PATHOGENS, type PathogenId } from '../../sim'
import { useState } from 'react'

interface Props {
  onStart: (id: PathogenId) => void
}

export function TitleScreen({ onStart }: Props) {
  const [pick, setPick] = useState<PathogenId>('flash')

  return (
    <div className="title-screen">
      <div className="brand">Incident Command</div>
      <h1>Patient Zero</h1>
      <p className="tag">
        An unknown pathogen is moving through the city. Ops are thin. Trust is
        thinner. Contain the curve — or watch the city tear itself apart.
      </p>
      <div className="pathogen-pick">
        {(['flash', 'shadow'] as PathogenId[]).map((id) => {
          const p = PATHOGENS[id]
          return (
            <button
              key={id}
              type="button"
              className={`path-card ${pick === id ? 'selected' : ''}`}
              onClick={() => setPick(id)}
            >
              <h3>{p.name}</h3>
              <div className="sub">{p.tagline}</div>
              <p>{p.description}</p>
            </button>
          )
        })}
      </div>
      <button type="button" className="primary" onClick={() => onStart(pick)}>
        Open incident — {PATHOGENS[pick].name}
      </button>
      <p className="tag" style={{ fontSize: '0.8rem' }}>
        Dawn loop: spread → visibility → hospitals → rumor → Ops regen → you act
        (max 2 / day). Win: 3 dawns declining new infections, hospital ≤70%, Trust ≥25.
      </p>
    </div>
  )
}
