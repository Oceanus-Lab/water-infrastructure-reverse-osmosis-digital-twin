import sys, pathlib

_HERE = pathlib.Path(__file__).resolve()
# make the source-tracing modules importable as top-level (import common, deviation, ...)
sys.path.insert(0, str(_HERE.parent.parent))
# ...and the repo root, so test_assistant.py can `from services.agent... import ...`.
# Without this, `cd services/source-tracing && pytest tests/` — the command CLAUDE.md
# documents — dies at collection and takes every other test in the run down with it.
sys.path.insert(0, str(_HERE.parent.parent.parent.parent))
