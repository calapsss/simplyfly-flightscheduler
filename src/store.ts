import type { AppState, User } from "./types";
import { mockData } from "./mockData";

const STORAGE_KEY = "simplyfly:v1";

export const SEED_USERS: User[] = mockData.users;

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
    if (!parsed.users || parsed.users.length !== SEED_USERS.length) return initialState;
    parsed.users = parsed.users.map((u, i) => ({ ...SEED_USERS[i], ...u }));
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
