import React, { useMemo, useState, useEffect } from "react";

/**
 * SOLVE THE OUTBREAK — MVP WEB APP (single-file React)
 * ---------------------------------------------------
 * Quick-start, data‑driven interactive investigation game.
 *
 * Design goals:
 * - Single React file for easy drop-in.
 * - Tailwind classes for styling (no imports needed in ChatGPT canvas).
 * - Data-first scenes; easy to expand content without touching logic.
 * - Core mechanics: Time remaining, Credibility, Evidence, Leads.
 * - Win condition: correctly identify Pathogen, Source, and Vehicle before time runs out.
 *
 * How to extend:
 * - Add new scenes, actions, and NPC dialog in GAME_DATA.
 * - Tweak difficulty by adjusting STARTING_STATE.
 * - Swap THEORIES catalogue to match your course case studies.
 */

// ====== GAME SETUP ======
const STARTING_STATE = {
  time: 8 * 60, // minutes
  credibility: 50, // 0-100
  location: "briefing",
  evidence: {}, // key -> {label, value, weight}
  visited: new Set(["briefing"]),
  leads: [],
  notes: [],
  chosenTheory: { pathogen: null, source: null, vehicle: null },
  solved: false,
  ended: false,
  message: "",
};

const THEORIES = {
  pathogens: [
    { id: "noro", label: "Norovirus" },
    { id: "salmonella", label: "Salmonella" },
    { id: "stec", label: "E. coli (STEC)" },
    { id: "sapo", label: "Sapovirus" },
  ],
  sources: [
    { id: "cater", label: "Catering Staff" },
    { id: "produce", label: "Produce Supplier" },
    { id: "water", label: "Venue Water System" },
  ],
  vehicles: [
    { id: "salad", label: "Mixed Green Salad" },
    { id: "oysters", label: "Raw Oysters" },
    { id: "sandwich", label: "Turkey Sandwiches" },
  ],
};

// The canonical truth for the MVP scenario (tweak for variants)
const CASE_TRUTH = {
  pathogen: "noro",
  source: "cater",
  vehicle: "salad",
};

// Game content
const GAME_DATA = {
  locations: {
    briefing: {
      title: "City EOC — Morning Briefing",
      desc:
        "An AI developer conference reported 120+ GI illnesses after a catered lunch at the convention center yesterday. The Mayor wants answers before the evening news.",
      actions: [
        {
          id: "to_map",
          label: "Open city map",
          time: 2,
          handler: (s) => ({ ...s, location: "map" }),
        },
        {
          id: "review_attendee_list",
          label: "Skim attendee list & vendors",
          time: 5,
          credibility: +2,
          addEvidence: { key: "vendors", label: "Vendors", value: "Caterer + Produce Supplier", weight: 2 },
        },
      ],
    },
    map: {
      title: "City Map",
      desc: "Choose where to go next.",
      actions: [
        { id: "go_convention", label: "Convention Center (interviews)", time: 10, go: "convention" },
        { id: "go_hospital", label: "Hospital ER (clinical picture)", time: 10, go: "hospital" },
        { id: "go_lab", label: "Public Health Lab (testing)", time: 6, go: "lab" },
        { id: "go_cater", label: "Caterer Kitchen (inspection)", time: 12, go: "caterer" },
        { id: "go_mayor", label: "Mayor's Office (briefing)", time: 8, go: "mayor" },
      ],
    },
    convention: {
      title: "Convention Center — Attendee Interviews",
      desc:
        "A chaotic lobby. Attendees clutching stomachs. Security ushers you to an impromptu interview area.",
      actions: [
        {
          id: "interview_attendees",
          label: "Interview a stratified sample (n=20)",
          time: 18,
          credibility: +5,
          addEvidence: { key: "epi_curve", label: "Onset Distribution", value: "Median 24–36h, tight clustering", weight: 3 },
          addLead: "Similar menu across cases; salad consumed by nearly all.",
        },
        {
          id: "collect_menu",
          label: "Collect menu + serving logs",
          time: 6,
          addEvidence: { key: "menu", label: "Menu Items", value: "Salad, sandwiches, oysters (VIP), coffee", weight: 2 },
        },
        { id: "back_map", label: "Back to map", time: 2, go: "map" },
      ],
    },
    hospital: {
      title: "Hospital ER — Clinical Picture",
      desc: "Clinicians report profuse vomiting, some diarrhea; short incubation; rapid recovery (24–48h).",
      actions: [
        {
          id: "chart_review",
          label: "Rapid chart review (n=30)",
          time: 14,
          credibility: +3,
          addEvidence: { key: "symptoms", label: "Symptoms", value: "Vomiting prominent > diarrhea; low fever", weight: 3 },
        },
        {
          id: "collect_stool",
          label: "Collect stool samples (submit to lab)",
          time: 6,
          addEvidence: { key: "stool_submitted", label: "Specimens", value: "10 stool samples sent to PHL", weight: 2 },
        },
        { id: "back_map", label: "Back to map", time: 2, go: "map" },
      ],
    },
    lab: {
      title: "Public Health Lab — Testing",
      desc: "PHL can run rapid PCR panels but is slammed. Prioritize wisely.",
      actions: [
        {
          id: "rapid_panel",
          label: "Run GI panel on 5 samples",
          time: 20,
          credibility: +4,
          requires: ["stool_submitted"],
          addEvidence: { key: "lab_result", label: "Lab Result", value: "Norovirus GII detected in 4/5", weight: 5 },
        },
        {
          id: "env_swabs",
          label: "Swab salad station + knives",
          time: 10,
          addEvidence: { key: "env", label: "Env Swabs", value: "Norovirus on salad tongs", weight: 4 },
        },
        { id: "back_map", label: "Back to map", time: 2, go: "map" },
      ],
    },
    caterer: {
      title: "Caterer — Kitchen Walkthrough",
      desc: "A bustling prep space. One worker looks pale; handwashing signage is… aspirational.",
      actions: [
        {
          id: "inspect_logs",
          label: "Inspect sick‑leave + temp logs",
          time: 10,
          credibility: +2,
          addEvidence: { key: "sick_worker", label: "Ill Food Worker", value: "Prep cook vomited night prior; worked salad line", weight: 4 },
        },
        {
          id: "supplier_tracing",
          label: "Trace produce lot numbers",
          time: 8,
          addEvidence: { key: "produce_lot", label: "Produce Lot", value: "Single lot used for mixed greens", weight: 2 },
        },
        { id: "back_map", label: "Back to map", time: 2, go: "map" },
      ],
    },
    mayor: {
      title: "Mayor's Office — Briefing",
      desc:
        "The Mayor demands a plain‑English update and immediate risk controls. Media hits begin in 2 hours.",
      actions: [
        {
          id: "recommend_controls",
          label: "Recommend control measures",
          time: 6,
          credibility: +3,
          handler: (s) => {
            const msg =
              "Control measures issued: exclude ill workers, deep clean salad station, notify attendees, advise hand hygiene.";
            return { ...s, message: msg };
          },
        },
        { id: "back_map", label: "Back to map", time: 2, go: "map" },
      ],
    },
    deduce: {
      title: "Deduction Room — Name the Culprit",
      desc: "Lock your hypothesis before time expires.",
      actions: [],
    },
  },
};

// ====== UTILITIES ======
function minutesToHMM(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}:${min.toString().padStart(2, "0")}h`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// ====== CORE APP ======
export default function OutbreakApp() {
  const [state, setState] = React.useState(STARTING_STATE);
  const [tab, setTab] = React.useState("map");

  React.useEffect(() => {
    // end the game when out of time
    if (!state.ended && state.time <= 0) {
      setState((s) => ({ ...s, ended: true, message: "Time's up — press Reset to try again." }));
    }
  }, [state.time, state.ended]);

  const loc = GAME_DATA.locations[state.location] || GAME_DATA.locations.briefing;

  const evidenceList = React.useMemo(() => Object.values(state.evidence), [state.evidence]);

  const score = React.useMemo(() => {
    const w = evidenceList.reduce((acc, e) => acc + (e.weight || 1), 0);
    return clamp(Math.round((w / 25) * 100), 0, 100);
  }, [evidenceList]);

  const objectiveHints = React.useMemo(() => [
    "Interview attendees and establish exposure(s)",
    "Characterize clinical picture + incubation",
    "Confirm pathogen in patients/ environment",
    "Identify likely vehicle & source",
    "Implement control measures & brief leadership",
  ], []);

  function applyAction(action) {
    if (state.ended) return;

    // Guard: requirements
    if (action.requires && !action.requires.every((k) => state.evidence[k])) {
      setState((s) => ({ ...s, message: "You don't have what's needed yet." }));
      return;
    }

    let next = { ...state };
    next.time = clamp(next.time - (action.time || 0), 0, 9999);
    next.credibility = clamp(next.credibility + (action.credibility || 0), 0, 100);
    if (action.go) next.location = action.go;
    if (typeof action.handler === "function") next = action.handler(next);

    if (action.addEvidence) {
      const { key, ...rest } = action.addEvidence;
      next.evidence = { ...next.evidence, [key]: rest };
      next.visited = new Set([...next.visited, state.location]);
      next.message = `Evidence added → ${rest.label}`;
    }
    if (action.addLead) next.leads = [...new Set([...(next.leads || []), action.addLead])];

    setState(next);
  }

  function resetGame() {
    setState({ ...STARTING_STATE, visited: new Set(["briefing"]) });
    setTab("map");
  }

  function checkSolve() {
    const { pathogen, source, vehicle } = state.chosenTheory;
    if (!pathogen || !source || !vehicle) {
      setState((s) => ({ ...s, message: "Select a pathogen, source, and vehicle first." }));
      return;
    }
    const correct =
      pathogen === CASE_TRUTH.pathogen && source === CASE_TRUTH.source && vehicle === CASE_TRUTH.vehicle;

    const verdict = correct
      ? "✅ Correct! You identified the outbreak and implemented control measures in time."
      : "❌ Not quite. Your hypothesis doesn't fit all the evidence. Review your notes and try again.";

    setState((s) => ({ ...s, solved: correct, ended: correct, message: verdict }));
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <div className="text-2xl font-bold tracking-tight">Solve the Outbreak</div>
          <div className="text-xs ml-2 rounded bg-indigo-50 px-2 py-1 text-indigo-700">MVP</div>
          <div className="ml-auto flex items-center gap-2">
            <HUDItem label="Time" value={minutesToHMM(state.time)} />
            <HUDItem label="Cred" value={`${state.credibility}`} />
            <HUDItem label="Evidence" value={`${evidenceList.length}`} />
            <HUDItem label="Score" value={`${score}`} />
            <button onClick={resetGame} className="ml-2 rounded-2xl border px-3 py-1 text-sm hover:bg-slate-100">
              Reset
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-4 p-4 lg:grid-cols-4">
        {/* LEFT: Game View */}
        <section className="lg:col-span-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">{loc.title}</h2>
            <p className="mt-1 text-slate-600">{loc.desc}</p>

            {/* Actions */}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {loc.actions?.map((a) => (
                <ActionButton key={a.id} a={a} onClick={() => applyAction(a)} disabled={state.ended} />
              ))}
              {/* Deduction Room button always available */}
              {state.location !== "deduce" && (
                <button
                  className="rounded-xl border px-4 py-2 text-left hover:bg-slate-50"
                  onClick={() => applyAction({ time: 2, go: "deduce" })}
                  disabled={state.ended}
                >
                  🔍 Go to Deduction Room
                </button>
              )}
            </div>

            {/* Messages */}
            {state.message && (
              <div className="mt-3 rounded-xl border bg-amber-50 px-3 py-2 text-amber-900">
                {state.message}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT: Side Panels */}
        <aside className="lg:col-span-1">
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <TabBar tab={tab} setTab={setTab} />
            {tab === "map" && <MapPanel setState={setState} state={state} />}
            {tab === "objectives" && <ObjectivesPanel hints={objectiveHints} />}
            {tab === "evidence" && <EvidencePanel evidence={evidenceList} />}
            {tab === "leads" && <LeadsPanel leads={state.leads} />}
            {tab === "deduce" && (
              <DeductionPanel
                theories={THEORIES}
                chosen={state.chosenTheory}
                onChoose={(chosenTheory) => setState((s) => ({ ...s, chosenTheory }))}
                onCheck={checkSolve}
                disabled={state.ended}
              />
            )}
          </div>
        </aside>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-6 text-center text-xs text-slate-500">
        Built for classroom play — expand via data, not code. © 2025
      </footer>
    </div>
  );
}

// ====== UI COMPONENTS ======
function HUDItem({ label, value }) {
  return (
    <div className="rounded-xl border px-3 py-1 text-sm">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function ActionButton({ a, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-start gap-2 rounded-xl border p-3 text-left transition hover:shadow-sm disabled:opacity-50"
    >
      <span className="mt-0.5">▶</span>
      <span>
        <div className="font-medium">{a.label}</div>
        <div className="text-xs text-slate-500">Time: {a.time || 0} min{a.credibility ? ` · Cred ${a.credibility > 0 ? "+" : ""}${a.credibility}` : ""}</div>
      </span>
    </button>
  );
}

function TabBar({ tab, setTab }) {
  const tabs = [
    { id: "map", label: "Map" },
    { id: "objectives", label: "Objectives" },
    { id: "evidence", label: "Evidence" },
    { id: "leads", label: "Leads" },
    { id: "deduce", label: "Deduce" },
  ];
  return (
    <div className="mb-2 flex gap-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className={`rounded-full px-3 py-1 text-sm ${tab === t.id ? "bg-slate-900 text-white" : "border"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function MapPanel({ setState, state }) {
  const places = [
    { id: "convention", label: "Convention Center" },
    { id: "hospital", label: "Hospital ER" },
    { id: "lab", label: "Public Health Lab" },
    { id: "caterer", label: "Caterer" },
    { id: "mayor", label: "Mayor's Office" },
  ];
  return (
    <div>
      <div className="text-xs text-slate-500">Quick travel (2 min)</div>
      <div className="mt-2 grid gap-2">
        {places.map((p) => (
          <button
            key={p.id}
            onClick={() =>
              setState((s) => ({ ...s, location: p.id, time: clamp(s.time - 2, 0, 9999), message: `Traveled to ${p.label}.` }))
            }
            disabled={state.ended}
            className="rounded-xl border px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ObjectivesPanel({ hints }) {
  return (
    <div>
      <div className="text-xs text-slate-500">Suggested flow</div>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        {hints.map((h, i) => (
          <li key={i}>{h}</li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-slate-500">Tip: Higher evidence score → stronger deduction confidence.</p>
    </div>
  );
}

function EvidencePanel({ evidence }) {
  if (!evidence.length) return <div className="text-slate-500">No evidence yet. Get out there!</div>;
  return (
    <div className="space-y-2">
      {evidence.map((e, idx) => (
        <div key={idx} className="rounded-xl border p-2">
          <div className="text-sm font-medium">{e.label}</div>
          <div className="text-xs text-slate-600">{e.value}</div>
          {e.weight ? <div className="mt-1 text-[10px] text-slate-500">Weight: {e.weight}</div> : null}
        </div>
      ))}
    </div>
  );
}

function LeadsPanel({ leads }) {
  if (!leads?.length) return <div className="text-slate-500">No leads yet.</div>;
  return (
    <ul className="list-disc pl-5">
      {leads.map((l, idx) => (
        <li key={idx} className="text-sm">{l}</li>
      ))}
    </ul>
  );
}

function DeductionPanel({ theories, chosen, onChoose, onCheck, disabled }) {
  function setField(field, value) {
    onChoose({ ...chosen, [field]: value });
  }
  return (
    <div className="space-y-3">
      <SelectGroup
        label="Likely Pathogen"
        options={theories.pathogens}
        value={chosen.pathogen}
        onChange={(v) => setField("pathogen", v)}
      />
      <SelectGroup label="Source" options={theories.sources} value={chosen.source} onChange={(v) => setField("source", v)} />
      <SelectGroup label="Food/Vehicle" options={theories.vehicles} value={chosen.vehicle} onChange={(v) => setField("vehicle", v)} />
      <button onClick={onCheck} disabled={disabled} className="w-full rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
        Check Hypothesis
      </button>
    </div>
  );
}

function SelectGroup({ label, options, value, onChange }) {
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2 ${value === o.id ? "ring-2 ring-slate-900" : ""}`}>
            <input
              type="radio"
              name={label}
              className="hidden"
              checked={value === o.id}
              onChange={() => onChange(o.id)}
            />
            <span className="text-sm">{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
