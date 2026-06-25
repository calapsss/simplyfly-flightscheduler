export type Role = "flyer" | "admin";

export type User = {
  id: string;
  name: string;
  callsign?: string;
  rank?: string;  // 2LT, 1LT, CPT, MAJ, LTC, COL
  role: Role;
  email: string;
};

/** Admin-defined operating block for a SPECIFIC day. */
export type Block = {
  id: string;
  /** "HH:MM" */
  start: string;
  /** "HH:MM" */
  end: string;
  /** 0 = Sun ... 6 = Sat — which day this block belongs to */
  day: number;
};

export type Aircraft = {
  id: string;
  tailNumber: string;   // e.g., "N172SP"
  type: string;         // e.g., "C172"
  /** Block IDs (specific to a day) this aircraft is available for */
  availableBlockIds: string[];
};

/** A flyer's declared availability for a (day, time range) */
export type Availability = {
  id: string;
  flyerId: string;
  /** 0 = Sun ... 6 = Sat */
  day: number;
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
};

/** A scheduled assignment: pilot + optional co-pilot → aircraft at a specific block */
export type Assignment = {
  id: string;
  pilotId: string;
  coPilotId?: string;
  aircraftId: string;
  blockId: string;
  /** Mission designator (e.g. "NAV 1", "PAT 1") */
  mission?: string;
  /** Area Assignment (e.g. "AA-1", "AA-2") */
  areaAssignment?: string;
};

export type AppState = {
  users: User[];
  blocks: Block[];
  aircraft: Aircraft[];
  availability: Availability[];
  assignments: Assignment[];
};

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Does a time range [start, end) overlap with another [start, end)? */
export function rangesOverlap(aS: string, aE: string, bS: string, bE: string) {
  return aS < bE && bS < aE;
}
