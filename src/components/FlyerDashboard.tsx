import { useState } from "react";
import type { AppState, Availability, User } from "../types";
import { DAY_FULL, DAY_LABELS, rangesOverlap } from "../types";
import { Card, SectionTitle, Button, Input, Label, Stat, Pill } from "./ui";
import { PlaneIcon } from "./Logo";
import { uid } from "../store";

type Props = {
  state: AppState;
  user: User;
  onChange: (next: AppState) => void;
};

export function FlyerDashboard({ state, user, onChange }: Props) {
  const myAvail = state.availability.filter((a) => a.flyerId === user.id);
  const myAssignments = state.assignments.filter(
    (a) => a.pilotId === user.id || a.coPilotId === user.id
  );

  const [day, setDay] = useState<number>(new Date().getDay());
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("12:00");
  const [error, setError] = useState<string | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (start >= end) {
      setError("End time must be after start time.");
      return;
    }
    // Check overlap with existing range on same day
    const conflict = myAvail.find(
      (a) => a.day === day && rangesOverlap(a.start, a.end, start, end)
    );
    if (conflict) {
      setError("This overlaps with an existing range on this day.");
      return;
    }
    const newAvail: Availability = { id: uid("av"), flyerId: user.id, day, start, end };
    onChange({ ...state, availability: [...state.availability, newAvail] });
    setError(null);
  }

  function remove(id: string) {
    onChange({ ...state, availability: state.availability.filter((a) => a.id !== id) });
  }

  const totalHours = myAvail.reduce((sum, a) => sum + hours(a.start, a.end), 0);
  const upcoming = myAssignments
    .map((a) => {
      const block = state.blocks.find((b) => b.id === a.blockId);
      const ac = state.aircraft.find((x) => x.id === a.aircraftId);
      const role = a.pilotId === user.id ? "Pilot" : "Co-Pilot";
      const otherId = a.pilotId === user.id ? a.coPilotId : a.pilotId;
      const other = otherId ? state.users.find((u) => u.id === otherId) : null;
      return block && ac ? { a, block, ac, role, other } : null;
    })
    .filter((x): x is { a: typeof myAssignments[0]; block: typeof state.blocks[0]; ac: typeof state.aircraft[0]; role: string; other: typeof state.users[0] | null } => !!x)
    .sort((x, y) => x.block.day - y.block.day || x.block.start.localeCompare(y.block.start));

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Time ranges" value={myAvail.length} hint="declared this week" />
        <Stat label="Total hours" value={totalHours.toFixed(1)} hint="available" tone="sky" />
        <Stat label="Scheduled" value={myAssignments.length} hint="sorties assigned" />
        <Stat label="Status" value="Active" hint="ready to fly" />
      </div>

      {/* Add availability */}
      <Card className="p-6">
        <SectionTitle
          title="Declare your availability"
          subtitle="Add a time range on a day you're able to fly. Ops will match you to aircraft within this window."
        />
        <form onSubmit={add} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
          <div>
            <Label>Day</Label>
            <select
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-navy-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            >
              {DAY_LABELS.map((d, i) => (
                <option key={d} value={i}>{DAY_FULL[i]}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>From</Label>
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <Button type="submit" className="h-[42px]">+ Add range</Button>
        </form>
        {error && <p className="text-[12.5px] text-red-600 mt-3">{error}</p>}
      </Card>

      {/* My availability by day */}
      <Card className="p-6">
        <SectionTitle title="My weekly availability" subtitle="Click × to remove a range." />
        {myAvail.length === 0 ? (
          <p className="text-[13px] text-slate-500 py-8 text-center border border-dashed border-slate-200 rounded-xl">
            No availability declared yet. Add a time range above.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {myAvail
              .slice()
              .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
              .map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-sky-200 transition">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-sky-400 to-sky-500 text-white flex flex-col items-center justify-center">
                    <div className="text-[10px] font-semibold uppercase tracking-wider">{DAY_LABELS[a.day]}</div>
                    <div className="text-[10px] opacity-90">{hours(a.start, a.end).toFixed(1)}h</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-navy-900">{DAY_FULL[a.day]}</div>
                    <div className="text-[12px] font-mono text-slate-500">{a.start} – {a.end}</div>
                  </div>
                  <button
                    onClick={() => remove(a.id)}
                    className="w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
          </div>
        )}
      </Card>

      {/* Scheduled sorties */}
      <Card className="p-6">
        <SectionTitle
          title="My scheduled sorties"
          subtitle="Flights Ops has assigned to you."
        />
        {upcoming.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
            <PlaneIcon size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-[13px] text-slate-500">No sorties scheduled yet.</p>
            <p className="text-[12px] text-slate-400 mt-1">You'll see assignments once Ops schedules you.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map(({ a, block, ac, role, other }) => (
              <div key={a.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white">
                <div className="w-14 h-14 rounded-lg bg-navy-900 text-white flex flex-col items-center justify-center">
                  <div className="text-[10px] font-medium text-sky-300 uppercase tracking-wider">{DAY_LABELS[block.day]}</div>
                  <div className="text-[12px] font-mono font-semibold">{block.start}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-navy-900">
                    {DAY_FULL[block.day]} · {block.start}–{block.end}
                  </div>
                  <div className="text-[12.5px] text-slate-500">{ac.type}</div>
                  {a.mission && <div className="text-[11px] font-medium text-sky-600 mt-0.5">MSN: {a.mission}</div>}
                  {other && (
                    <div className="text-[11.5px] text-slate-500 mt-0.5">
                      with {other.rank && <span className="font-semibold text-sky-600">{other.rank} </span>}
                      {other.name}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <Pill tone={role === "Pilot" ? "navy" : "sky"} className="mb-1">{role}</Pill>
                  <div className="text-[12px] font-mono text-slate-500">{ac.tailNumber}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function hours(s: string, e: string) {
  const [sh, sm] = s.split(":").map(Number);
  const [eh, em] = e.split(":").map(Number);
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
}
