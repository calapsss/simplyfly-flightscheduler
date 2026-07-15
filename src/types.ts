export type Role = "flyer" | "admin";

export type User = {
  id: string;
  name: string;
  callsign?: string;
  rank?: string;  // 2LT, 1LT, CPT, MAJ, LTC, COL
  password?: string;
  isSuperUser?: boolean;
  active?: boolean;
  track?: "student" | "ip";
  qualifications?: string[];
  lesson?: string;   // Due Lesson for students
  dolf?: string;     // Date of Last Flight (YYYY-MM-DD)
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

export type UnavailabilityStatus = "pending" | "approved" | "rejected";

/** A student's request to be unavailable for a time range. */
export type UnavailabilityRequest = {
  id: string;
  flyerId: string;
  /** 0 = Sun ... 6 = Sat */
  day: number;
  start: string;
  end: string;
  reason: string;
  status: UnavailabilityStatus;
  reviewedById?: string;
  reviewNote?: string;
};

/** A scheduled assignment: pilot + optional co-pilot → aircraft at a specific block */
export type Assignment = {
  id: string;
  pilotId?: string;
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
  unavailabilityRequests: UnavailabilityRequest[];
  assignments: Assignment[];
};

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function lastName(user: User): string {
  const parts = user.name.split(" ");
  return parts[parts.length - 1];
}

/** Does a time range [start, end) overlap with another [start, end)? */
export function rangesOverlap(aS: string, aE: string, bS: string, bE: string) {
  return aS < bE && bS < aE;
}

export function hasApprovedUnavailability(
  user: User,
  block: Pick<Block, "day" | "start" | "end">,
  requests: UnavailabilityRequest[],
) {
  return requests.some(
    (request) =>
      request.flyerId === user.id &&
      request.status === "approved" &&
      request.day === block.day &&
      rangesOverlap(request.start, request.end, block.start, block.end)
  );
}

export function isFlyerAvailableForBlock(
  user: User,
  block: Pick<Block, "day" | "start" | "end">,
  availability: Availability[],
  requests: UnavailabilityRequest[] = [],
) {
  if (user.track === "student") {
    return !hasApprovedUnavailability(user, block, requests);
  }

  return availability.some(
    (available) =>
      available.flyerId === user.id &&
      available.day === block.day &&
      rangesOverlap(available.start, available.end, block.start, block.end)
  );
}
