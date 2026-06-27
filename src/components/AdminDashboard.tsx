import { useMemo, useState } from "react";
import type { AppState, Assignment, Availability, Block, Aircraft, User } from "../types";
import { DAY_FULL, DAY_LABELS, lastName, rangesOverlap } from "../types";
import { cn } from "../utils/cn";
import { Card, SectionTitle, Button, Input, Label, Pill } from "./ui";
import { Logo, PlaneIcon } from "./Logo";
import { uid } from "../store";

type Props = {
  state: AppState;
  onChange: (next: AppState) => void;
};

type PropsWithReset = Props & { onReset: () => void; user: User; onLogout: () => void };

export function AdminDashboard({ state, onChange, onReset, user, onLogout }: PropsWithReset) {
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [drawerView, setDrawerView] = useState<"blocks" | "aircraft" | "flyers" | null>(null);
  const [rosterOpen, setRosterOpen] = useState(true);
  const [pendingMove, setPendingMove] = useState<{
    srcAcId: string;
    srcBlockId: string;
    targetAcId: string;
    targetBlockId: string;
  } | null>(null);
  const [availWarning, setAvailWarning] = useState<{
    srcAcId: string;
    srcBlockId: string;
    targetAcId: string;
    targetBlockId: string;
    missingFlyers: { role: string; name: string }[];
    type: "move" | "swap";
  } | null>(null);

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

  const rankOrder = useMemo(() => {
    const order = new Map<string, number>();
    order.set("COL", 6);
    order.set("LTC", 5);
    order.set("MAJ", 4);
    order.set("CPT", 3);
    order.set("1LT", 2);
    order.set("2LT", 1);
    return order;
  }, []);

  const flyerFlightCount = useMemo(() => {
    const counts = new Map<string, number>();
    const dayBlockIds = new Set(dayBlocks.map((b) => b.id));
    state.assignments.forEach((a) => {
      if (!dayBlockIds.has(a.blockId)) return;
      if (a.pilotId) counts.set(a.pilotId, (counts.get(a.pilotId) || 0) + 1);
      if (a.coPilotId) counts.set(a.coPilotId, (counts.get(a.coPilotId) || 0) + 1);
    });
    return counts;
  }, [state.assignments, dayBlocks]);

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

    const nameFor = (id: string) => {
      const u = state.users.find((u) => u.id === id);
      return u ? lastName(u) : id;
    };

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

  function autoFillBlock() {
    if (!selectedBlock) return;
    const block = selectedBlock;
    const used = new Set<string>();
    const nextAvail = (list: User[]) => list.find((u) => !used.has(u.id));
    const sortFn = (a: User, b: User) => {
      const aFlt = flyerFlightCount.get(a.id) ?? 0;
      const bFlt = flyerFlightCount.get(b.id) ?? 0;
      if (aFlt !== bFlt) return aFlt - bFlt;
      const aRank = rankOrder.get(a.rank ?? "") ?? 0;
      const bRank = rankOrder.get(b.rank ?? "") ?? 0;
      if (bRank !== aRank) return bRank - aRank;
      return a.name.localeCompare(b.name);
    };

    const ips = state.users
      .filter((u) => u.role === "flyer" && u.track === "ip" && availableForBlock.has(u.id))
      .filter((u) => !state.assignments.some((a) => a.blockId === block.id && (a.pilotId === u.id || a.coPilotId === u.id)))
      .sort(sortFn);
    const students = state.users
      .filter((u) => u.role === "flyer" && u.track === "student" && availableForBlock.has(u.id))
      .filter((u) => !state.assignments.some((a) => a.blockId === block.id && (a.pilotId === u.id || a.coPilotId === u.id)))
      .sort(sortFn);

    const updated = state.assignments.map((a) => ({ ...a }));
    let changed = false;

    state.aircraft.forEach((ac) => {
      if (!ac.availableBlockIds.includes(block.id)) return;
      const cellKey = `${ac.id}:${block.id}`;
      const existing = assignmentsByCell.get(cellKey);

      if (existing) {
        if (existing.pilotId && existing.coPilotId) return;
        if (existing.pilotId && !existing.coPilotId) {
          const s = nextAvail(students);
          if (!s) return;
          used.add(s.id);
          const idx = updated.findIndex((a) => a.id === existing.id);
          updated[idx] = { ...updated[idx], coPilotId: s.id };
          changed = true;
        } else if (!existing.pilotId && existing.coPilotId) {
          const ip = nextAvail(ips);
          if (!ip) return;
          used.add(ip.id);
          const idx = updated.findIndex((a) => a.id === existing.id);
          updated[idx] = { ...updated[idx], pilotId: ip.id };
          changed = true;
        }
      } else {
        const ip = nextAvail(ips);
        const s = nextAvail(students);
        if (!ip || !s) return;
        used.add(ip.id);
        used.add(s.id);
        updated.push({ id: uid("a"), pilotId: ip.id, coPilotId: s.id, aircraftId: ac.id, blockId: block.id });
        changed = true;
      }
    });

    if (!changed) return;
    onChange({ ...state, assignments: updated });
  }

  function autoArrange() {
    const dayBlockIds = dayBlocks.map((b) => b.id);
    const blockIdx = new Map(dayBlockIds.map((id, i) => [id, i]));

    const byPilot = new Map<string, { assignmentId: string; aircraftId: string; blockIdx: number }[]>();
    state.assignments.forEach((a) => {
      if (!blockIdx.has(a.blockId) || !a.pilotId) return;
      if (!byPilot.has(a.pilotId)) byPilot.set(a.pilotId, []);
      byPilot.get(a.pilotId)!.push({ assignmentId: a.id, aircraftId: a.aircraftId, blockIdx: blockIdx.get(a.blockId)! });
    });

    let changed = false;
    const updated = state.assignments.map((a) => ({ ...a }));

    for (const [, entries] of byPilot) {
      entries.sort((a, b) => a.blockIdx - b.blockIdx);
      for (let i = 0; i < entries.length - 1; i++) {
        const curr = entries[i];
        const next = entries[i + 1];
        if (next.blockIdx !== curr.blockIdx + 1) continue;
        if (next.aircraftId === curr.aircraftId) continue;

        const targetBlockId = dayBlockIds[next.blockIdx];
        const ac = state.aircraft.find((a) => a.id === curr.aircraftId);
        if (!ac || !ac.availableBlockIds.includes(targetBlockId)) continue;

        const cellOccupant = updated.find((a) => a.aircraftId === curr.aircraftId && a.blockId === targetBlockId);

        const nextIdx = updated.findIndex((a) => a.id === next.assignmentId);
        if (nextIdx < 0) continue;

        if (cellOccupant) {
          const occIdx = updated.findIndex((a) => a.id === cellOccupant.id);
          if (occIdx < 0) continue;
          updated[occIdx] = { ...updated[occIdx], aircraftId: next.aircraftId };
          updated[nextIdx] = { ...updated[nextIdx], aircraftId: curr.aircraftId };
          next.aircraftId = curr.aircraftId;
        } else {
          updated[nextIdx] = { ...updated[nextIdx], aircraftId: curr.aircraftId };
          next.aircraftId = curr.aircraftId;
        }
        changed = true;
      }
    }

    if (!changed) return;
    onChange({ ...state, assignments: updated });
  }

  function handleSortieDrop(srcAcId: string, srcBlockId: string, targetAcId: string, targetBlockId: string) {
    const srcAssignment = state.assignments.find(
      (a) => a.aircraftId === srcAcId && a.blockId === srcBlockId
    );
    if (!srcAssignment) return;
    if (srcAcId === targetAcId && srcBlockId === targetBlockId) return;
    setPendingMove({ srcAcId, srcBlockId, targetAcId, targetBlockId });
  }

  function confirmSortieMove() {
    const mv = pendingMove;
    if (!mv) return;
    const srcAssignment = state.assignments.find(
      (a) => a.aircraftId === mv.srcAcId && a.blockId === mv.srcBlockId
    );
    const targetBlock = state.blocks.find((b) => b.id === mv.targetBlockId);
    if (!srcAssignment || !targetBlock) { setPendingMove(null); return; }

    const missingFlyers: { role: string; name: string }[] = [];
    const check = (fid: string | undefined, role: string) => {
      if (!fid) return;
      if (!state.availability.some(
        (a) => a.flyerId === fid && a.day === targetBlock.day && rangesOverlap(a.start, a.end, targetBlock.start, targetBlock.end)
      )) {
        const u = state.users.find((x) => x.id === fid);
        missingFlyers.push({ role, name: u ? lastName(u) : fid });
      }
    };
    check(srcAssignment.pilotId, "PIC");
    check(srcAssignment.coPilotId, "CP");

    if (missingFlyers.length > 0) {
      setAvailWarning({ ...mv, missingFlyers, type: "move" });
      return;
    }

    executeSortieMove(mv, srcAssignment, targetBlock);
  }

  function executeSortieMove(
    mv: NonNullable<typeof pendingMove>,
    srcAssignment: Assignment,
    targetBlock: Block
  ) {
    const newAvailability: Availability[] = [];
    const ensureAvail = (flyerId: string | undefined) => {
      if (!flyerId) return;
      if (state.availability.some(
        (a) => a.flyerId === flyerId && a.day === targetBlock.day && rangesOverlap(a.start, a.end, targetBlock.start, targetBlock.end)
      )) return;
      newAvailability.push({ id: uid("av"), flyerId, day: targetBlock.day, start: targetBlock.start, end: targetBlock.end });
    };
    ensureAvail(srcAssignment.pilotId);
    ensureAvail(srcAssignment.coPilotId);

    const targetCellKey = `${mv.targetAcId}:${mv.targetBlockId}`;
    onChange({
      ...state,
      assignments: state.assignments
        .filter((a) => `${a.aircraftId}:${a.blockId}` !== targetCellKey || a.id === srcAssignment.id)
        .map((a) =>
          a.id === srcAssignment.id ? { ...a, aircraftId: mv.targetAcId, blockId: mv.targetBlockId } : a
        ),
      availability: [...state.availability, ...newAvailability],
    });
    setPendingMove(null);
    setAvailWarning(null);
  }

  function swapSortieMove() {
    const mv = pendingMove;
    if (!mv) return;
    const srcAssignment = state.assignments.find(
      (a) => a.aircraftId === mv.srcAcId && a.blockId === mv.srcBlockId
    );
    const targetAssignment = assignmentsByCell.get(`${mv.targetAcId}:${mv.targetBlockId}`);
    if (!srcAssignment || !targetAssignment) { setPendingMove(null); return; }

    const srcBlock = state.blocks.find((b) => b.id === mv.srcBlockId);
    const targetBlock = state.blocks.find((b) => b.id === mv.targetBlockId);
    if (!srcBlock || !targetBlock) { setPendingMove(null); return; }

    const missingFlyers: { role: string; name: string }[] = [];
    const check = (fid: string | undefined, role: string, block: Block) => {
      if (!fid) return;
      if (!state.availability.some(
        (a) => a.flyerId === fid && a.day === block.day && rangesOverlap(a.start, a.end, block.start, block.end)
      )) {
        const u = state.users.find((x) => x.id === fid);
        missingFlyers.push({ role, name: u ? lastName(u) : fid });
      }
    };
    check(srcAssignment.pilotId, "PIC", targetBlock);
    check(srcAssignment.coPilotId, "CP", targetBlock);
    check(targetAssignment.pilotId, "PIC", srcBlock);
    check(targetAssignment.coPilotId, "CP", srcBlock);

    if (missingFlyers.length > 0) {
      setAvailWarning({ ...mv, missingFlyers, type: "swap" });
      return;
    }

    executeSwapSortieMove(mv, srcAssignment, targetAssignment, srcBlock, targetBlock);
  }

  function executeSwapSortieMove(
    mv: NonNullable<typeof pendingMove>,
    srcAssignment: Assignment,
    targetAssignment: Assignment,
    srcBlock: Block,
    targetBlock: Block
  ) {
    const newAvailability: Availability[] = [];
    const ensureAvail = (flyerId: string | undefined, block: Block) => {
      if (!flyerId) return;
      if (state.availability.some(
        (a) => a.flyerId === flyerId && a.day === block.day && rangesOverlap(a.start, a.end, block.start, block.end)
      )) return;
      newAvailability.push({ id: uid("av"), flyerId, day: block.day, start: block.start, end: block.end });
    };
    ensureAvail(srcAssignment.pilotId, targetBlock);
    ensureAvail(srcAssignment.coPilotId, targetBlock);
    ensureAvail(targetAssignment.pilotId, srcBlock);
    ensureAvail(targetAssignment.coPilotId, srcBlock);

    onChange({
      ...state,
      assignments: state.assignments.map((a) => {
        if (a.id === srcAssignment.id) return { ...a, aircraftId: mv.targetAcId, blockId: mv.targetBlockId };
        if (a.id === targetAssignment.id) return { ...a, aircraftId: mv.srcAcId, blockId: mv.srcBlockId };
        return a;
      }),
      availability: [...state.availability, ...newAvailability],
    });
    setPendingMove(null);
    setAvailWarning(null);
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
            <div className="w-px h-5 bg-slate-200 mx-2" />
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <div className="text-[12px] font-medium text-navy-900">
                  {user.rank && <span className="text-[10px] font-semibold text-sky-600 mr-1">{user.rank}</span>}
                  {lastName(user)}
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy-700 to-navy-900 text-white flex items-center justify-center text-[11px] font-semibold">
                {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <button
                onClick={onLogout}
                className="text-[12px] text-slate-500 hover:text-navy-900 px-2 py-1.5 rounded-md hover:bg-slate-100 transition"
              >
                Sign out
              </button>
            </div>
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
                onSortieDrop={handleSortieDrop}
                onRemove={removeFromCell}
                onClearDay={clearDay}
                onAutoArrange={autoArrange}
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
                      flyerFlightCount={flyerFlightCount}
                      rankOrder={rankOrder}
                      onChange={onChange}
                      onAutoFill={autoFillBlock}
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

      {/* ============ CONFIRM SORTIE MOVE MODAL ============ */}
      {pendingMove && (() => {
        const src = state.assignments.find(
          (a) => a.aircraftId === pendingMove.srcAcId && a.blockId === pendingMove.srcBlockId
        );
        const srcAc = state.aircraft.find((a) => a.id === pendingMove.srcAcId);
        const srcBlock = state.blocks.find((b) => b.id === pendingMove.srcBlockId);
        const targetAc = state.aircraft.find((a) => a.id === pendingMove.targetAcId);
        const targetBlock = state.blocks.find((b) => b.id === pendingMove.targetBlockId);
        const targetAssignment = assignmentsByCell.get(`${pendingMove.targetAcId}:${pendingMove.targetBlockId}`);
        const pilot = src?.pilotId ? state.users.find((u) => u.id === src.pilotId) : null;
        const coPilot = src?.coPilotId ? state.users.find((u) => u.id === src.coPilotId) : null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPendingMove(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-[440px] max-w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 border-b border-slate-200">
                <h2 className="text-[15px] font-bold text-navy-900">Confirm Sortie Move</h2>
              </div>
              <div className="p-5 space-y-3 text-[13px]">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">From</div>
                    <div className="font-mono font-semibold text-navy-900">{srcAc?.tailNumber ?? "—"}</div>
                    <div className="text-slate-500">{srcBlock?.start ?? "—"} – {srcBlock?.end ?? "—"}</div>
                    {pilot && <div className="text-navy-900 mt-1"><span className="text-[10px] font-semibold text-sky-600">PIC </span>{pilot.rank} {lastName(pilot)}</div>}
                    {coPilot && <div className="text-navy-900"><span className="text-[10px] font-semibold text-sky-600">CP </span>{coPilot.rank} {lastName(coPilot)}</div>}
                    {src?.mission && <div className="text-slate-500 text-[11px]">MSN: {src.mission}</div>}
                    {src?.areaAssignment && <div className="text-slate-500 text-[11px]">AA: {src.areaAssignment}</div>}
                  </div>
                  <div className="text-slate-300 text-2xl mt-4">→</div>
                  <div className="flex-1">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">To</div>
                    <div className="font-mono font-semibold text-navy-900">{targetAc?.tailNumber ?? "—"}</div>
                    <div className="text-slate-500">{targetBlock?.start ?? "—"} – {targetBlock?.end ?? "—"}</div>
                    {targetAssignment ? (
                      <div className="mt-1 text-amber-600 text-[11px]">
                        ⚠ Will overwrite existing assignment
                        {(() => {
                          const tp = targetAssignment.pilotId ? state.users.find((u) => u.id === targetAssignment.pilotId) : null;
                          const tcp = targetAssignment.coPilotId ? state.users.find((u) => u.id === targetAssignment.coPilotId) : null;
                          return (
                            <>
                              {tp && <div className="text-navy-900 text-[12px]">PIC {tp.rank} {lastName(tp)}</div>}
                              {tcp && <div className="text-navy-900 text-[12px]">CP {tcp.rank} {lastName(tcp)}</div>}
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="text-slate-400 text-[11px] mt-1">Empty — ready for assignment</div>
                    )}
                    <div className="text-[11px] text-sky-600 mt-1">
                      ✨ Flyer availability will be added automatically
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-slate-200 flex justify-end gap-2">
                <button
                  onClick={() => setPendingMove(null)}
                  className="px-4 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                {targetAssignment ? (
                  <button
                    onClick={swapSortieMove}
                    className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-green-700 text-white hover:bg-green-800 transition shadow-sm"
                  >
                    Swap
                  </button>
                ) : null}
                <button
                  onClick={confirmSortieMove}
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-navy-900 text-white hover:bg-navy-800 transition shadow-sm"
                >
                  Move
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============ AVAILABILITY WARNING MODAL ============ */}
      {availWarning && (() => {
        const targetAc = state.aircraft.find((a) => a.id === availWarning.targetAcId);
        const targetBlock = state.blocks.find((b) => b.id === availWarning.targetBlockId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setAvailWarning(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-[420px] max-w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 border-b border-slate-200 flex items-center gap-2">
                <span className="text-amber-500 text-lg">⚠</span>
                <h2 className="text-[15px] font-bold text-navy-900">Availability Warning</h2>
              </div>
              <div className="p-5 space-y-2 text-[13px]">
                {availWarning.type === "swap" ? (
                  <p className="text-slate-600">
                    The following crew member{availWarning.missingFlyers.length > 1 ? "s are" : " is"} not available for
                    {" "}their new block and will need availability added:
                  </p>
                ) : (
                  <p className="text-slate-600">
                    The following crew member{availWarning.missingFlyers.length > 1 ? "s are" : " is"} not available for
                    {" "}{targetAc?.tailNumber ?? "—"} ({targetBlock?.start ?? "—"} – {targetBlock?.end ?? "—"}):
                  </p>
                )}
                <ul className="space-y-1">
                  {availWarning.missingFlyers.map((f) => (
                    <li key={f.role} className="flex items-center gap-2 text-navy-900 font-medium">
                      <span className="text-[10px] font-semibold text-sky-600">{f.role}</span>
{f.name}
                    </li>
                  ))}
                </ul>
                <p className="text-sky-700 text-[12px] pt-1">
                  {availWarning.type === "swap"
                    ? "Availability will be added automatically for both blocks."
                    : "Availability will be added automatically for this block."}
                </p>
              </div>
              <div className="p-5 border-t border-slate-200 flex justify-end gap-2">
                <button
                  onClick={() => setAvailWarning(null)}
                  className="px-4 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const aw = availWarning;
                    if (!aw) return;
                    if (aw.type === "swap") {
                      const sa = state.assignments.find(
                        (a) => a.aircraftId === aw.srcAcId && a.blockId === aw.srcBlockId
                      );
                      const ta = assignmentsByCell.get(`${aw.targetAcId}:${aw.targetBlockId}`);
                      const sb = state.blocks.find((b) => b.id === aw.srcBlockId);
                      const tb = state.blocks.find((b) => b.id === aw.targetBlockId);
                      if (sa && ta && sb && tb) {
                        executeSwapSortieMove(
                          { srcAcId: aw.srcAcId, srcBlockId: aw.srcBlockId, targetAcId: aw.targetAcId, targetBlockId: aw.targetBlockId },
                          sa, ta, sb, tb
                        );
                      } else {
                        setAvailWarning(null);
                        setPendingMove(null);
                      }
                    } else {
                      const sa = state.assignments.find(
                        (a) => a.aircraftId === aw.srcAcId && a.blockId === aw.srcBlockId
                      );
                      const tb = state.blocks.find((b) => b.id === aw.targetBlockId);
                      if (sa && tb) {
                        executeSortieMove(
                          { srcAcId: aw.srcAcId, srcBlockId: aw.srcBlockId, targetAcId: aw.targetAcId, targetBlockId: aw.targetBlockId },
                          sa, tb
                        );
                      } else {
                        setAvailWarning(null);
                        setPendingMove(null);
                      }
                    }
                  }}
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-amber-600 text-white hover:bg-amber-700 transition shadow-sm"
                >
                  Proceed
                </button>
              </div>
            </div>
          </div>
        );
      })()}
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
  onSortieDrop,
  onRemove,
  onClearDay,
  onAutoArrange,
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
  onSortieDrop: (srcAcId: string, srcBlockId: string, targetAcId: string, targetBlockId: string) => void;
  onRemove: (acId: string, blockId: string, role: "pilot" | "coPilot" | "both") => void;
  onClearDay: () => void;
  onAutoArrange: () => void;
  dayAssignmentsCount: number;
}) {
  const [missionEditCell, setMissionEditCell] = useState<string | null>(null);
  const [missionDraft, setMissionDraft] = useState("");
  const [areaEditCell, setAreaEditCell] = useState<string | null>(null);
  const [areaDraft, setAreaDraft] = useState("");
  const [highlightedCell, setHighlightedCell] = useState<string | null>(null);

  return (
    <Card className="p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[12px] text-slate-500">
          <span className="font-mono text-[11px] px-1.5 py-0.5 bg-navy-900 text-white rounded">SCHEDULE</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onAutoArrange}>Auto-arrange</Button>
          <Button variant="secondary" size="sm" onClick={onClearDay}>Clear day</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-separate border-spacing-1.5">
          <thead>
            <tr>
              <th className="w-28 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-2 px-1">
                AC
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
                <td className="py-1.5 px-1 align-middle">
                  <div className="flex items-center gap-1.5">
                    <div className="w-7 h-7 rounded-lg bg-navy-900 text-white flex items-center justify-center shrink-0">
                      <PlaneIcon size={11} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-mono font-semibold text-navy-900 truncate">{ac.tailNumber}</div>
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
                        draggable={!!assignment}
                        onDragStart={(e) => {
                          if (!assignment) return;
                          e.dataTransfer.setData("text/plain", `sortie:${assignment.aircraftId}:${assignment.blockId}`);
                          e.dataTransfer.setData("text/x-sortie", `${assignment.aircraftId}:${assignment.blockId}`);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnter={(e) => {
                          if (e.dataTransfer.types?.includes("text/x-sortie")) {
                            setHighlightedCell(cellKey);
                          }
                        }}
                        onDragOver={(e) => {
                          if (e.dataTransfer.types?.includes("text/x-sortie")) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            return;
                          }
                          if (!acAvail || isFull) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setHighlightedCell((prev) => prev === cellKey ? null : prev);
                          }
                        }}
                        onDragEnd={() => setHighlightedCell(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setHighlightedCell(null);
                          const sortieData = e.dataTransfer.getData("text/x-sortie");
                          if (sortieData) {
                            const colon = sortieData.indexOf(":");
                            if (colon > 0) {
                              onSortieDrop(sortieData.slice(0, colon), sortieData.slice(colon + 1), ac.id, block.id);
                            }
                          } else {
                            const fid = e.dataTransfer.getData("text/plain");
                            if (fid) onDrop(fid, ac.id, block.id);
                          }
                        }}
                        className={`h-24 rounded-lg border transition-all flex flex-col p-1 ${
                          highlightedCell === cellKey
                            ? "bg-sky-100 border-sky-500 ring-2 ring-sky-400"
                            : isConflict
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
                        } ${assignment && acAvail ? "cursor-grab active:cursor-grabbing" : ""}`}
                      >
                        {pilot ? (
                          <div className="flex-1 flex flex-col justify-center">
                            <div className="flex items-center gap-1.5">
                              <Pill tone="navy" className="text-[9px] py-0 px-1">PIC</Pill>
                              <span className="text-[11.5px] font-semibold truncate flex-1">
                                {pilot.rank && <span className="text-[10px] opacity-80 mr-0.5">{pilot.rank}</span>}
                                {lastName(pilot)}
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
                                  {lastName(coPilot)}
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
                                  if (e.dataTransfer.types?.includes("text/x-sortie")) return;
                                  e.stopPropagation();
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = "move";
                                }}
                                onDrop={(e) => {
                                  if (e.dataTransfer.getData("text/x-sortie")) return;
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
                                {lastName(coPilot)}
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
                                if (e.dataTransfer.types?.includes("text/x-sortie")) return;
                                e.stopPropagation();
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                              }}
                              onDrop={(e) => {
                                if (e.dataTransfer.getData("text/x-sortie")) return;
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
  flyerFlightCount,
  rankOrder,
  onChange,
  onAutoFill,
}: {
  state: AppState;
  selectedBlock: Block | null;
  onBlockFilter: (id: string | null) => void;
  availableForBlock: Set<string>;
  flyerFlightCount: Map<string, number>;
  rankOrder: Map<string, number>;
  onChange: (next: AppState) => void;
  onAutoFill: () => void;
}) {
  const [filter, setFilter] = useState("");
  const [trackFilter, setTrackFilter] = useState<"student" | "ip">("ip");

  const flyers = state.users.filter((u) => u.role === "flyer");
  const q = filter.trim().toLowerCase();
  let filtered = q
    ? flyers.filter((f) => f.name.toLowerCase().includes(q) || f.callsign?.toLowerCase().includes(q))
    : flyers;
  filtered = filtered.filter((f) => f.track === trackFilter);

  const assignedInBlock = selectedBlock
    ? new Set(
        state.assignments
          .filter((a) => a.blockId === selectedBlock.id)
          .flatMap((a) => [a.pilotId, a.coPilotId])
          .filter(Boolean)
      )
    : new Set<string>();

  interface FlyerEntry { flyer: User; isAvailable: boolean; isAssigned: boolean; }
  let entries: FlyerEntry[] = filtered.map((f) => ({
    flyer: f,
    isAvailable: selectedBlock ? availableForBlock.has(f.id) : true,
    isAssigned: selectedBlock ? assignedInBlock.has(f.id) : false,
  }));

  entries.sort((a, b) => sortByPriority(a, b, flyerFlightCount, rankOrder));

  function handleToggleAvailability(flyerId: string) {
    if (!selectedBlock) return;
    const currentlyAvailable = availableForBlock.has(flyerId);
    if (currentlyAvailable) {
      const toRemove = state.availability.filter(
        (a) => a.flyerId === flyerId && a.day === selectedBlock.day && rangesOverlap(a.start, a.end, selectedBlock.start, selectedBlock.end)
      );
      const removeIds = new Set(toRemove.map((a) => a.id));
      onChange({ ...state, availability: state.availability.filter((a) => !removeIds.has(a.id)) });
    } else {
      const newAvail: Availability = {
        id: uid("av"),
        flyerId,
        day: selectedBlock.day,
        start: selectedBlock.start,
        end: selectedBlock.end,
      };
      onChange({ ...state, availability: [...state.availability, newAvail] });
    }
  }

  return (
    <>
      <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg mb-3">
        {(["ip", "student"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTrackFilter(t)}
            className={`flex-1 py-1 text-[11.5px] font-medium rounded-md transition ${
              trackFilter === t ? "bg-white text-navy-900 shadow-sm" : "text-slate-500"
            }`}
          >
            {t === "ip" ? "IP" : "AS"}
          </button>
        ))}
      </div>

      {selectedBlock && (
        <div className="mb-2 flex items-center justify-between">
          <Pill tone="sky">{DAY_FULL[selectedBlock.day]} · {selectedBlock.start}–{selectedBlock.end}</Pill>
          <div className="flex items-center gap-2">
            <button
              onClick={onAutoFill}
              className="text-[10px] text-sky-600 hover:text-sky-800 font-semibold"
            >
              Auto-fill
            </button>
            <button
              onClick={() => onBlockFilter(null)}
              className="text-[10px] text-slate-500 hover:text-navy-900 underline"
            >
              Clear
            </button>
          </div>
        </div>
      )}
      <Input
        placeholder="Search flyers..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-3"
      />
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
        {entries.length === 0 ? (
          <p className="text-[12px] text-slate-400 text-center py-4">
            {selectedBlock ? "No flyers" : "No flyers match your search"}
          </p>
        ) : (
          entries.map(({ flyer: f, isAvailable, isAssigned }) => {
            const flightCount = flyerFlightCount.get(f.id) ?? 0;
            return (
              <div
                key={f.id}
                draggable={!isAssigned && isAvailable}
                onDragStart={(e) => {
                  if (isAssigned || !isAvailable) return;
                  e.dataTransfer.setData("text/plain", f.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                className={`flex items-center gap-2 p-2 rounded-lg border transition ${
                  isAssigned
                    ? "border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed"
                    : !isAvailable
                    ? "border-slate-200 bg-white opacity-40"
                    : "border-sky-200 bg-sky-50 cursor-grab active:cursor-grabbing hover:border-sky-300"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy-700 to-navy-900 text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
                  {f.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium text-navy-900 truncate flex items-center gap-1">
                    {f.rank && <span className="text-[10px] font-semibold text-sky-600">{f.rank}</span>}
{lastName(f)}
                    {f.track === "student" && <span className="text-[8px] font-medium text-violet-600 bg-violet-50 px-1 rounded">AS</span>}
                    {f.track === "ip" && (
                      <>
                        <span className="text-[8px] font-medium text-amber-600 bg-amber-50 px-1 rounded">IP</span>
                        {f.qualifications && f.qualifications.length > 0 && <span className="text-[8px] font-mono text-slate-500 bg-slate-100 px-1 rounded">{f.qualifications.join(", ")}</span>}
                      </>
                    )}
                  </div>
                  {f.callsign && <div className="text-[10px] font-mono text-slate-400">{f.callsign}</div>}
                </div>
                <div className="flex items-center gap-1.5">
                  {(selectedBlock || flightCount > 0) && (
                    <span
                      title={
                        isAssigned ? "Assigned" :
                        !isAvailable ? "Unavailable" :
                        undefined
                      }
                    >
                      <Pill
                        tone={!isAvailable ? "slate" : isAssigned ? "slate" : "navy"}
                        className={`text-[9px] ${!isAvailable || isAssigned ? "border-dashed" : ""}`}
                      >
                        {flightCount} flt
                      </Pill>
                    </span>
                  )}
                  {selectedBlock && !isAssigned && isAvailable && (
                    <Pill tone={f.track === "ip" ? "green" : "sky"} className="text-[9px]">{f.track === "ip" ? "PIC" : "CP"}</Pill>
                  )}
                  {selectedBlock && (
                    <button
                      onClick={() => handleToggleAvailability(f.id)}
                      className={`text-[9px] px-1.5 py-0.5 rounded transition ${
                        isAvailable
                          ? "text-red-500 hover:bg-red-50 hover:text-red-600"
                          : "text-sky-600 hover:bg-sky-50 hover:text-sky-700"
                      }`}
                      title={isAvailable ? "Mark unavailable for this block" : "Mark available for this block"}
                    >
                      {isAvailable ? "▽" : "△"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

function sortByPriority(
  a: { flyer: User; isAvailable: boolean; isAssigned: boolean },
  b: { flyer: User; isAvailable: boolean; isAssigned: boolean },
  flightCount: Map<string, number>,
  rankOrder: Map<string, number>,
) {
  const group = (e: typeof a): number => {
    if (e.isAvailable && !e.isAssigned) return 0;
    if (e.isAssigned) return 1;
    return 2;
  };
  const ga = group(a);
  const gb = group(b);
  if (ga !== gb) return ga - gb;

  const fa = flightCount.get(a.flyer.id) ?? 0;
  const fb = flightCount.get(b.flyer.id) ?? 0;
  if (fa !== fb) return fb - fa;

  const ra = rankOrder.get(a.flyer.rank ?? "") ?? 0;
  const rb = rankOrder.get(b.flyer.rank ?? "") ?? 0;
  if (ra !== rb) return rb - ra;

  return a.flyer.name.localeCompare(b.flyer.name);
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
                  {pilot && <span>PIC: {lastName(pilot)}</span>}
                  {coPilot && <span> {pilot ? "+" : "CP:"} {lastName(coPilot)}</span>}
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
  const [newAvailDay, setNewAvailDay] = useState(4);
  const [newAvailStart, setNewAvailStart] = useState("08:00");
  const [newAvailEnd, setNewAvailEnd] = useState("10:00");

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

        function addAvail() {
          if (newAvailStart >= newAvailEnd) return;
          onChange({
            ...state,
            availability: [
              ...state.availability,
              { id: uid("av"), flyerId: f.id, day: newAvailDay, start: newAvailStart, end: newAvailEnd },
            ],
          });
        }

        function deleteAvail(id: string) {
          onChange({ ...state, availability: state.availability.filter((a) => a.id !== id) });
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
                  {lastName(f)}
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
                <Label>Qualifications</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {["2LFE", "TP", "FL", "EL", "1LFE", "TNG", "NON-TNG", "AIF"].map((q) => {
                    const checked = f.qualifications?.includes(q) ?? false;
                    return (
                      <label
                        key={q}
                        className={cn(
                          "px-2 py-1 rounded text-[11px] font-mono cursor-pointer border transition-colors",
                          checked
                            ? "bg-sky-100 text-sky-800 border-sky-300"
                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => {
                            const current = f.qualifications ?? [];
                            const next = checked
                              ? current.filter((x) => x !== q)
                              : [...current, q];
                            updateUser({ qualifications: next.length > 0 ? next : undefined });
                          }}
                        />
                        {q}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Availability</div>
            <div className="space-y-1.5 mb-3">
              {ranges.length === 0 ? (
                <p className="text-[12px] text-slate-400 italic">None declared</p>
              ) : (
                ranges
                  .slice()
                  .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
                  .map((a) => (
                    <div key={a.id} className="flex items-center gap-2 text-[12px] group">
                      <span className="w-8 font-mono text-[10.5px] font-semibold text-slate-500">{DAY_LABELS[a.day]}</span>
                      <span className="font-mono text-navy-900">{a.start} – {a.end}</span>
                      <span className="text-[10.5px] text-slate-400 ml-auto">{duration(a.start, a.end).toFixed(1)}h</span>
                      <button
                        onClick={() => deleteAvail(a.id)}
                        className="text-[10px] text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                      >
                        ✕
                      </button>
                    </div>
                  ))
              )}
            </div>
            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
              <select
                value={newAvailDay}
                onChange={(e) => setNewAvailDay(Number(e.target.value))}
                className="rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-mono text-navy-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              >
                {DAY_LABELS.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
              <Input
                type="time"
                value={newAvailStart}
                onChange={(e) => setNewAvailStart(e.target.value)}
                className="!w-[70px] !text-[10px] !py-1"
              />
              <span className="text-[10px] text-slate-400">–</span>
              <Input
                type="time"
                value={newAvailEnd}
                onChange={(e) => setNewAvailEnd(e.target.value)}
                className="!w-[70px] !text-[10px] !py-1"
              />
              <button
                onClick={addAvail}
                disabled={newAvailStart >= newAvailEnd}
                className="text-[14px] text-sky-600 hover:text-sky-700 disabled:text-slate-300 transition px-1"
              >
                +
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
