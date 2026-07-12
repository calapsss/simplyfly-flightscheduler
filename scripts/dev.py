from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def start(command: list[str]) -> subprocess.Popen[bytes]:
    env = os.environ.copy()
    env["PYTHONPATH"] = str(ROOT)
    return subprocess.Popen(command, cwd=ROOT, env=env)


def main() -> int:
    processes = [
        start(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "backend.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                "8000",
                "--reload",
            ]
        ),
        start(["npm", "run", "vite", "--", "--host", "127.0.0.1", "--port", "5173"]),
    ]

    def stop(_signum: int | None = None, _frame: object | None = None) -> None:
        for process in processes:
            if process.poll() is None:
                process.terminate()

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)

    try:
        while True:
            for process in processes:
                code = process.poll()
                if code is not None:
                    stop()
                    return code
            time.sleep(0.5)
    finally:
        stop()
        for process in processes:
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()


if __name__ == "__main__":
    raise SystemExit(main())
