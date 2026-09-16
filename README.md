# Patient Zero

Single-player browser strategy game: you are the incident commander containing an outbreak across a five-district city. Thriller tone — not a classroom sim, not a COVID skin.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm test` | Run Vitest unit tests |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## How to play

1. Pick a pathogen: **Flash** (fast, visible) or **Shadow** (stealthy, severe).
2. Each day: play up to **2 interventions**, then **End day → Dawn**.
3. Dawn resolves spread → visibility → hospitals → rumors → Ops regen.
4. Watch **Ops**, **Trust**, **Visible cases**, **Hospital %**. True infections stay fogged until Sentinel is up.
5. **Win:** 3 dawns of controlled (non-increasing) new infections, hospital ≤70%, Trust ≥25.
6. **Lose:** Trust ≤0, hospital ≥100% for two dawns, FailCap breach, or day 20 unresolved.

## Stack

Vite + React + TypeScript. Client-side only. Simulation lives in `src/sim/`; UI in `src/ui/`.

## Design sources

Authoritative docs (not copied into this repo as gameplay code):

- `job-search/outbreak-game/GDD-ONE-PAGER.md`
- `job-search/outbreak-game/INTERVENTIONS-AND-WINLOSE.md`
- `job-search/outbreak-game/BUSINESS-BRIEF.md`
