import { useMemo, useState } from "react";
import type { AppState, Assignment, Block, Aircraft, User } from "../types";
import { DAY_FULL, DAY_LABELS, rangesOverlap } from "../types";
import { Card, SectionTitle, Button, Input, Label, Pill } from "./ui";
import { Logo, PlaneIcon } from "./Logo";
import { uid } from "../store";

type Props = {
  state: AppState;
  onChange: (next: AppState) => void;
};

type PropsWithReset = Props & { onReset: () => void };

export function AdminDashboard({ state, onChange, onReset }: PropsWithReset) {
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [drawerView, setDrawerView] = useState<"blocks" | "aircraft" | "flyers" | null>(null);
  const [rosterOpen, setRosterOpen] = useState(true);

  const dayBlocks = useMemo(
    () => state.blocks.filter((b) => b.day === selectedDay).sort((a, b) => a.start.localeCompare(b.start)),
    [state.blocks, selectedDay]
  );

  const selectedBlock = useMemo(
    () => (selectedBlockId ? state.blocks.find((b) => b.id === selectedBlockId) || null : null),
    [selectedBlockId, state.blocks]
  );

  const assignmentsByCell = useMemo(() => {
    const map = new Map<string, Assignment>();
    state.assignments.forEach((a) => {
      map.set(`${a.aircraftId}:${a.blockId}`, a);
    });
    return map;
  }, [state.assignments]);

  const availableForBlock = useMemo(() => {
    if (!selectedBlock) return new Set<string>();
    return new Set(
      state.availability
        .filter((a) => a.day === selectedBlock.day && rangesOverlap(a.start, a.end, selectedBlock.start, selectedBlock.end))
        .map((a) => a.flyerId)
    );
  }, [selectedBlock, state.availability]);

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

  const warningsList = useMemo(() => {
    const list: { flyerName: string; type: "conflict" | "threepeat" | "overfour" }[] = [];
    const conflictFlyers = new Set<string>();
    const threepeatFlyers = new Set<string>();
    const overfourFlyers = new Set<string>();

    state.assignments.forEach((a) => {
      const cellKey = `${a.aircraftId}:${a.blockId}`;
      if (conflictingCells.has(cellKey)) {
        if (a.pilotId) conflictFlyers.add(a.pilotId);
        if (a.coPilotId) conflictFlyers.add(a.coPilotId);
      }
      if (threepeatCells.has(cellKey)) {
        if (a.pilotId) threepeatFlyers.add(a.pilotId);
        if (a.coPilotId) threepeatFlyers.add(a.coPilotId);
      }
      if (overfourCells.has(cellKey)) {
        if (a.pilotId) overfourFlyers.add(a.pilotId);
        if (a.coPilotId) overfourFlyers.add(a.coPilotId);
      }
    });

    const nameFor = (id: string) => state.users.find((u) => u.id === id)?.name ?? id;

    conflictFlyers.forEach((id) => list.push({ flyerName: nameFor(id), type: "conflict" }));
    threepeatFlyers.forEach((id) => list.push({ flyerName: nameFor(id), type: "threepeat" }));
    overfourFlyers.forEach((id) => list.push({ flyerName: nameFor(id), type: "overfour" }));

    return list;
  }, [state.assignments, state.users, conflictingCells, threepeatCells, overfourCells]);

  const dayAssignments = state.assignments.filter((a) => {
    const b = state.blocks.find((x) => x.id === a.blockId);
    return b?.day === selectedDay;
  });
  const totalSlots = state.aircraft.length * dayBlocks.length;
  const fillRate = totalSlots ? Math.round((dayAssignments.length / totalSlots) * 100) : 0;

  function handleBlockHeaderClick(blockId: string) {
    setSelectedBlockId((curr) => (curr === blockId ? null : blockId));
  }

  function canFly(flyerId: string, block: Block) {
    return state.availability.some(
      (a) => a.flyerId === flyerId && a.day === block.day && rangesOverlap(a.start, a.end, block.start, block.end)
    );
  }

  function performDrop(droppedFlyerId: string | null, aircraftId: string, blockId: string) {
    if (!droppedFlyerId) return;
    const block = state.blocks.find((b) => b.id === blockId);
    const ac = state.aircraft.find((a) => a.id === aircraftId);
    const flyer = state.users.find((u) => u.id === droppedFlyerId);
    if (!block || !ac || !flyer) return;
    if (!ac.availableBlockIds.includes(blockId)) return;
    if (!canFly(droppedFlyerId, block)) return;

    const cellKey = `${aircraftId}:${blockId}`;
    const existing = assignmentsByCell.get(cellKey);

    if (existing) {
      if (existing.pilotId) {
        if (existing.pilotId === droppedFlyerId || existing.coPilotId === droppedFlyerId) return;
        if (existing.coPilotId) return;
        onChange({
          ...state,
          assignments: state.assignments.map((a) =>
            a.id === existing.id ? { ...a, coPilotId: droppedFlyerId } : a
          ),
        });
      } else {
        if (existing.coPilotId === droppedFlyerId) return;
        if (flyer.track !== "ip") return;
        onChange({
          ...state,
          assignments: state.assignments.map((a) =>
            a.id === existing.id ? { ...a, pilotId: droppedFlyerId } : a
          ),
        });
      }
    } else {
      if (flyer.track === "ip") {
        onChange({
          ...state,
          assignments: [
            ...state.assignments,
            { id: uid("a"), pilotId: droppedFlyerId, aircraftId, blockId },
          ],
        });
      } else {
        onChange({
          ...state,
          assignments: [
            ...state.assignments,
            { id: uid("a"), coPilotId: droppedFlyerId, aircraftId, blockId },
          ],
        });
      }
    }
  }

  function removeFromCell(aircraftId: string, blockId: string, role: "pilot" | "coPilot" | "both") {
    const cellKey = `${aircraftId}:${blockId}`;
    const a = assignmentsByCell.get(cellKey);
    if (!a) return;
    if (role === "both" || (role === "pilot" && a.coPilotId)) {
      onChange({ ...state, assignments: state.assignments.filter((x) => x.id !== a.id) });
    } else if (role === "pilot" && !a.coPilotId) {
      onChange({ ...state, assignments: state.assignments.filter((x) => x.id !== a.id) });
    } else if (role === "coPilot") {
      if (a.pilotId) {
        onChange({
          ...state,
          assignments: state.assignments.map((x) =>
            x.id === a.id ? { ...x, coPilotId: undefined } : x
          ),
        });
      } else {
        onChange({ ...state, assignments: state.assignments.filter((x) => x.id !== a.id) });
      }
    }
  }

  function clearDay() {
    const blockIdsForDay = new Set(dayBlocks.map((b) => b.id));
    onChange({
      ...state,
      assignments: state.assignments.filter((a) => !blockIdsForDay.has(a.blockId)),
    });
  }

  const conflicts = warningsList.filter((w) => w.type === "conflict");
  const threepeats = warningsList.filter((w) => w.type === "threepeat");
  const overfours = warningsList.filter((w) => w.type === "overfour");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ============================= TOPBAR ============================= */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size={30} showWordmark />
            <div className="h-5 w-px bg-slate-200" />
            <button
              onClick={() => {
                const next = (selectedDay + 1) % 7;
                setSelectedDay(next);
                setSelectedBlockId(null);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-navy-900 hover:bg-slate-100 transition"
              title="Change day (click to cycle)"
            >
              <span className="text-slate-400 text-[11px]">📅</span>
              {DAY_LABELS[selectedDay]}
            </button>
          </div>

          <div className="flex items-center gap-1">
            {(["blocks", "aircraft", "flyers"] as const).map((view) => (
              <button
                key={view}
                onClick={() => setDrawerView(drawerView === view ? null : view)}
                className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition
                  ${drawerView === view
                    ? "bg-navy-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-navy-900"
                  }`}
              >
                {view === "blocks" ? "Blocks" : view === "aircraft" ? "Aircraft" : "Flyers"}
              </button>
            ))}
            <div className="w-px h-5 bg-slate-200 mx-2" />
            <button
              onClick={onReset}
              className="text-[12px] text-slate-400 hover:text-slate-600 px-2 py-1.5 rounded-md hover:bg-slate-100 transition"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* ============================= STRIP ============================== */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-6 py-2.5 flex items-center flex-wrap gap-x-4 gap-y-1.5">
          {/* Day pills */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
            {DAY_LABELS.map((d, i) => (
              <button
                key={d}
                onClick={() => { setSelectedDay(i); setSelectedBlockId(null); }}
                className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium transition whitespace-nowrap ${
                  selectedDay === i
                    ? "bg-white text-navy-900 shadow-sm"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Quick stats */}
          <span className="text-[12px] text-slate-400 font-mono">|</span>
          <span className="text-[12px] text-slate-500">
            <strong className="text-navy-900">{dayBlocks.length}</strong> blocks
          </span>
          <span className="text-[12px] text-slate-500">
            <strong className="text-sky-600">{dayAssignments.length}</strong> pairs
            <span className="text-slate-400"> ({fillRate}%)</span>
          </span>
          <span className="text-[12px] text-slate-500">
            <strong className="text-navy-900">{state.aircraft.length}</strong> aircraft
          </span>

          {/* Warnings summary */}
          {(conflicts.length > 0 || threepeats.length > 0 || overfours.length > 0) && (
            <>
              <span className="text-[12px] text-slate-400 font-mono">|</span>
              {conflicts.length > 0 && (
                <span className="text-[11.5px] text-red-600" title={conflicts.map((w) => w.flyerName).join(", ")}>
                  ⚠ {conflicts.length} conflict{conflicts.length > 1 ? "s" : ""}: {conflicts.map((w) => w.flyerName.split(" ").pop()).join(", ")}
                </span>
              )}
              {threepeats.length > 0 && (
                <span className="text-[11.5px] text-amber-600" title={threepeats.map((w) => w.flyerName).join(", ")}>
                  ⚡ {threepeats.length} threepeat{threepeats.length > 1 ? "s" : ""}: {threepeats.map((w) => w.flyerName.split(" ").pop()).join(", ")}
                </span>
              )}
              {overfours.length > 0 && (
                <span className="text-[11.5px] text-rose-600" title={overfours.map((w) => w.flyerName).join(", ")}>
                  ◎ {overfours.length} over-four: {overfours.map((w) => w.flyerName.split(" ").pop()).join(", ")}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* ============================= MAIN ============================== */}
      <div className="max-w-[1600px] mx-auto px-6 py-5">
        {dayBlocks.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="text-slate-300 text-3xl mb-2">▦</div>
            <p className="text-[14px] text-slate-600">No block times defined for {DAY_FULL[selectedDay]}.</p>
            <p className="text-[12px] text-slate-400 mt-1">Open <button onClick={() => setDrawerView("blocks")} className="text-sky-600 underline hover:text-sky-700">Blocks</button> to set up today's operating windows.</p>
          </Card>
        ) : state.aircraft.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-[14px] text-slate-600">No aircraft in the fleet yet.</p>
            <p className="text-[12px] text-slate-400 mt-1">Open <button onClick={() => setDrawerView("aircraft")} className="text-sky-600 underline hover:text-sky-700">Aircraft</button> to add some.</p>
          </Card>
        ) : (
          <div className="flex gap-5 relative">
            {/* ============== SCHEDULER GRID ============== */}
            <div className="flex-1 min-w-0">
              <SchedulerGrid
                state={state}
                onChange={onChange}
                selectedBlockId={selectedBlockId}
                onBlockHeaderClick={handleBlockHeaderClick}
                dayBlocks={dayBlocks}
                assignmentsByCell={assignmentsByCell}
                conflictingCells={conflictingCells}
                threepeatCells={threepeatCells}
                overfourCells={overfourCells}
                onDrop={performDrop}
                onRemove={removeFromCell}
                onClearDay={clearDay}
                dayAssignmentsCount={dayAssignments.length}
              />
            </div>

            {/* ============== SIDEBAR (right) ============== */}
            <aside className={`w-[270px] shrink-0 transition-all duration-200 ${rosterOpen ? "" : "w-0 overflow-hidden"}`}>
              <div className="space-y-4">
                {/* Collapse toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                    {rosterOpen ? "Roster" : ""}
                  </span>
                  <button
                    onClick={() => setRosterOpen(!rosterOpen)}
                    className="text-[11px] text-slate-400 hover:text-navy-900 shrink-0"
                    title={rosterOpen ? "Collapse sidebar" : "Expand sidebar"}
                  >
                    {rosterOpen ? "▸" : "◂"}
                  </button>
                </div>

                {rosterOpen && (
                  <>
                    {/* ROSTER */}
                    <RosterPanel
                      state={state}
                      selectedBlock={selectedBlock}
                      onBlockFilter={setSelectedBlockId}
                      availableForBlock={availableForBlock}
                    />

                    {/* WARNINGS */}
                    {warningsList.length > 0 && (
                      <Card className="p-3">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Warnings
                        </div>
                        <div className="space-y-1.5">
                          {conflicts.map((w) => (
                            <div key={w.flyerName} className="flex items-center gap-1.5 text-[11.5px] text-red-700">
                              <span>⚠</span>
                              <span className="font-medium">{w.flyerName}</span>
                              <span className="text-red-500 ml-auto">conflict</span>
                            </div>
                          ))}
                          {threepeats.map((w) => (
                            <div key={w.flyerName} className="flex items-center gap-1.5 text-[11.5px] text-amber-700">
                              <span>⚡</span>
                              <span className="font-medium">{w.flyerName}</span>
                              <span className="text-amber-500 ml-auto">3× consecutive</span>
                            </div>
                          ))}
                          {overfours.map((w) => (
                            <div key={w.flyerName} className="flex items-center gap-1.5 text-[11.5px] text-rose-700">
                              <span>◎</span>
                              <span className="font-medium">{w.flyerName}</span>
                              <span className="text-rose-500 ml-auto">4+ flights</span>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* SELECTED CELL */}
                    {selectedBlockId && (
                      <SelectedCellPanel
                        state={state}
                        selectedBlockId={selectedBlockId}
                      />
                    )}
                  </>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* ============== DRAWER (overlays from right) ============== */}
        {drawerView && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/10"
              onClick={() => setDrawerView(null)}
            />
            <aside className="fixed top-0 right-0 z-40 h-full w-[420px] bg-white shadow-2xl border-l border-slate-200 overflow-y-auto">
              <div className="sticky top-0 bg-white/80 backdrop-blur border-b border-slate-200 px-5 py-3 flex items-center justify-between z-10">
                <span className="text-[14px] font-semibold text-navy-900 capitalize">{drawerView}</span>
                <button
                  onClick={() => setDrawerView(null)}
                  className="text-[14px] text-slate-400 hover:text-navy-900 p-1 rounded-md hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>
              <div className="p-5">
                {drawerView === "blocks" && (
                  <BlockManager state={state} onChange={onChange} compact selectedDay={selectedDay} />
                )}
                {drawerView === "aircraft" && (
                  <AircraftManager state={state} onChange={onChange} compact />
                )}
                {drawerView === "flyers" && (
                  <FlyersView state={state} onChange={onChange} compact />
                )}
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================= SCHEDULER GRID ============================= */

function SchedulerGrid({
  state,
  onChange,
  selectedBlockId,
  onBlockHeaderClick,
  dayBlocks,
  assignmentsByCell,
  conflictingCells,
  threepeatCells,
  overfourCells,
  onDrop,
  onRemove,
  onClearDay,
  dayAssignmentsCount,
}: {
  state: AppState;
  onChange: (next: AppState) => void;
  selectedBlockId: string | null;
  onBlockHeaderClick: (id: string) => void;
  dayBlocks: Block[];
  assignmentsByCell: Map<string, Assignment>;
  conflictingCells: Set<string>;
  threepeatCells: Set<string>;
  overfourCells: Set<string>;
  onDrop: (flyerId: string, acId: string, blockId: string) => void;
  onRemove: (acId: string, blockId: string, role: "pilot" | "coPilot" | "both") => void;
  onClearDay: () => void;
  dayAssignmentsCount: number;
}) {
  const [missionEditCell, setMissionEditCell] = useState<string | null>(null);
  const [missionDraft, setMissionDraft] = useState("");
  const [areaEditCell, setAreaEditCell] = useState<string | null>(null);
  const [areaDraft, setAreaDraft] = useState("");

  return (
    <Card className="p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[12px] text-slate-500">
          <span className="font-mono text-[11px] px-1.5 py-0.5 bg-navy-900 text-white rounded">SCHEDULE</span>
        </div>
        <Button variant="secondary" size="sm" onClick={onClearDay}>Clear day</Button>
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
                    onClick={() => onBlockHeaderClick(block.id)}
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
                          if (fid) onDrop(fid, ac.id, block.id);
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
                            : coPilot && !pilot
                            ? "bg-violet-50 border-violet-300"
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
                                onClick={() => onRemove(ac.id, block.id, "pilot")}
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
                                  onClick={() => onRemove(ac.id, block.id, "coPilot")}
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
                                  if (fid) onDrop(fid, ac.id, block.id);
                                }}
                                className="mt-1.5 h-6 rounded border border-dashed border-sky-300/50 flex items-center justify-center text-[9px] text-sky-600/70 hover:bg-sky-100/50 cursor-pointer"
                              >
                                + drop CP
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
                                  onChange({ ...state, assignments: state.assignments.map((a) =>
                                    a.id === assignment!.id ? { ...a, mission: missionDraft.trim() } : a
                                  )});
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
                                  onChange({ ...state, assignments: state.assignments.map((a) =>
                                    a.id === assignment!.id ? { ...a, areaAssignment: areaDraft.trim() } : a
                                  )});
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
                        ) : coPilot ? (
                          <div className="flex-1 flex flex-col justify-center">
                            <div className="flex items-center gap-1.5">
                              <Pill tone="sky" className="text-[9px] py-0 px-1">CP</Pill>
                              <span className="text-[11.5px] font-medium truncate flex-1">
                                {coPilot.rank && <span className="text-[10px] opacity-80 mr-0.5">{coPilot.rank}</span>}
                                {coPilot.name.split(" ")[0]}
                              </span>
                              {isConflict && <span className="text-[9px] text-red-600 font-bold ml-auto" title="Scheduling conflict">⚠</span>}
                              {isThreepeat && <span className="text-[9px] text-amber-600 font-bold ml-auto" title="3+ consecutive flights (SOP violation)">⚡</span>}
                              {isOverfour && <span className="text-[9px] text-rose-600 font-bold ml-auto" title="4+ flights in a day (SOP violation)">◎</span>}
                              <button
                                onClick={() => onRemove(ac.id, block.id, "coPilot")}
                                className="text-[10px] text-slate-400 hover:text-red-400 ml-1"
                                title="Remove co-pilot"
                              >
                                ✕
                              </button>
                            </div>
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
                                if (fid) onDrop(fid, ac.id, block.id);
                              }}
                              className="mt-1.5 h-6 rounded border border-dashed border-amber-300/50 bg-amber-50/50 flex items-center justify-center text-[9px] text-amber-600/70 hover:bg-amber-100/50 cursor-pointer"
                            >
                              + drop PIC
                            </div>
                            {missionEditCell === cellKey ? (
                              <input
                                autoFocus
                                value={missionDraft}
                                onChange={(e) => setMissionDraft(e.target.value)}
                                onBlur={() => {
                                  setMissionEditCell(null);
                                  if (!missionDraft.trim()) return;
                                  onChange({ ...state, assignments: state.assignments.map((a) =>
                                    a.id === assignment!.id ? { ...a, mission: missionDraft.trim() } : a
                                  )});
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
                                  onChange({ ...state, assignments: state.assignments.map((a) =>
                                    a.id === assignment!.id ? { ...a, areaAssignment: areaDraft.trim() } : a
                                  )});
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
                            drop PIC
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
        <div className="font-mono">{dayAssignmentsCount} crew pairs assigned</div>
      </div>
    </Card>
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

/* ============================= ROSTER PANEL =============================== */

function RosterPanel({
  state,
  selectedBlock,
  onBlockFilter,
  availableForBlock,
}: {
  state: AppState;
  selectedBlock: Block | null;
  onBlockFilter: (id: string | null) => void;
  availableForBlock: Set<string>;
}) {
  const [filter, setFilter] = useState("");
  const [trackFilter, setTrackFilter] = useState<"all" | "student" | "ip">("all");

  const flyers = state.users.filter((u) => u.role === "flyer");
  const q = filter.trim().toLowerCase();
  let filtered = q
    ? flyers.filter((f) => f.name.toLowerCase().includes(q) || f.callsign?.toLowerCase().includes(q))
    : flyers;
  if (trackFilter !== "all") filtered = filtered.filter((f) => f.track === trackFilter);
  if (selectedBlock) filtered = filtered.filter((f) => availableForBlock.has(f.id));

  const assignedInBlock = selectedBlock
    ? new Set(
        state.assignments
          .filter((a) => a.blockId === selectedBlock.id)
          .flatMap((a) => [a.pilotId, a.coPilotId])
          .filter(Boolean)
      )
    : new Set<string>();

  return (
    <>
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
        <div className="mb-2 flex items-center justify-between">
          <Pill tone="sky">{DAY_FULL[selectedBlock.day]} · {selectedBlock.start}–{selectedBlock.end}</Pill>
          <button
            onClick={() => onBlockFilter(null)}
            className="text-[10px] text-slate-500 hover:text-navy-900 underline"
          >
            Clear
          </button>
        </div>
      )}
      <Input
        placeholder="Search flyers..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-3"
      />
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="text-[12px] text-slate-400 text-center py-4">
            {selectedBlock ? "No flyers available" : "No flyers match your search"}
          </p>
        ) : (
          filtered.map((f) => {
            const isAssigned = assignedInBlock.has(f.id);
            return (
              <div
                key={f.id}
                draggable={!isAssigned}
                onDragStart={(e) => {
                  if (isAssigned) return;
                  e.dataTransfer.setData("text/plain", f.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                className={`flex items-center gap-2 p-2 rounded-lg border transition ${
                  isAssigned
                    ? "border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed"
                    : "border-sky-200 bg-sky-50 cursor-grab active:cursor-grabbing hover:border-sky-300"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy-700 to-navy-900 text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
                  {f.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium text-navy-900 truncate flex items-center gap-1">
                    {f.rank && <span className="text-[10px] font-semibold text-sky-600">{f.rank}</span>}
                    {f.name.split(" ")[0]}
                    {f.track === "student" && <span className="text-[8px] font-medium text-violet-600 bg-violet-50 px-1 rounded">AS</span>}
                    {f.track === "ip" && (
                      <>
                        <span className="text-[8px] font-medium text-amber-600 bg-amber-50 px-1 rounded">IP</span>
                        {f.qualification && <span className="text-[8px] font-mono text-slate-500 bg-slate-100 px-1 rounded">{f.qualification}</span>}
                      </>
                    )}
                  </div>
                  {f.callsign && <div className="text-[10px] font-mono text-slate-400">{f.callsign}</div>}
                </div>
                {selectedBlock && isAssigned && <Pill tone="slate" className="text-[9px]">Assigned</Pill>}
                {selectedBlock && !isAssigned && <Pill tone={f.track === "ip" ? "green" : "sky"} className="text-[9px]">{f.track === "ip" ? "PIC" : "CP"}</Pill>}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

/* ========================== SELECTED CELL PANEL =========================== */

function SelectedCellPanel({
  state,
  selectedBlockId,
}: {
  state: AppState;
  selectedBlockId: string;
}) {
  const block = state.blocks.find((b) => b.id === selectedBlockId);
  if (!block) return null;

  const relevant = state.assignments.filter((a) => a.blockId === selectedBlockId);

  return (
    <Card className="p-3">
      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
        Selected block
      </div>
      <Pill tone="sky" className="mb-3">{block.start}–{block.end}</Pill>
      {relevant.length === 0 ? (
        <p className="text-[11px] text-slate-400">No assignments for this block.</p>
      ) : (
        <div className="space-y-2">
          {relevant.map((a) => {
            const ac = state.aircraft.find((x) => x.id === a.aircraftId);
            const pilot = a.pilotId ? state.users.find((u) => u.id === a.pilotId) : null;
            const coPilot = a.coPilotId ? state.users.find((u) => u.id === a.coPilotId) : null;
            return (
              <div key={a.id} className="text-[12px] border border-slate-100 rounded-lg p-2">
                {ac && <div className="font-mono font-semibold text-navy-900">{ac.tailNumber}</div>}
                <div className="text-slate-500 mt-0.5">
                  {pilot && <span>PIC: {pilot.name.split(" ")[0]}</span>}
                  {coPilot && <span> {pilot ? "+" : "CP:"} {coPilot.name.split(" ")[0]}</span>}
                </div>
                {a.mission && <div className="text-[10px] text-sky-600 mt-0.5">MSN: {a.mission}</div>}
                {a.areaAssignment && <div className="text-[10px] text-sky-600">AA: {a.areaAssignment}</div>}
              </div>
            );
          })}
        </div>
      )}
    </Card>
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

function BlockManager({ state, onChange, compact, selectedDay }: Props & { compact?: boolean; selectedDay: number }) {
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
    const days = applyTo === "week" ? [0, 1, 2, 3, 4, 5, 6] : [selectedDay];
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
    .filter((b) => b.day === selectedDay)
    .sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className={compact ? "space-y-5" : "grid md:grid-cols-3 gap-6"}>
      <Card className={compact ? "p-4" : "p-6"}>
        <SectionTitle
          title="Add block time"
          subtitle={compact ? undefined : `Define operating windows for ${DAY_FULL[selectedDay]}.`}
        />
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label>Day</Label>
            <Pill tone="navy">{DAY_FULL[selectedDay]}</Pill>
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
            {applyTo === "week" ? "Add to all 7 days" : `Add block for ${DAY_LABELS[selectedDay]}`}
          </Button>
        </div>
      </Card>

      <Card className={compact ? "p-4" : "p-6 md:col-span-2"}>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle
            title={`Blocks for ${DAY_LABELS[selectedDay]}`}
            subtitle={compact ? undefined : `${blocksForDay.length} block${blocksForDay.length === 1 ? "" : "s"} configured`}
          />
        </div>
        <div className="space-y-2">
          {blocksForDay.length === 0 ? (
            <p className="text-[13px] text-slate-500 py-6 text-center">No blocks configured for {DAY_FULL[selectedDay]}.</p>
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

function AircraftManager({ state, onChange, compact }: Props & { compact?: boolean }) {
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
    <div className={compact ? "space-y-5" : "grid md:grid-cols-3 gap-6"}>
      <Card className={compact ? "p-4" : "p-6"}>
        <SectionTitle title="Add aircraft" subtitle={compact ? undefined : "Tail, type & available blocks"} />
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
            <div className="flex items-center gap-2 mb-2">
              <Label>Available blocks</Label>
            </div>
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

      <Card className={compact ? "p-4" : "p-6 md:col-span-2"}>
        <SectionTitle title="Fleet" subtitle={compact ? undefined : "Toggle each aircraft's availability across the week"} />
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
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Weekly availability
                </div>
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
        No block times defined yet. Open "Blocks" to create some.
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

/* ================================== FLYERS ================================ */

function FlyersView({ state, onChange, compact }: Props & { compact?: boolean }) {
  const flyers = state.users.filter((u) => u.role === "flyer");
  return (
    <div className={compact ? "space-y-3" : "grid md:grid-cols-2 xl:grid-cols-3 gap-4"}>
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
