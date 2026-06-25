import type { AppState, User } from "./types";

const STORAGE_KEY = "simplyfly:v1";

export const SEED_USERS: User[] = [
  { id: "u-admin", name: "Ops Chief", callsign: "TOWER", role: "admin", email: "admin@simplyfly.aero" },
  { id: "u-1", name: "Alex Rivera", callsign: "FALCON", rank: "CPT", role: "flyer", email: "alex@simplyfly.aero" },
  { id: "u-2", name: "Priya Shah", callsign: "RAPTOR", rank: "MAJ", role: "flyer", email: "priya@simplyfly.aero" },
  { id: "u-3", name: "Marcus Cole", callsign: "HAWK", rank: "1LT", role: "flyer", email: "marcus@simplyfly.aero" },
  { id: "u-4", name: "Elena Volkov", callsign: "STORM", rank: "CPT", role: "flyer", email: "elena@simplyfly.aero" },
  { id: "u-5", name: "Jin Tanaka", callsign: "KITE", rank: "2LT", role: "flyer", email: "jin@simplyfly.aero" },
];

/**
 * Seed blocks for the CURRENT weekday (today).
 * In a real system the admin would create these per day; for the prototype
 * we seed today's operating blocks so the scheduler has something to show.
 */
function seedBlocksForToday() {
  const today = new Date().getDay();
  return [
    { id: "b-1", day: today, start: "06:00", end: "09:00" },
    { id: "b-2", day: today, start: "09:00", end: "12:00" },
    { id: "b-3", day: today, start: "12:00", end: "15:00" },
    { id: "b-4", day: today, start: "15:00", end: "18:00" },
    { id: "b-5", day: today, start: "18:00", end: "21:00" },
  ];
}

const initialState: AppState = {
  users: SEED_USERS,
  blocks: seedBlocksForToday(),
  aircraft: [
    { id: "ac-1", tailNumber: "N172SP", type: "C172 Skyhawk",  availableBlockIds: [] },
    { id: "ac-2", tailNumber: "N44PA",  type: "PA-28 Archer",  availableBlockIds: [] },
    { id: "ac-3", tailNumber: "G-CDMX", type: "DA40 Diamond",  availableBlockIds: [] },
  ],
  availability: [
    // Alex: weekday mornings + evenings (flexible ranges)
    { id: "av-1", flyerId: "u-1", day: 1, start: "08:00", end: "11:00" },
    { id: "av-2", flyerId: "u-1", day: 1, start: "16:00", end: "20:00" },
    { id: "av-3", flyerId: "u-1", day: 3, start: "09:00", end: "17:00" },
    { id: "av-4", flyerId: "u-1", day: 5, start: "14:00", end: "19:00" },
    // Priya: weekends
    { id: "av-5", flyerId: "u-2", day: 0, start: "08:00", end: "12:00" },
    { id: "av-6", flyerId: "u-2", day: 6, start: "10:00", end: "16:00" },
    // Marcus: midweek afternoons
    { id: "av-7", flyerId: "u-3", day: 2, start: "12:00", end: "18:00" },
    { id: "av-8", flyerId: "u-3", day: 4, start: "13:00", end: "17:00" },
    // Elena: morning person
    { id: "av-9",  flyerId: "u-4", day: 1, start: "06:00", end: "10:00" },
    { id: "av-10", flyerId: "u-4", day: 3, start: "06:30", end: "09:30" },
    { id: "av-11", flyerId: "u-4", day: 5, start: "07:00", end: "11:00" },
    // Jin: evenings + weekends
    { id: "av-12", flyerId: "u-5", day: 2, start: "17:00", end: "21:00" },
    { id: "av-13", flyerId: "u-5", day: 4, start: "18:00", end: "21:00" },
    { id: "av-14", flyerId: "u-5", day: 6, start: "14:00", end: "20:00" },
  ],
  assignments: [],
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.users || parsed.users.length === 0) parsed.users = SEED_USERS;
    return parsed;
  } catch {
    return initialState;
  }
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function resetState(): AppState {
  localStorage.removeItem(STORAGE_KEY);
  return initialState;
}

export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
