from __future__ import annotations

import json
import os
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field


ROOT_DIR = Path(__file__).resolve().parents[1]
LOCAL_DB_PATH = ROOT_DIR / "data" / "simplyfly.sqlite"
SEED_PATH = Path(os.environ.get("SIMPLYFLY_SEED_PATH", ROOT_DIR / "backend" / "seed.json"))
DIST_DIR = ROOT_DIR / "dist"

write_lock = threading.RLock()


class User(BaseModel):
    id: str
    name: str
    callsign: str | None = None
    rank: str | None = None
    password: str | None = None
    track: Literal["student", "ip"] | None = None
    qualifications: list[str] = Field(default_factory=list)
    lesson: str | None = None
    dolf: str | None = None
    role: Literal["flyer", "admin"]
    email: str


class Block(BaseModel):
    id: str
    start: str
    end: str
    day: int


class Aircraft(BaseModel):
    id: str
    tailNumber: str
    type: str
    availableBlockIds: list[str] = Field(default_factory=list)


class Availability(BaseModel):
    id: str
    flyerId: str
    day: int
    start: str
    end: str


class Assignment(BaseModel):
    id: str
    pilotId: str | None = None
    coPilotId: str | None = None
    aircraftId: str
    blockId: str
    mission: str | None = None
    areaAssignment: str | None = None


class AppState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    users: list[User]
    blocks: list[Block]
    aircraft: list[Aircraft]
    availability: list[Availability]
    assignments: list[Assignment]


def database_path() -> Path:
    configured = os.environ.get("SIMPLYFLY_DB_PATH")
    if configured:
        return Path(configured).expanduser()
    return LOCAL_DB_PATH


@contextmanager
def connect() -> sqlite3.Connection:
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 5000")
    conn.execute("PRAGMA journal_mode = WAL")
    try:
        yield conn
    finally:
        conn.close()


def create_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          callsign TEXT,
          rank TEXT,
          password TEXT,
          track TEXT CHECK (track IN ('student', 'ip') OR track IS NULL),
          qualifications_json TEXT NOT NULL DEFAULT '[]',
          lesson TEXT,
          dolf TEXT,
          role TEXT NOT NULL CHECK (role IN ('flyer', 'admin')),
          email TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS blocks (
          id TEXT PRIMARY KEY,
          start TEXT NOT NULL,
          end TEXT NOT NULL,
          day INTEGER NOT NULL CHECK (day BETWEEN 0 AND 6)
        );

        CREATE TABLE IF NOT EXISTS aircraft (
          id TEXT PRIMARY KEY,
          tail_number TEXT NOT NULL,
          type TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS aircraft_available_blocks (
          aircraft_id TEXT NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
          block_id TEXT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
          PRIMARY KEY (aircraft_id, block_id)
        );

        CREATE TABLE IF NOT EXISTS availability (
          id TEXT PRIMARY KEY,
          flyer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          day INTEGER NOT NULL CHECK (day BETWEEN 0 AND 6),
          start TEXT NOT NULL,
          end TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS assignments (
          id TEXT PRIMARY KEY,
          pilot_id TEXT REFERENCES users(id) ON DELETE SET NULL,
          co_pilot_id TEXT REFERENCES users(id) ON DELETE SET NULL,
          aircraft_id TEXT NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
          block_id TEXT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
          mission TEXT,
          area_assignment TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_availability_flyer ON availability(flyer_id);
        CREATE INDEX IF NOT EXISTS idx_assignments_aircraft_block ON assignments(aircraft_id, block_id);
        CREATE INDEX IF NOT EXISTS idx_assignments_block ON assignments(block_id);

        INSERT OR IGNORE INTO schema_migrations (version) VALUES (1);
        """
    )


def load_seed_state() -> AppState:
    try:
        return AppState.model_validate_json(SEED_PATH.read_text())
    except FileNotFoundError as exc:
        raise RuntimeError(f"Seed file not found: {SEED_PATH}") from exc


def state_exists(conn: sqlite3.Connection) -> bool:
    row = conn.execute("SELECT COUNT(*) AS count FROM users").fetchone()
    return bool(row and row["count"])


def replace_state(conn: sqlite3.Connection, state: AppState) -> None:
    conn.execute("BEGIN IMMEDIATE")
    try:
        conn.executescript(
            """
            DELETE FROM aircraft_available_blocks;
            DELETE FROM assignments;
            DELETE FROM availability;
            DELETE FROM aircraft;
            DELETE FROM blocks;
            DELETE FROM users;
            """
        )

        conn.executemany(
            """
            INSERT INTO users (
              id, name, callsign, rank, password, track, qualifications_json,
              lesson, dolf, role, email
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    user.id,
                    user.name,
                    user.callsign,
                    user.rank,
                    user.password,
                    user.track,
                    json.dumps(user.qualifications),
                    user.lesson,
                    user.dolf,
                    user.role,
                    user.email,
                )
                for user in state.users
            ],
        )
        conn.executemany(
            "INSERT INTO blocks (id, start, end, day) VALUES (?, ?, ?, ?)",
            [(block.id, block.start, block.end, block.day) for block in state.blocks],
        )
        conn.executemany(
            "INSERT INTO aircraft (id, tail_number, type) VALUES (?, ?, ?)",
            [(aircraft.id, aircraft.tailNumber, aircraft.type) for aircraft in state.aircraft],
        )
        conn.executemany(
            "INSERT INTO aircraft_available_blocks (aircraft_id, block_id) VALUES (?, ?)",
            [
                (aircraft.id, block_id)
                for aircraft in state.aircraft
                for block_id in aircraft.availableBlockIds
            ],
        )
        conn.executemany(
            "INSERT INTO availability (id, flyer_id, day, start, end) VALUES (?, ?, ?, ?, ?)",
            [
                (item.id, item.flyerId, item.day, item.start, item.end)
                for item in state.availability
            ],
        )
        conn.executemany(
            """
            INSERT INTO assignments (
              id, pilot_id, co_pilot_id, aircraft_id, block_id, mission, area_assignment
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    item.id,
                    item.pilotId,
                    item.coPilotId,
                    item.aircraftId,
                    item.blockId,
                    item.mission,
                    item.areaAssignment,
                )
                for item in state.assignments
            ],
        )
    except Exception:
        conn.rollback()
        raise
    else:
        conn.commit()


def read_state(conn: sqlite3.Connection) -> AppState:
    users = [
        User(
            id=row["id"],
            name=row["name"],
            callsign=row["callsign"],
            rank=row["rank"],
            password=row["password"],
            track=row["track"],
            qualifications=json.loads(row["qualifications_json"]),
            lesson=row["lesson"],
            dolf=row["dolf"],
            role=row["role"],
            email=row["email"],
        )
        for row in conn.execute("SELECT * FROM users ORDER BY rowid")
    ]
    blocks = [
        Block(id=row["id"], start=row["start"], end=row["end"], day=row["day"])
        for row in conn.execute("SELECT * FROM blocks ORDER BY day, start, rowid")
    ]
    availability = [
        Availability(
            id=row["id"],
            flyerId=row["flyer_id"],
            day=row["day"],
            start=row["start"],
            end=row["end"],
        )
        for row in conn.execute("SELECT * FROM availability ORDER BY day, start, rowid")
    ]
    assignments = [
        Assignment(
            id=row["id"],
            pilotId=row["pilot_id"],
            coPilotId=row["co_pilot_id"],
            aircraftId=row["aircraft_id"],
            blockId=row["block_id"],
            mission=row["mission"],
            areaAssignment=row["area_assignment"],
        )
        for row in conn.execute("SELECT * FROM assignments ORDER BY rowid")
    ]

    block_ids_by_aircraft: dict[str, list[str]] = {}
    for row in conn.execute(
        "SELECT aircraft_id, block_id FROM aircraft_available_blocks ORDER BY rowid"
    ):
        block_ids_by_aircraft.setdefault(row["aircraft_id"], []).append(row["block_id"])

    aircraft = [
        Aircraft(
            id=row["id"],
            tailNumber=row["tail_number"],
            type=row["type"],
            availableBlockIds=block_ids_by_aircraft.get(row["id"], []),
        )
        for row in conn.execute("SELECT * FROM aircraft ORDER BY rowid")
    ]

    return AppState(
        users=users,
        blocks=blocks,
        aircraft=aircraft,
        availability=availability,
        assignments=assignments,
    )


def initialize_database() -> None:
    with write_lock:
        with connect() as conn:
            create_schema(conn)
            if not state_exists(conn):
                replace_state(conn, load_seed_state())


app = FastAPI(title="SimplyFly Flight Scheduler")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    initialize_database()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/state", response_model=AppState)
def get_state() -> AppState:
    with connect() as conn:
        create_schema(conn)
        return read_state(conn)


@app.put("/api/state", response_model=AppState)
def put_state(state: AppState) -> AppState:
    try:
        with write_lock:
            with connect() as conn:
                create_schema(conn)
                replace_state(conn, state)
                return read_state(conn)
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/reset", response_model=AppState)
def reset_state() -> AppState:
    try:
        with write_lock:
            with connect() as conn:
                create_schema(conn)
                replace_state(conn, load_seed_state())
                return read_state(conn)
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


if (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str) -> FileResponse:
    index_path = DIST_DIR / "index.html"
    target_path = (DIST_DIR / full_path).resolve()
    if target_path.is_file() and DIST_DIR.resolve() in target_path.parents:
        return FileResponse(target_path)
    if index_path.exists():
        return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="Frontend build not found. Run npm run build.")
