import argparse
import json
import os
import platform
import socket
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path


def port_is_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.2)
        return sock.connect_ex(("127.0.0.1", port)) != 0


def wait_for_http(port: int, seconds: int, path: str = "/") -> bool:
    deadline = time.time() + seconds
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}{path}", timeout=2) as response:
                if response.status == 200:
                    return True
        except Exception:
            time.sleep(0.25)
    return False


def write_windows_launcher(preview_dir: Path, port: int) -> Path:
    launcher_dir = Path(os.environ.get("TEMP", str(preview_dir)))
    launcher_dir.mkdir(exist_ok=True)
    launcher = launcher_dir / f"codex-static-preview-{port}.ps1"
    log = launcher_dir / f"codex-static-preview-{port}.log"
    python = Path(sys.executable)
    launcher.write_text(
        "\n".join(
            [
                "$ErrorActionPreference = 'Continue'",
                f"Set-Location -LiteralPath {quote_ps(str(preview_dir))} -ErrorAction Stop",
                (
                    f"& {quote_ps(str(python))} -m http.server {port} "
                    f"--bind 127.0.0.1 *> {quote_ps(str(log))}"
                ),
            ]
        )
        + "\n",
        encoding="utf-8-sig",
    )
    return launcher


def quote_ps(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def start_windows(preview_dir: Path, port: int) -> dict:
    launcher = write_windows_launcher(preview_dir, port)
    task_name = f"CodexStaticPreview{port}"
    run_at = (datetime.now() + timedelta(minutes=5)).strftime("%H:%M")
    powershell = Path(os.environ.get("SystemRoot", "C:/Windows")) / "System32/WindowsPowerShell/v1.0/powershell.exe"
    task_command = (
        f'"{powershell}" -NoProfile -ExecutionPolicy Bypass '
        f"-File \"{launcher}\""
    )

    create = subprocess.run(
        [
            "schtasks",
            "/Create",
            "/TN",
            task_name,
            "/TR",
            task_command,
            "/SC",
            "ONCE",
            "/ST",
            run_at,
            "/IT",
            "/F",
        ],
        capture_output=True,
        text=True,
    )
    if create.returncode != 0:
        raise RuntimeError(f"schtasks /Create failed: {create.stdout}\n{create.stderr}".strip())

    run = subprocess.run(["schtasks", "/Run", "/TN", task_name], capture_output=True, text=True)
    if run.returncode != 0:
        raise RuntimeError(f"schtasks /Run failed: {run.stdout}\n{run.stderr}".strip())

    if not wait_for_http(port, 10):
        raise RuntimeError(f"Preview server did not respond on 127.0.0.1:{port}")

    time.sleep(3)
    if not wait_for_http(port, 5):
        raise RuntimeError(f"Preview server responded once but did not persist on 127.0.0.1:{port}")
    if not wait_for_http(port, 5, "/data/contests.json"):
        raise RuntimeError(f"Preview server is not serving the project data directory on 127.0.0.1:{port}")

    return {
        "url": f"http://127.0.0.1:{port}/",
        "port": port,
        "taskName": task_name,
        "launcher": str(launcher),
    }


def start_posix(preview_dir: Path, port: int) -> dict:
    subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"],
        cwd=preview_dir,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    if not wait_for_http(port, 10):
        raise RuntimeError(f"Preview server did not respond on 127.0.0.1:{port}")
    return {"url": f"http://127.0.0.1:{port}/", "port": port}


def main() -> int:
    parser = argparse.ArgumentParser(description="Start a persistent static preview server.")
    parser.add_argument("preview_dir", type=Path)
    parser.add_argument("--port", type=int, default=51554)
    args = parser.parse_args()

    preview_dir = args.preview_dir.resolve()
    if not preview_dir.exists():
        raise SystemExit(f"Preview directory does not exist: {preview_dir}")
    if not port_is_free(args.port):
        raise SystemExit(f"Port is already in use: {args.port}")

    if platform.system() == "Windows":
        result = start_windows(preview_dir, args.port)
    else:
        result = start_posix(preview_dir, args.port)

    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
