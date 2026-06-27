import type { AppState, User, Block, Aircraft, Availability, Assignment } from "./types";

const STORAGE_KEY = "simplyfly:v1";

export const SEED_USERS: User[] = mockData.users;

const blocks: Block[] = mockData.blocks;

const aircraft: Aircraft[] = mockData.aircraft;

function allDayAvail(flyerId: string): Availability[] {
  return [0,1,2,3,4,5,6].map((day) => ({
    id: `av-${flyerId}-all-${day}`, flyerId, day, start: "00:00", end: "23:59",
  }));
}

const STUDENT_IDS = [
  "u-aganon","u-albay","u-austria","u-aviquivil","u-barro",
  "u-bersola","u-bugaling","u-caisip","u-calumba","u-cendreda",
  "u-dimaculangan","u-garcia","u-gentallan","u-gonzales","u-mendoza",
  "u-ocampo","u-platon","u-poblete","u-quimson","u-real",
  "u-recinto","u-reyeg","u-rocafort","u-romero","u-salon",
  "u-santos","u-sayson","u-silverio","u-taburaza","u-vestal",
];

const availability: Availability[] = mockData.availability;

const assignments: Assignment[] = mockData.assignments;

const initialState: AppState = {
  users: mockData.users,
  blocks: mockData.blocks,
  aircraft: mockData.aircraft,
  availability: mockData.availability,
  assignments: mockData.assignments,
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
