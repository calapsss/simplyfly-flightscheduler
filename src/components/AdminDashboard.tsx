import { useMemo, useState } from "react";
import type { AppState, Assignment, Block, Aircraft, User } from "../types";
import { DAY_FULL, DAY_LABELS, rangesOverlap } from "../types";
import { Card, SectionTitle, Button, Input, Label, Stat, Pill } from "./ui";
import { PlaneIcon } from "./Logo";
import { uid } from "../store";

type Props = {
  state: AppState;
  onChange: (next: AppState) => void;
};

type Tab = "overview" | "blocks" | "aircraft" | "schedule" | "flyers";

export function AdminDashboard({ state, onChange }: Props) {
  const [tab, setTab] = useState<Tab>("schedule");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "schedule", label: "Daily scheduler", icon: "◎" },
    { id: "blocks",   label: "Block times",    icon: "▦" },
    { id: "aircraft", label: "Aircraft",       icon: "✈" },
    { id: "overview", label: "Overview",       icon: "◉" },
    { id: "flyers",   label: "Flyers",         icon: "◈" },
  ];

  return (
    <>
      <nav className="flex items-center gap-1 border-b border-slate-200 -mb-px overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-[13px] font-medium border-b-2 transition relative -mb-px whitespace-nowrap ${
              tab === t.id
                ? "border-navy-900 text-navy-900"
                : "border-transparent text-slate-500 hover:text-navy-900"
            }`}
          >
            <span className="mr-1.5 text-sky-500">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="py-6">
        {tab === "schedule" && <DailyScheduler state={state} onChange={onChange} />}
        {tab === "blocks"   && <BlockManager state={state} onChange={onChange} />}
        {tab === "aircraft" && <AircraftManager state={state} onChange={onChange} />}
        {tab === "overview" && <Overview state={state} onJump={setTab} />}
        {tab === "flyers"   && <FlyersView state={state} onChange={onChange} />}
      </div>
    </>
  );
}

/* ============================== DAILY SCHEDULER ============================ */
/* Aircraft on Y-axis, block times on X-axis. Pick a day, then schedule.       */
/* Each cell can have a Pilot + Co-Pilot.                                      */

function DailyScheduler({ state, onChange }: Props) {
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [missionEditCell, setMissionEditCell] = useState<string | null>(null);
  const [missionDraft, setMissionDraft] = useState("");
  const [areaEditCell, setAreaEditCell] = useState<string | null>(null);
  const [areaDraft, setAreaDraft] = useState("");
  const [rosterOpen, setRosterOpen] = useState(true);
  const [trackFilter, setTrackFilter] = useState<"all" | "student" | "ip">("all");

  const dayBlocks = useMemo(
    () => state.blocks.filter((b) => b.day === selectedDay).sort((a, b) => a.start.localeCompare(b.start)),
    [state.blocks, selectedDay]
  );

  const selectedBlock = useMemo(
    () => (selectedBlockId ? state.blocks.find((b) => b.id === selectedBlockId) || null : null),
    [selectedBlockId, state.blocks]
  );

  // Assignment lookup: aircraftId -> blockId -> assignment
  const assignmentsByCell = useMemo(() => {
    const map = new Map<string, Assignment>(); // key: `${aircraftId}:${blockId}`
    state.assignments.forEach((a) => {
      map.set(`${a.aircraftId}:${a.blockId}`, a);
    });
    return map;
  }, [state.assignments]);

  // Flyers available for the selected block (whose range overlaps the block)
  const availableForBlock = useMemo(() => {
    if (!selectedBlock) return new Set<string>();
    return new Set(
      state.availability
        .filter((a) => a.day === selectedBlock.day && rangesOverlap(a.start, a.end, selectedBlock.start, selectedBlock.end))
        .map((a) => a.flyerId)
    );
  }, [selectedBlock, state.availability]);

  // Cells where the same person is assigned to multiple aircraft in the same block
  const conflictingCells = useMemo(() => {
    const result = new Set<string>();
    const byBlock = new Map<string, Assignment[]>();
    state.assignments.forEach((a) => {
      if (!byBlock.has(a.blockId)) byBlock.set(a.blockId, []);
      byBlock.get(a.blockId)!.push(a);
    });
    for (const [, assignments] of byBlock) {
      const counts = new Map<string, number>();
      assignments.forEach((a) => {
        if (a.pilotId) counts.set(a.pilotId, (counts.get(a.pilotId) || 0) + 1);
        if (a.coPilotId) counts.set(a.coPilotId, (counts.get(a.coPilotId) || 0) + 1);
      });
      for (const [flyerId, count] of counts) {
        if (count > 1) {
          assignments.forEach((a) => {
            if (a.pilotId === flyerId || a.coPilotId === flyerId) {
              result.add(`${a.aircraftId}:${a.blockId}`);
            }
          });
        }
      }
    }
    return result;
  }, [state.assignments]);

  // Cells where the same flyer is assigned to 3+ consecutive blocks (SOP violation)
  const threepeatCells = useMemo(() => {
    const result = new Set<string>();
    const flyerAssignments = new Map<string, Map<number, string>>();
    state.assignments.forEach((a) => {
      const blockIdx = dayBlocks.findIndex((b) => b.id === a.blockId);
      if (blockIdx === -1) return;
      const cellKey = `${a.aircraftId}:${a.blockId}`;
      const add = (fid: string) => {
        if (!flyerAssignments.has(fid)) flyerAssignments.set(fid, new Map());
        flyerAssignments.get(fid)!.set(blockIdx, cellKey);
      };
      if (a.pilotId) add(a.pilotId);
      if (a.coPilotId) add(a.coPilotId);
    });
    for (const [, assignments] of flyerAssignments) {
      const indices = [...assignments.keys()].sort((a, b) => a - b);
      let runStart = 0;
      for (let i = 1; i <= indices.length; i++) {
        if (i === indices.length || indices[i] !== indices[i - 1] + 1) {
          if (i - runStart >= 3)
            for (let j = runStart; j < i; j++) result.add(assignments.get(indices[j])!);
          runStart = i;
        }
      }
    }
    return result;
  }, [state.assignments, dayBlocks]);

  // Cells where the same flyer is assigned to 4+ flights in a day (SOP violation)
  const overfourCells = useMemo(() => {
    const result = new Set<string>();
    const counts = new Map<string, number>();
    state.assignments.forEach((a) => {
      if (!dayBlocks.some((b) => b.id === a.blockId)) return;
      if (a.pilotId) counts.set(a.pilotId, (counts.get(a.pilotId) || 0) + 1);
      if (a.coPilotId) counts.set(a.coPilotId, (counts.get(a.coPilotId) || 0) + 1);
    });
    const violators = new Set<string>();
    for (const [fid, c] of counts) if (c >= 4) violators.add(fid);
    state.assignments.forEach((a) => {
      if (!dayBlocks.some((b) => b.id === a.blockId)) return;
      if ((a.pilotId && violators.has(a.pilotId)) || (a.coPilotId && violators.has(a.coPilotId)))
        result.add(`${a.aircraftId}:${a.blockId}`);
    });
    return result;
  }, [state.assignments, dayBlocks]);

  const filteredFlyers = useMemo(() => {
    const flyers = state.users.filter((u) => u.role === "flyer");
    const q = filter.trim().toLowerCase();
    let result = q ? flyers.filter((f) => f.name.toLowerCase().includes(q) || f.callsign?.toLowerCase().includes(q)) : flyers;
    // Track filter
    if (trackFilter !== "all") result = result.filter((f) => f.track === trackFilter);
    // If a block is selected, further filter to only available flyers
    if (selectedBlock) {
      result = result.filter((f) => availableForBlock.has(f.id));
    }
    return result;
  }, [state.users, filter, selectedBlock, availableForBlock, trackFilter]);

  // Flyers already assigned in the selected block (to gray out in roster)
  const assignedInBlock = useMemo(() => {
    if (!selectedBlock) return new Set<string>();
    const set = new Set<string>();
    state.assignments.forEach((a) => {
      if (a.blockId === selectedBlock.id) {
        if (a.pilotId) set.add(a.pilotId);
        if (a.coPilotId) set.add(a.coPilotId);
      }
    });
    return set;
  }, [state.assignments, selectedBlock]);

  function canFly(flyerId: string, block: Block) {
    return state.availability.some(
      (a) => a.flyerId === flyerId && a.day === block.day && rangesOverlap(a.start, a.end, block.start, block.end)
    );
  }

  function performDrop(droppedFlyerId: string | null, aircraftId: string, blockId: string) {
    if (!droppedFlyerId) return;
    const block = state.blocks.find((b) => b.id === blockId);
    const ac = state.aircraft.find((a) => a.id === aircraftId);
    if (!block || !ac) return;

    // Aircraft must be available this block
    if (!ac.availableBlockIds.includes(blockId)) return;

    // Flyer must be available in the block's time window
    if (!canFly(droppedFlyerId, block)) return;

    const cellKey = `${aircraftId}:${blockId}`;
    const existing = assignmentsByCell.get(cellKey);

    if (existing) {
      // Cell has someone - check if we can add co-pilot
      if (existing.pilotId === droppedFlyerId || existing.coPilotId === droppedFlyerId) {
        return; // Same person can't be both
      }
      if (existing.coPilotId) {
        return; // Already full
      }
      // Add as co-pilot
      onChange({
        ...state,
        assignments: state.assignments.map((a) =>
          a.id === existing.id ? { ...a, coPilotId: droppedFlyerId } : a
        ),
      });
    } else {
      // New assignment - first person is pilot
      onChange({
        ...state,
        assignments: [
          ...state.assignments,
          { id: uid("a"), pilotId: droppedFlyerId, aircraftId, blockId },
        ],
      });
    }
  }

  function removeFromCell(aircraftId: string, blockId: string, role: "pilot" | "coPilot" | "both") {
    const cellKey = `${aircraftId}:${blockId}`;
    const a = assignmentsByCell.get(cellKey);
    if (!a) return;
    
    if (role === "both" || (role === "pilot" && a.coPilotId)) {
      // Remove entire assignment
      onChange({ ...state, assignments: state.assignments.filter((x) => x.id !== a.id) });
    } else if (role === "pilot" && !a.coPilotId) {
      // Only pilot, remove whole assignment
      onChange({ ...state, assignments: state.assignments.filter((x) => x.id !== a.id) });
    } else if (role === "coPilot") {
      // Just remove co-pilot, keep pilot
      onChange({
        ...state,
        assignments: state.assignments.map((x) =>
          x.id === a.id ? { ...x, coPilotId: undefined } : x
        ),
      });
    }
  }

  function clearDay() {
    const blockIdsForDay = new Set(dayBlocks.map((b) => b.id));
    onChange({
      ...state,
      assignments: state.assignments.filter((a) => !blockIdsForDay.has(a.blockId)),
    });
  }

  function handleBlockHeaderClick(blockId: string) {
    setSelectedBlockId((curr) => (curr === blockId ? null : blockId));
  }

  const dayAssignments = state.assignments.filter((a) => {
    const b = state.blocks.find((x) => x.id === a.blockId);
    return b?.day === selectedDay;
  });
  const totalSlots = state.aircraft.length * dayBlocks.length;
  const fillRate = totalSlots ? Math.round((dayAssignments.length / totalSlots) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Top bar: day selector + stats */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="text-[17px] font-semibold text-navy-900 tracking-tight">Daily scheduler</h2>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Aircraft on rows, time blocks on columns. Each block can have a Pilot + Co-Pilot.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl overflow-x-auto">
          {DAY_LABELS.map((d, i) => (
            <button
              key={d}
              onClick={() => { setSelectedDay(i); setSelectedBlockId(null); }}
              className={`px-3.5 py-2 rounded-lg text-[12.5px] font-medium transition whitespace-nowrap ${
                selectedDay === i
                  ? "bg-navy-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Mini stats */}
      <div className="flex items-center gap-3 flex-wrap text-[12px]">
        <Pill tone="navy">{DAY_FULL[selectedDay]}</Pill>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500"><strong className="text-navy-900">{dayBlocks.length}</strong> blocks</span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500"><strong className="text-sky-600">{dayAssignments.length}</strong> crew pairs <span className="text-slate-400">({fillRate}%)</span></span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500"><strong className="text-navy-900">{state.aircraft.length}</strong> aircraft</span>
      </div>

      {dayBlocks.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="text-slate-300 text-3xl mb-2">▦</div>
          <p className="text-[14px] text-slate-600">No block times defined for {DAY_FULL[selectedDay]}.</p>
          <p className="text-[12px] text-slate-400 mt-1">Open the "Block times" tab to set up today's operating windows.</p>
        </Card>
      ) : state.aircraft.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-[14px] text-slate-600">No aircraft in the fleet yet.</p>
        </Card>
      ) : (
        <div className={`grid grid-cols-1 gap-5 ${rosterOpen ? "xl:grid-cols-[1fr_280px]" : ""}`}>
          {/* Schedule grid: rows = aircraft, cols = blocks */}
          <Card className="p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[12px] text-slate-500">
                <span className="font-mono text-[11px] px-1.5 py-0.5 bg-navy-900 text-white rounded">SCHEDULE</span>
                <span>{DAY_FULL[selectedDay]}</span>
              </div>
              <Button variant="secondary" size="sm" onClick={clearDay}>Clear day</Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-separate border-spacing-1.5">
                <thead>
                  <tr>
                    <th className="w-44 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 py-2 px-2">
                      Aircraft
                    </th>
                    {dayBlocks.map((block) => {
                      const isSelected = selectedBlockId === block.id;
                      return (
                        <th
                          key={block.id}
                          onClick={() => handleBlockHeaderClick(block.id)}
                          className={`text-center text-[11px] font-semibold uppercase tracking-wider py-2 px-1 cursor-pointer transition ${
                            isSelected
                              ? "bg-sky-100 text-sky-700 rounded-t-lg"
                              : "text-slate-400 hover:bg-slate-50"
                          }`}
                           title="Click to filter roster to available flyers"
                        >
                          <div className={`font-mono text-[13px] ${isSelected ? "text-sky-800" : "text-navy-900"}`}>{block.start}</div>
                          <div className="text-[10px] font-normal opacity-70">to {block.end}</div>
                           {isSelected && <div className="text-[9px] mt-0.5 font-medium text-sky-600">selected</div>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {state.aircraft.map((ac) => (
                    <tr key={ac.id}>
                      <td className="py-1.5 px-2 align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-navy-900 text-white flex items-center justify-center shrink-0">
                            <PlaneIcon size={15} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[13px] font-mono font-semibold text-navy-900 truncate">{ac.tailNumber}</div>
                            <div className="text-[11px] text-slate-500 truncate">{ac.type}</div>
                          </div>
                        </div>
                      </td>
                      {dayBlocks.map((block) => {
                        const cellKey = `${ac.id}:${block.id}`;
                        const assignment = assignmentsByCell.get(cellKey);
                        const pilot = assignment?.pilotId
                          ? state.users.find((u) => u.id === assignment.pilotId)
                          : null;
                        const coPilot = assignment?.coPilotId
                          ? state.users.find((u) => u.id === assignment.coPilotId)
                          : null;
                        const acAvail = ac.availableBlockIds.includes(block.id);
                        const isSelectedCol = selectedBlockId === block.id;
                        const isFull = !!pilot && !!coPilot;
                        const isConflict = assignment && conflictingCells.has(cellKey);
                        const isThreepeat = !isConflict && assignment && threepeatCells.has(cellKey);
                        const isOverfour = !isConflict && !isThreepeat && assignment && overfourCells.has(cellKey);
                        return (
                          <td key={block.id} className="py-1">
                            <div
                              onDragOver={(e) => {
                                if (!acAvail || isFull) return;
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const fid = e.dataTransfer.getData("text/plain");
                                if (fid) performDrop(fid, ac.id, block.id);
                              }}
                              className={`h-24 rounded-lg border transition-all flex flex-col p-1.5 ${
                                isConflict
                                  ? "bg-red-50 border-red-400 ring-1 ring-red-400"
                                  : isThreepeat
                                  ? "bg-amber-50 border-amber-400 ring-1 ring-amber-400"
                                  : isOverfour
                                  ? "bg-rose-50 border-rose-400 ring-1 ring-rose-400"
                                  : !acAvail
                                  ? "bg-slate-50/50 border-dashed border-slate-200 cursor-not-allowed"
                                  : isFull
                                  ? "bg-gradient-to-br from-navy-800 to-navy-900 border-navy-900 text-white"
                                  : pilot
                                  ? "bg-sky-50 border-sky-300"
                                  : isSelectedCol
                                  ? "bg-sky-50/70 border-sky-400 border-dashed"
                                  : "bg-white border-slate-200 hover:border-sky-300 hover:bg-sky-50/30"
                              }`}
                            >
                              {pilot ? (
                                <div className="flex-1 flex flex-col justify-center">
                                  <div className="flex items-center gap-1.5">
                                    <Pill tone="navy" className="text-[9px] py-0 px-1">PIC</Pill>
                                    <span className="text-[11.5px] font-semibold truncate flex-1">
                                      {pilot.rank && <span className="text-[10px] opacity-80 mr-0.5">{pilot.rank}</span>}
                                      {pilot.name.split(" ")[0]}
                                    </span>
                                    {isConflict && <span className="text-[9px] text-red-600 font-bold ml-auto" title="Scheduling conflict">⚠</span>}
                                    {isThreepeat && <span className="text-[9px] text-amber-600 font-bold ml-auto" title="3+ consecutive flights (SOP violation)">⚡</span>}
                                    {isOverfour && <span className="text-[9px] text-rose-600 font-bold ml-auto" title="4+ flights in a day (SOP violation)">◎</span>}
                                    <button
                                      onClick={() => removeFromCell(ac.id, block.id, "pilot")}
                                      className="text-[10px] text-slate-400 hover:text-red-400 ml-1"
                                      title="Remove pilot"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  {coPilot ? (
                                    <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-white/20">
                                      <Pill tone="sky" className="text-[9px] py-0 px-1">CP</Pill>
                                      <span className="text-[11.5px] font-medium truncate flex-1">
                                        {coPilot.rank && <span className="text-[10px] opacity-80 mr-0.5">{coPilot.rank}</span>}
                                        {coPilot.name.split(" ")[0]}
                                      </span>
                                    {isConflict && <span className="text-[9px] text-red-600 font-bold ml-auto" title="Scheduling conflict">⚠</span>}
                                    {isThreepeat && <span className="text-[9px] text-amber-600 font-bold ml-auto" title="3+ consecutive flights (SOP violation)">⚡</span>}
                                    {isOverfour && <span className="text-[9px] text-rose-600 font-bold ml-auto" title="4+ flights in a day (SOP violation)">◎</span>}
                                      <button
                                        onClick={() => removeFromCell(ac.id, block.id, "coPilot")}
                                        className="text-[10px] text-slate-400 hover:text-red-400 ml-1"
                                        title="Remove co-pilot"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <div
                                      onDragOver={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = "move";
                                      }}
                                      onDrop={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        const fid = e.dataTransfer.getData("text/plain");
                                        if (fid) performDrop(fid, ac.id, block.id);
                                      }}
                                      className="mt-1.5 h-6 rounded border border-dashed border-sky-300/50 flex items-center justify-center text-[9px] text-sky-600/70 hover:bg-sky-100/50 cursor-pointer"
                                    >
                                      + drop co-pilot
                                    </div>
                                  )}
                                  {missionEditCell === cellKey ? (
                                    <input
                                      autoFocus
                                      value={missionDraft}
                                      onChange={(e) => setMissionDraft(e.target.value)}
                                      onBlur={() => {
                                        setMissionEditCell(null);
                                        if (!missionDraft.trim()) return;
                                        onChange({
                                          ...state,
                                          assignments: state.assignments.map((a) =>
                                            a.id === assignment!.id ? { ...a, mission: missionDraft.trim() } : a
                                          ),
                                        });
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                        if (e.key === "Escape") setMissionEditCell(null);
                                      }}
                                      className="mt-1 w-full text-[10px] px-1 py-0.5 rounded border border-sky-400 bg-sky-50 text-sky-800 outline-none"
                                      placeholder="e.g. NAV 1"
                                    />
                                  ) : assignment!.mission ? (
                                    <button
                                      onClick={() => { setMissionEditCell(cellKey); setMissionDraft(assignment!.mission!); }}
                                      className="group mt-1 flex items-center gap-1 text-[10px] text-sky-600 hover:text-sky-700"
                                    >
                                      <span className="font-medium">MSN: {assignment!.mission}</span>
                                      <span className="opacity-0 group-hover:opacity-100 transition text-sky-400">✎</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => { setMissionEditCell(cellKey); setMissionDraft(""); }}
                                      className="group mt-1 flex items-center gap-1 text-[10px] text-slate-400 hover:text-sky-600"
                                    >
                                      <span className="opacity-0 group-hover:opacity-100 transition">+ mission</span>
                                    </button>
                                  )}
                                  {areaEditCell === cellKey ? (
                                    <input
                                      autoFocus
                                      value={areaDraft}
                                      onChange={(e) => setAreaDraft(e.target.value)}
                                      onBlur={() => {
                                        setAreaEditCell(null);
                                        if (!areaDraft.trim()) return;
                                        onChange({
                                          ...state,
                                          assignments: state.assignments.map((a) =>
                                            a.id === assignment!.id ? { ...a, areaAssignment: areaDraft.trim() } : a
                                          ),
                                        });
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                        if (e.key === "Escape") setAreaEditCell(null);
                                      }}
                                      className="mt-1 w-full text-[10px] px-1 py-0.5 rounded border border-sky-400 bg-sky-50 text-sky-800 outline-none"
                                      placeholder="e.g. AA-1"
                                    />
                                  ) : assignment!.areaAssignment ? (
                                    <button
                                      onClick={() => { setAreaEditCell(cellKey); setAreaDraft(assignment!.areaAssignment!); }}
                                      className="group mt-1 flex items-center gap-1 text-[10px] text-sky-600 hover:text-sky-700"
                                    >
                                      <span className="font-medium">AA: {assignment!.areaAssignment}</span>
                                      <span className="opacity-0 group-hover:opacity-100 transition text-sky-400">✎</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => { setAreaEditCell(cellKey); setAreaDraft(""); }}
                                      className="group mt-1 flex items-center gap-1 text-[10px] text-slate-400 hover:text-sky-600"
                                    >
                                      <span className="opacity-0 group-hover:opacity-100 transition">+ AA</span>
                                    </button>
                                  )}
                                </div>
                              ) : acAvail ? (
                                <div className="flex-1 flex items-center justify-center text-[10.5px] text-slate-300 uppercase tracking-wider">
                                  drop pilot
                                </div>
                              ) : (
                                <div className="flex-1 flex items-center justify-center text-[10.5px] text-slate-300">
                                  —
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-[12px] text-slate-500 px-2 flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <LegendDot color="bg-navy-900" label="Full crew (PIC + CP)" />
                <LegendDot color="bg-sky-50 border border-sky-300" label="Pilot only" />
                <LegendDot color="bg-slate-50 border border-dashed border-slate-300" label="Aircraft unavailable" />
              </div>
              <div className="font-mono">{dayAssignments.length} crew pairs assigned</div>
            </div>
          </Card>

          {/* Roster */}
          <Card className={`p-4 h-fit xl:sticky xl:top-24 ${!rosterOpen ? "xl:col-span-1" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <SectionTitle
                title={selectedBlock ? `Available for ${selectedBlock.start}–${selectedBlock.end}` : "Roster"}
                subtitle={
                  selectedBlock
                    ? `${filteredFlyers.length} of ${state.users.filter((u) => u.role === "flyer").length} flyers can fly this block`
                    : "Click a block time to filter, or drag any pilot onto a cell"
                }
              />
              <button
                onClick={() => setRosterOpen(!rosterOpen)}
                className="text-[11px] text-slate-400 hover:text-navy-900 shrink-0 ml-2"
                title={rosterOpen ? "Collapse roster" : "Expand roster"}
              >
                {rosterOpen ? "▸" : "◂"}
              </button>
            </div>
            {rosterOpen && (
              <>
                {/* Track filter tabs */}
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg mb-3">
                  {(["all", "student", "ip"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTrackFilter(t)}
                      className={`flex-1 py-1 text-[11.5px] font-medium rounded-md transition ${
                        trackFilter === t ? "bg-white text-navy-900 shadow-sm" : "text-slate-500"
                      }`}
                    >
                      {t === "all" ? "All" : t === "student" ? "AS" : "IP"}
                    </button>
                  ))}
                </div>
                {selectedBlock && (
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Pill tone="sky">{DAY_FULL[selectedBlock.day]} · {selectedBlock.start}–{selectedBlock.end}</Pill>
                    </div>
                    <button
                      onClick={() => setSelectedBlockId(null)}
                      className="text-[11px] text-slate-500 hover:text-navy-900 underline"
                    >
                      Show all flyers
                    </button>
                  </div>
                )}
                <Input
                  placeholder="Search flyers..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="mb-3"
                />
                <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
                  {filteredFlyers.length === 0 ? (
                    <p className="text-[12px] text-slate-400 text-center py-4">
                      {selectedBlock
                        ? "No flyers available for this block"
                        : "No flyers match your search"}
                    </p>
                  ) : (
                    filteredFlyers.map((f) => {
                      const isAssigned = selectedBlock && assignedInBlock.has(f.id);
                      return (
                        <div
                          key={f.id}
                          draggable={!isAssigned}
                          onDragStart={(e) => {
                            if (isAssigned) return;
                            e.dataTransfer.setData("text/plain", f.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          className={`flex items-center gap-2.5 p-2 rounded-lg border transition ${
                            isAssigned
                              ? "border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed"
                              : "border-sky-200 bg-sky-50 cursor-grab active:cursor-grabbing hover:border-sky-300"
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy-700 to-navy-900 text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
                            {f.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[12.5px] font-medium text-navy-900 truncate flex items-center gap-1.5">
                              {f.rank && <span className="text-[11px] font-semibold text-sky-600">{f.rank}</span>}
                              {f.name}
                              {f.track === "student" && <span className="text-[9px] font-medium text-violet-600 bg-violet-50 px-1 rounded">AS</span>}
                              {f.track === "ip" && (
                                <>
                                  <span className="text-[9px] font-medium text-amber-600 bg-amber-50 px-1 rounded">IP</span>
                                  {f.qualification && <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1 rounded">{f.qualification}</span>}
                                </>
                              )}
                            </div>
                            {f.callsign && (
                              <div className="text-[10.5px] font-mono text-slate-400">{f.callsign}</div>
                            )}
                          </div>
                          {selectedBlock && isAssigned && <Pill tone="slate">Assigned</Pill>}
                          {selectedBlock && !isAssigned && <Pill tone="green">Available</Pill>}
                        </div>
                      );
                    })
                  )}
                </div>
                {selectedBlock && (
                  <div className="mt-3 pt-3 border-t border-slate-100 text-[11.5px] text-slate-500">
                    <span className="text-sky-600 font-medium">{availableForBlock.size}</span> flyer
                    {availableForBlock.size === 1 ? "" : "s"} have declared availability overlapping this block.
                    <div className="mt-1.5 text-[11px]">
                      <span className="text-slate-400">Tip:</span> First drop = Pilot (PIC), second drop = Co-Pilot (CP)
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3 h-3 rounded ${color}`} />
      <span>{label}</span>
    </div>
  );
}

/* ============================== BLOCK MANAGER ============================= */
/* Admin defines blocks for a chosen day.                                     */

function addMinutes(time: string, mins: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function BlockManager({ state, onChange }: Props) {
  const [day, setDay] = useState(new Date().getDay());
  const [start, setStart] = useState("06:00");
  const [end, setEnd] = useState("09:00");
  const [applyTo, setApplyTo] = useState<"single" | "week">("single");
  const [endTouched, setEndTouched] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  function handleStartChange(val: string) {
    setStart(val);
    if (!endTouched) {
      setEnd(addMinutes(val, 90));
    }
  }

  function handleEndChange(val: string) {
    setEndTouched(true);
    setEnd(val);
  }

  function add() {
    if (start >= end) return;
    const newBlocks: Block[] = [];
    const days = applyTo === "week" ? [0, 1, 2, 3, 4, 5, 6] : [day];
    days.forEach((d) => {
      newBlocks.push({ id: uid("b"), day: d, start, end });
    });
    onChange({ ...state, blocks: [...state.blocks, ...newBlocks] });
  }

  function remove(id: string) {
    onChange({
      ...state,
      blocks: state.blocks.filter((b) => b.id !== id),
      aircraft: state.aircraft.map((a) => ({ ...a, availableBlockIds: a.availableBlockIds.filter((x) => x !== id) })),
      assignments: state.assignments.filter((a) => a.blockId !== id),
    });
  }

  function startEdit(b: Block) {
    setEditingBlockId(b.id);
    setEditStart(b.start);
    setEditEnd(b.end);
  }

  function saveEdit() {
    if (!editingBlockId || editStart >= editEnd) return;
    onChange({
      ...state,
      blocks: state.blocks.map((b) =>
        b.id === editingBlockId ? { ...b, start: editStart, end: editEnd } : b
      ),
    });
    setEditingBlockId(null);
  }

  function cancelEdit() {
    setEditingBlockId(null);
  }

  const blocksForDay = state.blocks
    .filter((b) => b.day === day)
    .sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card className="p-6">
        <SectionTitle
          title="Add block time"
          subtitle="Define operating windows for the day."
        />
        <div className="space-y-3">
          <div>
            <Label>Day</Label>
            <select
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-navy-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
              disabled={applyTo === "week"}
            >
              {DAY_LABELS.map((d, i) => (
                <option key={d} value={i}>{DAY_FULL[i]}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Apply to</Label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
              {(["single", "week"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setApplyTo(m)}
                  className={`py-1.5 text-[12.5px] font-medium rounded-md transition ${
                    applyTo === m ? "bg-white text-navy-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {m === "single" ? "This day" : "Every day"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start</Label>
              <Input type="time" value={start} onChange={(e) => handleStartChange(e.target.value)} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="time" value={end} onChange={(e) => handleEndChange(e.target.value)} />
            </div>
          </div>
          <Button className="w-full" onClick={add} disabled={start >= end}>
            {applyTo === "week" ? "Add to all 7 days" : "Add block"}
          </Button>
        </div>
      </Card>

      <Card className="p-6 md:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle
            title="Blocks for the day"
            subtitle={`${blocksForDay.length} block${blocksForDay.length === 1 ? "" : "s"} configured`}
          />
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {DAY_LABELS.map((d, i) => (
              <button
                key={d}
                onClick={() => setDay(i)}
                className={`px-2.5 py-1 text-[11.5px] font-medium rounded-md transition ${
                  day === i ? "bg-white text-navy-900 shadow-sm" : "text-slate-500"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {blocksForDay.length === 0 ? (
            <p className="text-[13px] text-slate-500 py-6 text-center">No blocks configured for {DAY_FULL[day]}.</p>
          ) : (
            blocksForDay.map((b) => (
              <div key={b.id} className="flex items-center gap-4 p-3 rounded-lg border border-slate-200">
                <div className="w-12 h-12 rounded-lg bg-sky-50 text-sky-700 flex flex-col items-center justify-center">
                  <span className="text-[16px]">▦</span>
                </div>
                <div className="flex-1">
                  {editingBlockId === b.id ? (
                    <div className="flex items-center gap-2">
                      <Input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="!w-[110px] !text-[13px]" />
                      <span className="text-[13px] text-slate-400 font-mono">→</span>
                      <Input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className="!w-[110px] !text-[13px]" />
                      <Button size="sm" onClick={saveEdit} disabled={editStart >= editEnd}>Save</Button>
                      <Button size="sm" variant="secondary" onClick={cancelEdit}>Cancel</Button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(b)}
                        className="group text-[14px] font-mono font-semibold text-navy-900 hover:text-sky-700"
                      >
                        {b.start} → {b.end}
                        <span className="ml-1.5 text-[11px] text-slate-400 opacity-0 group-hover:opacity-100 transition">✎</span>
                      </button>
                      <div className="text-[12px] text-slate-500">
                        {duration(b.start, b.end).toFixed(1)} hours · {DAY_FULL[b.day]}
                      </div>
                    </>
                  )}
                </div>
                <Pill tone="slate">{blockAircraftCount(b.id, state)} aircraft</Pill>
                <Button variant="danger" size="sm" onClick={() => remove(b.id)}>Remove</Button>
              </div>
            ))
          )}
        </div>

        {/* All-day summary */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <h3 className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-2">All configured days</h3>
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_LABELS.map((_d, i) => {
              const c = state.blocks.filter((b) => b.day === i).length;
              return (
                <div key={i} className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-semibold text-slate-500">{DAY_LABELS[i]}</div>
                  <div className="text-[15px] font-semibold text-navy-900 mt-0.5">{c}</div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}

function duration(s: string, e: string) {
  const [sh, sm] = s.split(":").map(Number);
  const [eh, em] = e.split(":").map(Number);
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
}

function blockAircraftCount(blockId: string, state: AppState) {
  return state.aircraft.filter((a) => a.availableBlockIds.includes(blockId)).length;
}

/* ============================= AIRCRAFT MANAGER =========================== */
/* Each aircraft picks which blocks (across all days) it is available for.   */

function AircraftManager({ state, onChange }: Props) {
  const [tail, setTail] = useState("");
  const [type, setType] = useState("");
  const [avail, setAvail] = useState<string[]>([]);
  const [editAircraftId, setEditAircraftId] = useState<string | null>(null);
  const [editAircraftType, setEditAircraftType] = useState("");

  function add() {
    if (!tail.trim() || !type.trim()) return;
    const ac: Aircraft = { id: uid("ac"), tailNumber: tail.trim().toUpperCase(), type: type.trim(), availableBlockIds: avail };
    onChange({ ...state, aircraft: [...state.aircraft, ac] });
    setTail(""); setType(""); setAvail([]);
  }

  function toggleBlock(id: string) {
    setAvail((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  }

  function remove(id: string) {
    onChange({
      ...state,
      aircraft: state.aircraft.filter((a) => a.id !== id),
      assignments: state.assignments.filter((a) => a.aircraftId !== id),
    });
  }

  function toggleAcBlock(acId: string, blockId: string) {
    onChange({
      ...state,
      aircraft: state.aircraft.map((a) =>
        a.id === acId
          ? {
              ...a,
              availableBlockIds: a.availableBlockIds.includes(blockId)
                ? a.availableBlockIds.filter((x) => x !== blockId)
                : [...a.availableBlockIds, blockId],
            }
          : a
      ),
    });
  }

  function startEditType(ac: Aircraft) {
    setEditAircraftId(ac.id);
    setEditAircraftType(ac.type);
  }

  function saveEditType() {
    if (!editAircraftId || !editAircraftType.trim()) return;
    onChange({
      ...state,
      aircraft: state.aircraft.map((a) =>
        a.id === editAircraftId ? { ...a, type: editAircraftType.trim() } : a
      ),
    });
    setEditAircraftId(null);
  }

  function cancelEditType() {
    setEditAircraftId(null);
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card className="p-6">
        <SectionTitle title="Add aircraft" subtitle="Tail, type & available blocks" />
        <div className="space-y-3">
          <div>
            <Label>Tail number</Label>
            <Input value={tail} onChange={(e) => setTail(e.target.value)} placeholder="e.g. N172SP" />
          </div>
          <div>
            <Label>Aircraft type</Label>
            <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. C172 Skyhawk" />
          </div>
          <div>
            <Label>Available blocks (across the week)</Label>
            <BlockPicker
              blocks={state.blocks}
              selected={avail}
              onToggle={toggleBlock}
            />
          </div>
          <Button className="w-full" onClick={add} disabled={!tail.trim() || !type.trim()}>
            Add to fleet
          </Button>
        </div>
      </Card>

      <Card className="p-6 md:col-span-2">
        <SectionTitle title="Fleet" subtitle="Click a block chip to toggle an aircraft's availability." />
        <div className="space-y-3">
          {state.aircraft.length === 0 ? (
            <p className="text-[13px] text-slate-500 py-6 text-center">No aircraft added yet.</p>
          ) : (
            state.aircraft.map((ac) => (
              <div key={ac.id} className="p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-navy-900 text-white flex items-center justify-center">
                    <PlaneIcon size={16} />
                  </div>
                    <div className="flex-1">
                    <div className="text-[14px] font-semibold text-navy-900 font-mono">{ac.tailNumber}</div>
                    {editAircraftId === ac.id ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Input
                          value={editAircraftType}
                          onChange={(e) => setEditAircraftType(e.target.value)}
                          className="!w-[120px] !text-[12px] !py-1"
                          placeholder="Type"
                        />
                        <Button size="sm" onClick={saveEditType} disabled={!editAircraftType.trim()}>Save</Button>
                        <Button size="sm" variant="secondary" onClick={cancelEditType}>Cancel</Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditType(ac)}
                        className="group text-[12px] text-slate-500 hover:text-sky-700"
                      >
                        {ac.type}
                        <span className="ml-1 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition">✎</span>
                      </button>
                    )}
                  </div>
                  <Pill tone="sky">{ac.availableBlockIds.length} blocks</Pill>
                  <Button variant="danger" size="sm" onClick={() => remove(ac.id)}>Remove</Button>
                </div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Availability</div>
                <BlockPicker
                  blocks={state.blocks}
                  selected={ac.availableBlockIds}
                  onToggle={(id) => toggleAcBlock(ac.id, id)}
                  dense
                />
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function BlockPicker({
  blocks,
  selected,
  onToggle,
  dense = false,
}: {
  blocks: Block[];
  selected: string[];
  onToggle: (id: string) => void;
  dense?: boolean;
}) {
  if (blocks.length === 0) {
    return (
      <p className="text-[12px] text-slate-500 p-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
        No block times defined yet. Create some in the Block times tab.
      </p>
    );
  }
  // Group by day
  const byDay = DAY_LABELS.map((_d, i) => blocks.filter((b) => b.day === i).sort((a, b) => a.start.localeCompare(b.start)));
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {byDay.map((blocksForDay, dayIdx) =>
        blocksForDay.length === 0 ? null : (
          <div key={dayIdx}>
            <div className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              {DAY_LABELS[dayIdx]}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {blocksForDay.map((b) => {
                const on = selected.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onToggle(b.id)}
                    className={`${dense ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-[12px]"} rounded-md border transition ${
                      on
                        ? "bg-navy-900 text-white border-navy-900"
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className="font-mono">{b.start}</span>
                    {!dense && <span className="opacity-70 ml-1">–{b.end}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
}

/* ================================= OVERVIEW =============================== */

function Overview({ state, onJump }: { state: AppState; onJump: (t: Tab) => void }) {
  const flyers = state.users.filter((u) => u.role === "flyer");
  const totalBlocks = state.blocks.length;
  const totalAssignments = state.assignments.length;
  const today = new Date().getDay();
  const todayAssignments = state.assignments.filter((a) => {
    const b = state.blocks.find((x) => x.id === a.blockId);
    return b?.day === today;
  });

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 text-white border-0 relative overflow-hidden">
        <div className="absolute inset-0 bg-cockpit-grid opacity-40" />
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl" />
        <div className="relative">
          <div className="text-[11px] font-mono text-sky-300 uppercase tracking-wider mb-2">
            · Ops Brief ·
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">Today's plan, chief.</h2>
          <p className="text-white/65 mt-2 max-w-xl text-[14px]">
            Set daily block times, enable aircraft, then assign Pilot + Co-Pilot pairs.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            <button onClick={() => onJump("blocks")} className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-[13px] font-medium backdrop-blur">1 · Define today's blocks</button>
            <button onClick={() => onJump("aircraft")} className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-[13px] font-medium backdrop-blur">2 · Enable aircraft</button>
            <button onClick={() => onJump("schedule")} className="px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-[13px] font-semibold shadow-lg">3 · Open scheduler →</button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Flyers"      value={flyers.length} />
        <Stat label="Aircraft"    value={state.aircraft.length} />
        <Stat label="Total blocks" value={totalBlocks} hint="across the week" />
        <Stat label="Crew pairs"   value={totalAssignments} hint={`${todayAssignments.length} today`} tone="sky" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <SectionTitle title="Today's roster" subtitle={DAY_FULL[today]} />
          {todayAssignments.length === 0 ? (
            <p className="text-[13px] text-slate-500 py-6 text-center">No sorties rostered for today.</p>
          ) : (
            <div className="space-y-2">
              {todayAssignments.map((a) => {
                const block = state.blocks.find((b) => b.id === a.blockId);
                const ac = state.aircraft.find((x) => x.id === a.aircraftId);
                const pilot = state.users.find((u) => u.id === a.pilotId);
                const coPilot = a.coPilotId ? state.users.find((u) => u.id === a.coPilotId) : null;
                if (!block || !ac || !pilot) return null;
                return (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="font-mono text-[12px] text-slate-500 w-16">{block.start}</div>
                    <div className="flex-1">
                      <div className="text-[13px] font-medium text-navy-900">{pilot.name}</div>
                      {coPilot && <div className="text-[11px] text-slate-500">+ {coPilot.name}</div>}
                    </div>
                    <div className="text-[12px] font-mono text-slate-500">{ac.tailNumber}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <Card className="p-6">
          <SectionTitle title="Fleet status" />
          <div className="space-y-2">
            {state.aircraft.map((ac) => (
              <div key={ac.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200">
                <div className="w-10 h-10 rounded-lg bg-navy-900 text-white flex items-center justify-center">
                  <PlaneIcon size={16} />
                </div>
                <div className="flex-1">
                  <div className="text-[13.5px] font-semibold text-navy-900 font-mono">{ac.tailNumber}</div>
                  <div className="text-[12px] text-slate-500">{ac.type}</div>
                </div>
                <Pill tone="sky">{ac.availableBlockIds.length} blocks</Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ================================== FLYERS ================================ */

function FlyersView({ state, onChange }: Props) {
  const flyers = state.users.filter((u) => u.role === "flyer");
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      {flyers.map((f) => {
        const ranges = state.availability.filter((a) => a.flyerId === f.id);
        const assigned = state.assignments.filter((a) => a.pilotId === f.id || a.coPilotId === f.id);
        const asPilot = assigned.filter((a) => a.pilotId === f.id).length;
        const asCoPilot = assigned.filter((a) => a.coPilotId === f.id).length;

        function updateUser(partial: Partial<User>) {
          onChange({ ...state, users: state.users.map((u) => (u.id === f.id ? { ...u, ...partial } : u)) });
        }

        return (
          <Card key={f.id} className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-navy-700 to-navy-900 text-white flex items-center justify-center text-[14px] font-semibold">
                {f.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1">
                <div className="text-[14px] font-semibold text-navy-900 flex items-center gap-1.5">
                  {f.rank && <span className="text-[12px] font-semibold text-sky-600">{f.rank}</span>}
                  {f.name}
                  {f.track === "student" && <span className="text-[9px] font-medium text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">AS</span>}
                  {f.track === "ip" && <span className="text-[9px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">IP</span>}
                </div>
                {f.callsign && <div className="text-[11px] font-mono text-slate-400">{f.callsign}</div>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[12px] mb-4">
              <div className="p-2 rounded-lg bg-sky-50 border border-sky-100">
                <div className="text-sky-700 font-semibold text-[15px]">{ranges.length}</div>
                <div className="text-slate-500 text-[11px]">ranges</div>
              </div>
              <div className="p-2 rounded-lg bg-navy-50 border border-navy-100">
                <div className="text-navy-700 font-semibold text-[15px]">{asPilot}</div>
                <div className="text-slate-500 text-[11px]">as PIC</div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                <div className="text-emerald-700 font-semibold text-[15px]">{asCoPilot}</div>
                <div className="text-slate-500 text-[11px]">as CP</div>
              </div>
            </div>

            {/* Track-specific fields */}
            {f.track === "student" && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div>
                  <Label>Lesson</Label>
                  <Input
                    value={f.lesson ?? ""}
                    onChange={(e) => updateUser({ lesson: e.target.value || undefined })}
                    placeholder="e.g. LSN 5"
                    className="!text-[12px]"
                  />
                </div>
                <div>
                  <Label>DOLF</Label>
                  <Input
                    type="date"
                    value={f.dolf ?? ""}
                    onChange={(e) => updateUser({ dolf: e.target.value || undefined })}
                    className="!text-[12px]"
                  />
                </div>
              </div>
            )}
            {f.track === "ip" && (
              <div className="mb-4">
                <Label>Qualification</Label>
                <select
                  value={f.qualification ?? ""}
                  onChange={(e) => updateUser({ qualification: (e.target.value || undefined) as User["qualification"] })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-navy-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
                >
                  <option value="">—</option>
                  <option value="2LFE">2LFE</option>
                  <option value="EL">EL</option>
                  <option value="1LFE">1LFE</option>
                  <option value="TP">TP</option>
                  <option value="TNG">TNG</option>
                  <option value="NON-TNG">NON-TNG</option>
                </select>
              </div>
            )}

            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Availability</div>
            <div className="space-y-1.5">
              {ranges.length === 0 ? (
                <p className="text-[12px] text-slate-400 italic">None declared</p>
              ) : (
                ranges
                  .slice()
                  .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
                  .map((a) => (
                    <div key={a.id} className="flex items-center gap-2 text-[12px]">
                      <span className="w-8 font-mono text-[10.5px] font-semibold text-slate-500">{DAY_LABELS[a.day]}</span>
                      <span className="font-mono text-navy-900">{a.start} – {a.end}</span>
                      <span className="text-[10.5px] text-slate-400 ml-auto">{duration(a.start, a.end).toFixed(1)}h</span>
                    </div>
                  ))
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
