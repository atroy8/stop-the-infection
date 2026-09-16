# Patient Zero — Build Notes

Scaffolded fresh at `/workspace/stop-the-infection` (Vite + React + TypeScript). Not a GitHub clone.

## Implemented

### Simulation (`src/sim/`)
- **Dawn loop:** spread → visibility → hospitals → rumor deck → Ops regen → player acts (max 2/day).
- **5 districts (A–E):** Gatewell Hub, Coreline, Ashmere, Rivermark, Forge Reach — density, beds, trust bias.
- **Meters:** Ops (0–12), Trust (0–100), visible cases, hospital load %; fog-of-war; sentinel pressure bands.
- **All 10 interventions** with Ops/Trust/cooldown/side effects from the matrix; citywide + targeted where allowed.
- **Pathogens:** Flash + Shadow with distinct R, visibility, severity.
- **Win:** 3 controlled dawns (non-increasing new true in band, day≥6), hospital ≤70%, Trust ≥25.
- **Lose:** Trust≤0, hospital≥100% two dawns, FailCap (40% cumulative), or day-limit unresolved.
- **End tiers:** S / A / B / C / L with Emergency & peak-hospital pyrrhic rules.
- **Crisis/rumor deck:** Overreach, “just a flu”, triage scare, inequity expose, power grab, credibility.

### UI (`src/ui/`)
- Title / pathogen select, district map, meters, intervention panel, press crawl, log, end card.
- Dark thriller styling (alerts, red crawl) — no classroom tone, no COVID skin.
- New game / abort flow.

### Quality
- Vitest unit tests: win/lose + interventions (`npm test`).
- `src/sim/` separated from `src/ui/`.
- README with run instructions.

## Balance notes
Intervention stacking + suppression tuned so a coherent strategy (comms + isolation + Flash closures / Shadow sentinel+trace) can finish a run; ignoring hospitals/Trust still fails. Numbers are draft — expect playtest knobs on baseR, closure Trust cost, and FailCap.
