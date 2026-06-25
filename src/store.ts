import type { AppState, User, Block, Aircraft, Availability, Assignment } from "./types";

const STORAGE_KEY = "simplyfly:v1";

export const SEED_USERS: User[] = [
  { id: "u-admin", name: "Ops Chief", callsign: "TOWER", role: "admin", email: "admin@simplyfly.aero" },
  { id: "u-bayaca", name: "Bayaca", rank: "1LT", track: "ip", role: "flyer", email: "bayaca@simplyfly.aero" },
  { id: "u-beltran", name: "Beltran", rank: "1LT", track: "ip", role: "flyer", email: "beltran@simplyfly.aero" },
  { id: "u-crisologo", name: "Crisologo", rank: "1LT", track: "ip", role: "flyer", email: "crisologo@simplyfly.aero" },
  { id: "u-loyao", name: "Loyao", rank: "1LT", track: "ip", role: "flyer", email: "loyao@simplyfly.aero" },
  { id: "u-magabo", name: "Magabo", rank: "1LT", track: "ip", role: "flyer", email: "magabo@simplyfly.aero" },
  { id: "u-potutan", name: "Potutan", rank: "1LT", track: "ip", role: "flyer", email: "potutan@simplyfly.aero" },
  { id: "u-rabi", name: "Rabi", rank: "1LT", track: "ip", role: "flyer", email: "rabi@simplyfly.aero" },
  { id: "u-rafal", name: "Rafal", rank: "1LT", track: "ip", role: "flyer", email: "rafal@simplyfly.aero" },
  { id: "u-sayod", name: "Sayod", rank: "1LT", track: "ip", role: "flyer", email: "sayod@simplyfly.aero" },
  { id: "u-sercado", name: "Sercado", rank: "1LT", track: "ip", role: "flyer", email: "sercado@simplyfly.aero" },
  { id: "u-vergara", name: "Vergara", rank: "1LT", track: "ip", role: "flyer", email: "vergara@simplyfly.aero" },
  { id: "u-asi", name: "Asi", rank: "CPT", track: "ip", role: "flyer", email: "asi@simplyfly.aero" },
  { id: "u-baccay", name: "Baccay", rank: "CPT", track: "ip", role: "flyer", email: "baccay@simplyfly.aero" },
  { id: "u-braza", name: "Braza", rank: "CPT", track: "ip", role: "flyer", email: "braza@simplyfly.aero" },
  { id: "u-cruz", name: "Cruz", rank: "CPT", track: "ip", role: "flyer", email: "cruz@simplyfly.aero" },
  { id: "u-destajo", name: "Destajo", rank: "CPT", track: "ip", role: "flyer", email: "destajo@simplyfly.aero" },
  { id: "u-estoesta", name: "Estoesta", rank: "CPT", track: "ip", role: "flyer", email: "estoesta@simplyfly.aero" },
  { id: "u-iglesia", name: "Iglesia", rank: "CPT", track: "ip", role: "flyer", email: "iglesia@simplyfly.aero" },
  { id: "u-magsumbol", name: "Magsumbol", rank: "CPT", track: "ip", role: "flyer", email: "magsumbol@simplyfly.aero" },
  { id: "u-orio", name: "Orio", rank: "CPT", track: "ip", role: "flyer", email: "orio@simplyfly.aero" },
  { id: "u-sarikin", name: "Sarikin", rank: "CPT", track: "ip", role: "flyer", email: "sarikin@simplyfly.aero" },
  { id: "u-batay-an", name: "Batay-An", rank: "LTC", track: "ip", role: "flyer", email: "batay-an@simplyfly.aero" },
  { id: "u-bechayda", name: "Bechayda", rank: "LTC", track: "ip", role: "flyer", email: "bechayda@simplyfly.aero" },
  { id: "u-cayabyab", name: "Cayabyab", rank: "LTC", track: "ip", role: "flyer", email: "cayabyab@simplyfly.aero" },
  { id: "u-acar", name: "Acar", rank: "MAJ", track: "ip", role: "flyer", email: "acar@simplyfly.aero" },
  { id: "u-acojedo", name: "Acojedo", rank: "MAJ", track: "ip", role: "flyer", email: "acojedo@simplyfly.aero" },
  { id: "u-aquino-h", name: "Aquino H", rank: "MAJ", track: "ip", role: "flyer", email: "aquino-h@simplyfly.aero" },
  { id: "u-aquino-ks", name: "Aquino KS", rank: "MAJ", track: "ip", role: "flyer", email: "aquino-ks@simplyfly.aero" },
  { id: "u-asistores", name: "Asistores", rank: "MAJ", track: "ip", role: "flyer", email: "asistores@simplyfly.aero" },
  { id: "u-calayag", name: "Calayag", rank: "MAJ", track: "ip", role: "flyer", email: "calayag@simplyfly.aero" },
  { id: "u-dahino", name: "Dahino", rank: "MAJ", track: "ip", role: "flyer", email: "dahino@simplyfly.aero" },
  { id: "u-dayag", name: "Dayag", rank: "MAJ", track: "ip", role: "flyer", email: "dayag@simplyfly.aero" },
  { id: "u-estillero", name: "Estillero", rank: "MAJ", track: "ip", role: "flyer", email: "estillero@simplyfly.aero" },
  { id: "u-faurillo", name: "Faurillo", rank: "MAJ", track: "ip", role: "flyer", email: "faurillo@simplyfly.aero" },
  { id: "u-gadot", name: "Gadot", rank: "MAJ", track: "ip", role: "flyer", email: "gadot@simplyfly.aero" },
  { id: "u-macatangay", name: "Macatangay", rank: "MAJ", track: "ip", role: "flyer", email: "macatangay@simplyfly.aero" },
  { id: "u-makalintal", name: "Makalintal", rank: "MAJ", track: "ip", role: "flyer", email: "makalintal@simplyfly.aero" },
  { id: "u-mauhay", name: "Mauhay", rank: "MAJ", track: "ip", role: "flyer", email: "mauhay@simplyfly.aero" },
  { id: "u-monis", name: "Monis", rank: "MAJ", track: "ip", role: "flyer", email: "monis@simplyfly.aero" },
  { id: "u-montepio", name: "Montepio", rank: "MAJ", track: "ip", role: "flyer", email: "montepio@simplyfly.aero" },
  { id: "u-olan", name: "Olan", rank: "MAJ", track: "ip", role: "flyer", email: "olan@simplyfly.aero" },
  { id: "u-pontillas", name: "Pontillas", rank: "MAJ", track: "ip", role: "flyer", email: "pontillas@simplyfly.aero" },
  { id: "u-salcedo", name: "Salcedo", rank: "MAJ", track: "ip", role: "flyer", email: "salcedo@simplyfly.aero" },
  { id: "u-ticman-mm", name: "Ticman Mm", rank: "MAJ", track: "ip", role: "flyer", email: "ticman-mm@simplyfly.aero" },
  { id: "u-torres", name: "Torres", rank: "MAJ", track: "ip", role: "flyer", email: "torres@simplyfly.aero" },
  { id: "u-aganon", name: "Aganon", track: "student", role: "flyer", email: "aganon@simplyfly.aero" },
  { id: "u-albay", name: "Albay", track: "student", role: "flyer", email: "albay@simplyfly.aero" },
  { id: "u-austria", name: "Austria", track: "student", role: "flyer", email: "austria@simplyfly.aero" },
  { id: "u-aviquivil", name: "Aviquivil", track: "student", role: "flyer", email: "aviquivil@simplyfly.aero" },
  { id: "u-barro", name: "Barro", track: "student", role: "flyer", email: "barro@simplyfly.aero" },
  { id: "u-bersola", name: "Bersola", track: "student", role: "flyer", email: "bersola@simplyfly.aero" },
  { id: "u-bugaling", name: "Bugaling", track: "student", role: "flyer", email: "bugaling@simplyfly.aero" },
  { id: "u-caisip", name: "Caisip", track: "student", role: "flyer", email: "caisip@simplyfly.aero" },
  { id: "u-calumba", name: "Calumba", track: "student", role: "flyer", email: "calumba@simplyfly.aero" },
  { id: "u-cendreda", name: "Cendreda", track: "student", role: "flyer", email: "cendreda@simplyfly.aero" },
  { id: "u-dimaculangan", name: "Dimaculangan", track: "student", role: "flyer", email: "dimaculangan@simplyfly.aero" },
  { id: "u-garcia", name: "Garcia", track: "student", role: "flyer", email: "garcia@simplyfly.aero" },
  { id: "u-gentallan", name: "Gentallan", track: "student", role: "flyer", email: "gentallan@simplyfly.aero" },
  { id: "u-gonzales", name: "Gonzales", track: "student", role: "flyer", email: "gonzales@simplyfly.aero" },
  { id: "u-mendoza", name: "Mendoza", track: "student", role: "flyer", email: "mendoza@simplyfly.aero" },
  { id: "u-ocampo", name: "Ocampo", track: "student", role: "flyer", email: "ocampo@simplyfly.aero" },
  { id: "u-platon", name: "Platon", track: "student", role: "flyer", email: "platon@simplyfly.aero" },
  { id: "u-poblete", name: "Poblete", track: "student", role: "flyer", email: "poblete@simplyfly.aero" },
  { id: "u-quimson", name: "Quimson", track: "student", role: "flyer", email: "quimson@simplyfly.aero" },
  { id: "u-real", name: "Real", track: "student", role: "flyer", email: "real@simplyfly.aero" },
  { id: "u-recinto", name: "Recinto", track: "student", role: "flyer", email: "recinto@simplyfly.aero" },
  { id: "u-reyeg", name: "Reyeg", track: "student", role: "flyer", email: "reyeg@simplyfly.aero" },
  { id: "u-rocafort", name: "Rocafort", track: "student", role: "flyer", email: "rocafort@simplyfly.aero" },
  { id: "u-romero", name: "Romero", track: "student", role: "flyer", email: "romero@simplyfly.aero" },
  { id: "u-salon", name: "Salon", track: "student", role: "flyer", email: "salon@simplyfly.aero" },
  { id: "u-santos", name: "Santos", track: "student", role: "flyer", email: "santos@simplyfly.aero" },
  { id: "u-sayson", name: "Sayson", track: "student", role: "flyer", email: "sayson@simplyfly.aero" },
  { id: "u-silverio", name: "Silverio", track: "student", role: "flyer", email: "silverio@simplyfly.aero" },
  { id: "u-taburaza", name: "Taburaza", track: "student", role: "flyer", email: "taburaza@simplyfly.aero" },
  { id: "u-vestal", name: "Vestal", track: "student", role: "flyer", email: "vestal@simplyfly.aero" },
];

const blocks: Block[] = [
  { id: "b-1", day: 4, start: "04:58", end: "06:28" },
  { id: "b-2", day: 4, start: "06:58", end: "08:28" },
  { id: "b-3", day: 4, start: "08:58", end: "10:58" },
  { id: "b-4", day: 4, start: "11:28", end: "13:28" },
  { id: "b-5", day: 4, start: "13:58", end: "15:28" },
  { id: "b-6", day: 4, start: "15:58", end: "17:55" },
];

const aircraft: Aircraft[] = [
  { id: "ac-959", tailNumber: "959", type: "T-41", availableBlockIds: ["b-1", "b-2", "b-3", "b-4", "b-5", "b-6"] },
  { id: "ac-034", tailNumber: "034", type: "T-41", availableBlockIds: ["b-1", "b-2", "b-3", "b-4", "b-5", "b-6"] },
  { id: "ac-037", tailNumber: "037", type: "T-41", availableBlockIds: ["b-1", "b-2", "b-3", "b-4", "b-5", "b-6"] },
  { id: "ac-038", tailNumber: "038", type: "T-41", availableBlockIds: ["b-1", "b-2", "b-3", "b-4", "b-5", "b-6"] },
  { id: "ac-046", tailNumber: "046", type: "T-41", availableBlockIds: ["b-1", "b-2", "b-3", "b-4", "b-5", "b-6"] },
];

const availability: Availability[] = [
  { id: "av-u-orio-5", flyerId: "u-orio", day: 4, start: "13:58", end: "15:28" },
  { id: "av-u-calayag-3", flyerId: "u-calayag", day: 4, start: "08:58", end: "10:58" },
  { id: "av-u-calayag-4", flyerId: "u-calayag", day: 4, start: "11:28", end: "13:28" },
  { id: "av-u-calayag-5", flyerId: "u-calayag", day: 4, start: "13:58", end: "15:28" },
  { id: "av-u-calayag-6", flyerId: "u-calayag", day: 4, start: "15:58", end: "17:55" },
  { id: "av-u-montepio-3", flyerId: "u-montepio", day: 4, start: "08:58", end: "10:58" },
  { id: "av-u-crisologo-1", flyerId: "u-crisologo", day: 4, start: "04:58", end: "06:28" },
  { id: "av-u-crisologo-2", flyerId: "u-crisologo", day: 4, start: "06:58", end: "08:28" },
  { id: "av-u-crisologo-3", flyerId: "u-crisologo", day: 4, start: "08:58", end: "10:58" },
  { id: "av-u-crisologo-4", flyerId: "u-crisologo", day: 4, start: "11:28", end: "13:28" },
  { id: "av-u-crisologo-5", flyerId: "u-crisologo", day: 4, start: "13:58", end: "15:28" },
  { id: "av-u-crisologo-6", flyerId: "u-crisologo", day: 4, start: "15:58", end: "17:55" },
  { id: "av-u-magsumbol-2", flyerId: "u-magsumbol", day: 4, start: "06:58", end: "08:28" },
  { id: "av-u-sarikin-2", flyerId: "u-sarikin", day: 4, start: "06:58", end: "08:28" },
  { id: "av-u-sarikin-3", flyerId: "u-sarikin", day: 4, start: "08:58", end: "10:58" },
  { id: "av-u-makalintal-1", flyerId: "u-makalintal", day: 4, start: "04:58", end: "06:28" },
  { id: "av-u-makalintal-4", flyerId: "u-makalintal", day: 4, start: "11:28", end: "13:28" },
  { id: "av-u-pontillas-5", flyerId: "u-pontillas", day: 4, start: "13:58", end: "15:28" },
  { id: "av-u-torres-2", flyerId: "u-torres", day: 4, start: "06:58", end: "08:28" },
  { id: "av-u-dayag-1", flyerId: "u-dayag", day: 4, start: "04:58", end: "06:28" },
  { id: "av-u-vergara-3", flyerId: "u-vergara", day: 4, start: "08:58", end: "10:58" },
  { id: "av-u-vergara-5", flyerId: "u-vergara", day: 4, start: "13:58", end: "15:28" },
  { id: "av-u-mauhay-3", flyerId: "u-mauhay", day: 4, start: "08:58", end: "10:58" },
  { id: "av-u-mauhay-4", flyerId: "u-mauhay", day: 4, start: "11:28", end: "13:28" },
  { id: "av-u-mauhay-6", flyerId: "u-mauhay", day: 4, start: "15:58", end: "17:55" },
  { id: "av-u-faurillo-6", flyerId: "u-faurillo", day: 4, start: "15:58", end: "17:55" },
  { id: "av-u-potutan-1", flyerId: "u-potutan", day: 4, start: "04:58", end: "06:28" },
  { id: "av-u-potutan-2", flyerId: "u-potutan", day: 4, start: "06:58", end: "08:28" },
  { id: "av-u-potutan-4", flyerId: "u-potutan", day: 4, start: "11:28", end: "13:28" },
  { id: "av-u-asistores-1", flyerId: "u-asistores", day: 4, start: "04:58", end: "06:28" },
  { id: "av-u-asistores-2", flyerId: "u-asistores", day: 4, start: "06:58", end: "08:28" },
  { id: "av-u-gadot-4", flyerId: "u-gadot", day: 4, start: "11:28", end: "13:28" },
  { id: "av-u-gadot-5", flyerId: "u-gadot", day: 4, start: "13:58", end: "15:28" },
  { id: "av-u-batay-an-3", flyerId: "u-batay-an", day: 4, start: "08:58", end: "10:58" },
  { id: "av-u-cayabyab-2", flyerId: "u-cayabyab", day: 4, start: "06:58", end: "08:28" },
  { id: "av-u-barro-b-1", flyerId: "u-barro", day: 4, start: "04:58", end: "06:28" },
  { id: "av-u-platon-b-2", flyerId: "u-platon", day: 4, start: "06:58", end: "08:28" },
  { id: "av-u-aganon-b-3", flyerId: "u-aganon", day: 4, start: "08:58", end: "10:58" },
  { id: "av-u-santos-b-4", flyerId: "u-santos", day: 4, start: "11:28", end: "13:28" },
  { id: "av-u-garcia-b-5", flyerId: "u-garcia", day: 4, start: "13:58", end: "15:28" },
  { id: "av-u-gonzales-b-6", flyerId: "u-gonzales", day: 4, start: "15:58", end: "17:55" },
  { id: "av-u-calumba-b-1", flyerId: "u-calumba", day: 4, start: "04:58", end: "06:28" },
  { id: "av-u-bersola-b-2", flyerId: "u-bersola", day: 4, start: "06:58", end: "08:28" },
  { id: "av-u-romero-b-3", flyerId: "u-romero", day: 4, start: "08:58", end: "10:58" },
  { id: "av-u-reyeg-b-4", flyerId: "u-reyeg", day: 4, start: "11:28", end: "13:28" },
  { id: "av-u-caisip-b-5", flyerId: "u-caisip", day: 4, start: "13:58", end: "15:28" },
  { id: "av-u-real-b-6", flyerId: "u-real", day: 4, start: "15:58", end: "17:55" },
  { id: "av-u-quimson-b-1", flyerId: "u-quimson", day: 4, start: "04:58", end: "06:28" },
  { id: "av-u-bugaling-b-2", flyerId: "u-bugaling", day: 4, start: "06:58", end: "08:28" },
  { id: "av-u-aviquivil-b-3", flyerId: "u-aviquivil", day: 4, start: "08:58", end: "10:58" },
  { id: "av-u-recinto-b-4", flyerId: "u-recinto", day: 4, start: "11:28", end: "13:28" },
  { id: "av-u-rocafort-b-5", flyerId: "u-rocafort", day: 4, start: "13:58", end: "15:28" },
  { id: "av-u-mendoza-b-6", flyerId: "u-mendoza", day: 4, start: "15:58", end: "17:55" },
  { id: "av-u-austria-b-1", flyerId: "u-austria", day: 4, start: "04:58", end: "06:28" },
  { id: "av-u-taburaza-b-2", flyerId: "u-taburaza", day: 4, start: "06:58", end: "08:28" },
  { id: "av-u-cendreda-b-3", flyerId: "u-cendreda", day: 4, start: "08:58", end: "10:58" },
  { id: "av-u-salon-b-4", flyerId: "u-salon", day: 4, start: "11:28", end: "13:28" },
  { id: "av-u-sayson-b-5", flyerId: "u-sayson", day: 4, start: "13:58", end: "15:28" },
  { id: "av-u-vestal-b-6", flyerId: "u-vestal", day: 4, start: "15:58", end: "17:55" },
  { id: "av-u-dimaculangan-b-1", flyerId: "u-dimaculangan", day: 4, start: "04:58", end: "06:28" },
  { id: "av-u-gentallan-b-2", flyerId: "u-gentallan", day: 4, start: "06:58", end: "08:28" },
  { id: "av-u-albay-b-3", flyerId: "u-albay", day: 4, start: "08:58", end: "10:58" },
  { id: "av-u-ocampo-b-4", flyerId: "u-ocampo", day: 4, start: "11:28", end: "13:28" },
  { id: "av-u-poblete-b-5", flyerId: "u-poblete", day: 4, start: "13:58", end: "15:28" },
  { id: "av-u-silverio-b-6", flyerId: "u-silverio", day: 4, start: "15:58", end: "17:55" },
];

const assignments: Assignment[] = [
  { id: "flt-959-1", pilotId: "u-barro", aircraftId: "ac-959", blockId: "b-1", mission: "FORM 2" },
  { id: "flt-959-2", pilotId: "u-platon", aircraftId: "ac-959", blockId: "b-2", mission: "FORM 1" },
  { id: "flt-959-3", pilotId: "u-aganon", aircraftId: "ac-959", blockId: "b-3", mission: "FORM 2" },
  { id: "flt-959-4", pilotId: "u-makalintal", coPilotId: "u-santos", aircraftId: "ac-959", blockId: "b-4", mission: "FORM 2" },
  { id: "flt-959-5", pilotId: "u-pontillas", coPilotId: "u-garcia", aircraftId: "ac-959", blockId: "b-5", mission: "FORM 3" },
  { id: "flt-959-6", pilotId: "u-gonzales", aircraftId: "ac-959", blockId: "b-6", mission: "FORM 1" },
  { id: "flt-034-1", pilotId: "u-potutan", coPilotId: "u-calumba", aircraftId: "ac-034", blockId: "b-1", mission: "FORM 2" },
  { id: "flt-034-2", pilotId: "u-cayabyab", coPilotId: "u-bersola", aircraftId: "ac-034", blockId: "b-2", mission: "FORM 1" },
  { id: "flt-034-3", pilotId: "u-calayag", coPilotId: "u-romero", aircraftId: "ac-034", blockId: "b-3", mission: "FORM 2" },
  { id: "flt-034-4", pilotId: "u-gadot", coPilotId: "u-reyeg", aircraftId: "ac-034", blockId: "b-4", mission: "FORM 2" },
  { id: "flt-034-5", pilotId: "u-gadot", coPilotId: "u-caisip", aircraftId: "ac-034", blockId: "b-5", mission: "FORM 3" },
  { id: "flt-034-6", pilotId: "u-faurillo", coPilotId: "u-real", aircraftId: "ac-034", blockId: "b-6", mission: "FORM 2" },
  { id: "flt-037-1", pilotId: "u-makalintal", coPilotId: "u-quimson", aircraftId: "ac-037", blockId: "b-1", mission: "FORM 1" },
  { id: "flt-037-2", pilotId: "u-bugaling", aircraftId: "ac-037", blockId: "b-2", mission: "COM 1" },
  { id: "flt-037-3", pilotId: "u-batay-an", coPilotId: "u-aviquivil", aircraftId: "ac-037", blockId: "b-3", mission: "COM 1" },
  { id: "flt-037-4", pilotId: "u-recinto", aircraftId: "ac-037", blockId: "b-4", mission: "COM CHK" },
  { id: "flt-037-5", pilotId: "u-rocafort", aircraftId: "ac-037", blockId: "b-5", mission: "FORM 2" },
  { id: "flt-037-6", pilotId: "u-mendoza", aircraftId: "ac-037", blockId: "b-6", mission: "COM CHECK" },
  { id: "flt-038-1", pilotId: "u-dayag", coPilotId: "u-austria", aircraftId: "ac-038", blockId: "b-1", mission: "FORM 1" },
  { id: "flt-038-2", pilotId: "u-sarikin", coPilotId: "u-taburaza", aircraftId: "ac-038", blockId: "b-2", mission: "COM 1" },
  { id: "flt-038-3", pilotId: "u-sarikin", coPilotId: "u-cendreda", aircraftId: "ac-038", blockId: "b-3", mission: "COM 1" },
  { id: "flt-038-4", pilotId: "u-crisologo", coPilotId: "u-salon", aircraftId: "ac-038", blockId: "b-4", mission: "COM CHK" },
  { id: "flt-038-5", pilotId: "u-sayson", aircraftId: "ac-038", blockId: "b-5", mission: "FORM 1" },
  { id: "flt-038-6", pilotId: "u-mauhay", coPilotId: "u-vestal", aircraftId: "ac-038", blockId: "b-6", mission: "COM 1" },
  { id: "flt-046-1", pilotId: "u-asistores", coPilotId: "u-dimaculangan", aircraftId: "ac-046", blockId: "b-1", mission: "COM 1" },
  { id: "flt-046-2", pilotId: "u-torres", coPilotId: "u-gentallan", aircraftId: "ac-046", blockId: "b-2", mission: "COM CHK" },
  { id: "flt-046-3", pilotId: "u-vergara", coPilotId: "u-albay", aircraftId: "ac-046", blockId: "b-3", mission: "COM 1" },
  { id: "flt-046-4", pilotId: "u-ocampo", aircraftId: "ac-046", blockId: "b-4", mission: "COM CHK" },
  { id: "flt-046-5", pilotId: "u-orio", coPilotId: "u-poblete", aircraftId: "ac-046", blockId: "b-5", mission: "COM 1" },
  { id: "flt-046-6", pilotId: "u-silverio", aircraftId: "ac-046", blockId: "b-6", mission: "COM CHK" },
];

const initialState: AppState = {
  users: SEED_USERS,
  blocks,
  aircraft,
  availability,
  assignments,
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
