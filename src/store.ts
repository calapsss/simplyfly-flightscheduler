import type { AppState, User } from "./types";

const STORAGE_KEY = "simplyfly:v1";

export const SEED_USERS: User[] = [
  { id: "u-admin", name: "Ops Chief", callsign: "TOWER", role: "admin", email: "admin@simplyfly.aero" },
  { id: "u-1",  name: "Aquino H",     rank: "MAJ", role: "flyer", email: "aquino_h@simplyfly.aero" },
  { id: "u-2",  name: "Aviquivil",    role: "flyer", email: "aviquivil@simplyfly.aero" },
  { id: "u-3",  name: "Batay-an",     rank: "LTC", role: "flyer", email: "batay-an@simplyfly.aero" },
  { id: "u-4",  name: "Bugaling",     role: "flyer", email: "bugaling@simplyfly.aero" },
  { id: "u-5",  name: "Caisip",       role: "flyer", email: "caisip@simplyfly.aero" },
  { id: "u-6",  name: "Calayag",      rank: "MAJ", role: "flyer", email: "calayag@simplyfly.aero" },
  { id: "u-7",  name: "Cayabyab",     rank: "LTC", role: "flyer", email: "cayabyab@simplyfly.aero" },
  { id: "u-8",  name: "Crisologo",    rank: "1LT", role: "flyer", email: "crisologo@simplyfly.aero" },
  { id: "u-9",  name: "Dimaculangan", role: "flyer", email: "dimaculangan@simplyfly.aero" },
  { id: "u-10", name: "Gadot",        rank: "MAJ", role: "flyer", email: "gadot@simplyfly.aero" },
  { id: "u-11", name: "Garcia",       role: "flyer", email: "garcia@simplyfly.aero" },
  { id: "u-12", name: "Gentallan",    role: "flyer", email: "gentallan@simplyfly.aero" },
  { id: "u-13", name: "Loyao",        rank: "1LT", role: "flyer", email: "loyao@simplyfly.aero" },
  { id: "u-14", name: "Magsumbul",    rank: "CPT", role: "flyer", email: "magsumbul@simplyfly.aero" },
  { id: "u-15", name: "Makalintal",   rank: "MAJ", role: "flyer", email: "makalintal@simplyfly.aero" },
  { id: "u-16", name: "Mendoza",      role: "flyer", email: "mendoza@simplyfly.aero" },
  { id: "u-17", name: "Ocampo",       role: "flyer", email: "ocampo@simplyfly.aero" },
  { id: "u-18", name: "Platon",       role: "flyer", email: "platon@simplyfly.aero" },
  { id: "u-19", name: "Pontillas",    rank: "MAJ", role: "flyer", email: "pontillas@simplyfly.aero" },
  { id: "u-20", name: "Recinto",      role: "flyer", email: "recinto@simplyfly.aero" },
  { id: "u-21", name: "Salcedo",      rank: "MAJ", role: "flyer", email: "salcedo@simplyfly.aero" },
  { id: "u-22", name: "Salon",        role: "flyer", email: "salon@simplyfly.aero" },
  { id: "u-23", name: "Sarikin",      rank: "CPT", role: "flyer", email: "sarikin@simplyfly.aero" },
  { id: "u-24", name: "Silverio",     role: "flyer", email: "silverio@simplyfly.aero" },
  { id: "u-25", name: "Taburaza",     role: "flyer", email: "taburaza@simplyfly.aero" },
  { id: "u-26", name: "Torres",       rank: "MAJ", role: "flyer", email: "torres@simplyfly.aero" },
];

function seedBlocksForToday() {
  const today = new Date().getDay();
  return [
    { id: "b-1", day: today, start: "04:59", end: "06:59" },
    { id: "b-2", day: today, start: "07:29", end: "09:29" },
    { id: "b-3", day: today, start: "09:59", end: "11:59" },
    { id: "b-4", day: today, start: "12:29", end: "14:29" },
    { id: "b-5", day: today, start: "14:59", end: "16:59" },
    { id: "b-6", day: today, start: "17:29", end: "19:29" },
  ];
}

const dailyFull = { start: "04:59", end: "19:29" };

const initialState: AppState = {
  users: SEED_USERS,
  blocks: seedBlocksForToday(),
  aircraft: [
    { id: "ac-064", tailNumber: "064", type: "BAT", availableBlockIds: ["b-1", "b-2", "b-3", "b-4", "b-5", "b-6"] },
    { id: "ac-945", tailNumber: "945", type: "LEM", availableBlockIds: ["b-1", "b-2", "b-3", "b-4", "b-5", "b-6"] },
    { id: "ac-009", tailNumber: "009", type: "ROS", availableBlockIds: ["b-1"] },
  ],
  availability: [
    { id: "av-1",  flyerId: "u-1",  day: new Date().getDay(), ...dailyFull },
    { id: "av-2",  flyerId: "u-2",  day: new Date().getDay(), ...dailyFull },
    { id: "av-3",  flyerId: "u-3",  day: new Date().getDay(), ...dailyFull },
    { id: "av-4",  flyerId: "u-4",  day: new Date().getDay(), ...dailyFull },
    { id: "av-5",  flyerId: "u-5",  day: new Date().getDay(), ...dailyFull },
    { id: "av-6",  flyerId: "u-6",  day: new Date().getDay(), ...dailyFull },
    { id: "av-7",  flyerId: "u-7",  day: new Date().getDay(), ...dailyFull },
    { id: "av-8",  flyerId: "u-8",  day: new Date().getDay(), ...dailyFull },
    { id: "av-9",  flyerId: "u-9",  day: new Date().getDay(), ...dailyFull },
    { id: "av-10", flyerId: "u-10", day: new Date().getDay(), ...dailyFull },
    { id: "av-11", flyerId: "u-11", day: new Date().getDay(), ...dailyFull },
    { id: "av-12", flyerId: "u-12", day: new Date().getDay(), ...dailyFull },
    { id: "av-13", flyerId: "u-13", day: new Date().getDay(), ...dailyFull },
    { id: "av-14", flyerId: "u-14", day: new Date().getDay(), ...dailyFull },
    { id: "av-15", flyerId: "u-15", day: new Date().getDay(), ...dailyFull },
    { id: "av-16", flyerId: "u-16", day: new Date().getDay(), ...dailyFull },
    { id: "av-17", flyerId: "u-17", day: new Date().getDay(), ...dailyFull },
    { id: "av-18", flyerId: "u-18", day: new Date().getDay(), ...dailyFull },
    { id: "av-19", flyerId: "u-19", day: new Date().getDay(), ...dailyFull },
    { id: "av-20", flyerId: "u-20", day: new Date().getDay(), ...dailyFull },
    { id: "av-21", flyerId: "u-21", day: new Date().getDay(), ...dailyFull },
    { id: "av-22", flyerId: "u-22", day: new Date().getDay(), ...dailyFull },
    { id: "av-23", flyerId: "u-23", day: new Date().getDay(), ...dailyFull },
    { id: "av-24", flyerId: "u-24", day: new Date().getDay(), ...dailyFull },
    { id: "av-25", flyerId: "u-25", day: new Date().getDay(), ...dailyFull },
    { id: "av-26", flyerId: "u-26", day: new Date().getDay(), ...dailyFull },
  ],
  assignments: [
    { id: "flt-064-1", pilotId: "u-15", coPilotId: "u-11", aircraftId: "ac-064", blockId: "b-1", mission: "FORM 3",   areaAssignment: "BAT" },
    { id: "flt-064-2", pilotId: "u-26", coPilotId: "u-17", aircraftId: "ac-064", blockId: "b-2", mission: "COM CHK",  areaAssignment: "BAT" },
    { id: "flt-064-3", pilotId: "u-23", coPilotId: "u-16", aircraftId: "ac-064", blockId: "b-3", mission: "COM CHK",  areaAssignment: "BAT" },
    { id: "flt-064-4", pilotId: "u-8",  coPilotId: "u-20", aircraftId: "ac-064", blockId: "b-4", mission: "COM CHK",  areaAssignment: "BAT" },
    { id: "flt-064-5", pilotId: "u-19", coPilotId: "u-22", aircraftId: "ac-064", blockId: "b-5", mission: "COM CHK",  areaAssignment: "BAT" },
    { id: "flt-064-6", pilotId: "u-13", coPilotId: "u-12", aircraftId: "ac-064", blockId: "b-6", mission: "COM CHK",  areaAssignment: "BAT" },
    { id: "flt-945-1", pilotId: "u-14", coPilotId: "u-5",  aircraftId: "ac-945", blockId: "b-1", mission: "FORM 3",   areaAssignment: "LEM" },
    { id: "flt-945-2", pilotId: "u-7",  coPilotId: "u-25", aircraftId: "ac-945", blockId: "b-2", mission: "COM 1",    areaAssignment: "LEM" },
    { id: "flt-945-3", pilotId: "u-3",  coPilotId: "u-2",  aircraftId: "ac-945", blockId: "b-3", mission: "COM 1",    areaAssignment: "LEM" },
    { id: "flt-945-4", pilotId: "u-1",  coPilotId: "u-24", aircraftId: "ac-945", blockId: "b-4", mission: "COM CHK",  areaAssignment: "LEM" },
    { id: "flt-945-5", pilotId: "u-10", coPilotId: "u-18", aircraftId: "ac-945", blockId: "b-5", mission: "COM 1",    areaAssignment: "LEM" },
    { id: "flt-945-6", pilotId: "u-6",  coPilotId: "u-9",  aircraftId: "ac-945", blockId: "b-6", mission: "COM 1",    areaAssignment: "LEM" },
    { id: "flt-009-1", pilotId: "u-21", coPilotId: "u-4",  aircraftId: "ac-009", blockId: "b-1", mission: "COM 1",    areaAssignment: "ROS" },
  ],
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
