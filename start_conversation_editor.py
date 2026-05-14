from __future__ import annotations

import argparse
import atexit
import http.server
import os
import signal
import socket
import socketserver
import subprocess
import sys
import time
import webbrowser
from pathlib import Path


HOST = "127.0.0.1"
PORT = 4173
PID_FILE = ".conversation_editor_server.pid"


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--serve", action="store_true")
    parser.add_argument("--stop", action="store_true")
    parser.add_argument("--no-browser", action="store_true")
    return parser.parse_args()


def app_root() -> Path:
    return Path(__file__).resolve().parent


def dist_dir() -> Path:
    return app_root() / "dist"


def pid_path() -> Path:
    return app_root() / PID_FILE


def is_server_up(timeout: float = 0.5) -> bool:
    try:
        with socket.create_connection((HOST, PORT), timeout=timeout):
            return True
    except OSError:
        return False


def write_pid_file() -> None:
    pid_path().write_text(str(os.getpid()), encoding="ascii")


def remove_pid_file() -> None:
    try:
        path = pid_path()
        if path.exists():
            path.unlink()
    except OSError:
        pass


def open_browser() -> None:
    webbrowser.open(f"http://{HOST}:{PORT}/")


def run_server() -> int:
    target = dist_dir()
    if not target.exists():
        print("dist folder is missing. Build the app first.")
        return 1

    handler = lambda *args, **kwargs: http.server.SimpleHTTPRequestHandler(  # noqa: E731
        *args,
        directory=str(target),
        **kwargs,
    )

    try:
        server = ReusableTCPServer((HOST, PORT), handler)
    except OSError:
        print(f"Port {PORT} is already in use.")
        return 1

    write_pid_file()
    atexit.register(remove_pid_file)

    try:
        server.serve_forever()
    finally:
        server.server_close()
        remove_pid_file()

    return 0


def spawn_server_process() -> subprocess.Popen[bytes]:
    flags = 0
    for name in ("DETACHED_PROCESS", "CREATE_NEW_PROCESS_GROUP", "CREATE_NO_WINDOW"):
        flags |= int(getattr(subprocess, name, 0))

    return subprocess.Popen(
        [sys.executable, str(app_root() / "start_conversation_editor.py"), "--serve"],
        cwd=str(app_root()),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        stdin=subprocess.DEVNULL,
        creationflags=flags,
        close_fds=True,
    )


def wait_for_server(seconds: float = 5.0) -> bool:
    deadline = time.time() + seconds
    while time.time() < deadline:
        if is_server_up():
            return True
        time.sleep(0.15)
    return False


def stop_server() -> int:
    path = pid_path()
    if not path.exists():
        print("No server pid file was found.")
        return 1

    try:
        pid = int(path.read_text(encoding="ascii").strip())
    except (OSError, ValueError):
        print("Could not read the pid file.")
        remove_pid_file()
        return 1

    try:
        os.kill(pid, signal.SIGTERM)
    except OSError:
        print("Could not stop the server process.")
        remove_pid_file()
        return 1

    deadline = time.time() + 5.0
    while time.time() < deadline:
        if not is_server_up():
            remove_pid_file()
            print("Server stopped.")
            return 0
        time.sleep(0.15)

    print("The server process did not exit in time.")
    return 1


def launch(no_browser: bool) -> int:
    if not dist_dir().exists():
        print("dist folder is missing. Build the app first.")
        return 1

    if not is_server_up():
        spawn_server_process()
        if not wait_for_server():
            print("Server did not start.")
            return 1

    if not no_browser:
        open_browser()

    print(f"Conversation Editor is available at http://{HOST}:{PORT}/")
    return 0


def main() -> int:
    args = parse_args()

    if args.serve:
        return run_server()

    if args.stop:
        return stop_server()

    return launch(no_browser=args.no_browser)


if __name__ == "__main__":
    raise SystemExit(main())
