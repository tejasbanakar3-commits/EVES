"""
Eves API process bootstrap.

The Emergent supervisor launches `uvicorn server:app --host 0.0.0.0 --port 8001`
on /app/backend. The actual API is a Node/Express + Socket.IO + BullMQ worker
service (see /app/backend/apps/api/src/server.ts). To avoid running two
processes on port 8001, this module replaces the current Python process with
Node via `os.execvp` at import time. After exec, Node owns the supervisor PID
and binds 8001 itself.
"""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
TS_ENTRY = BACKEND_DIR / "apps" / "api" / "src" / "server.ts"

# Ensure all child Node processes start in the backend dir
os.chdir(BACKEND_DIR)

# Resolve binaries
node_bin = shutil.which("node") or "/usr/bin/node"
tsx_bin = BACKEND_DIR / "node_modules" / ".bin" / "tsx"

if not tsx_bin.exists():
    sys.stderr.write(
        f"[bootstrap] tsx binary not found at {tsx_bin}. Run `npm install` in {BACKEND_DIR}.\n"
    )
    sys.stderr.flush()
    sys.exit(1)

argv = [node_bin, str(tsx_bin), str(TS_ENTRY)]

sys.stdout.write(f"[bootstrap] Replacing Python process with Node: {' '.join(argv)}\n")
sys.stdout.flush()

os.execvp(argv[0], argv)
