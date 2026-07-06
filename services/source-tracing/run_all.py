#!/usr/bin/env python3
"""Run the full source-tracing backend pipeline (specs 003→007) end-to-end."""
import subprocess, sys, pathlib

HERE = pathlib.Path(__file__).parent
STEPS = [
    ("003 physics deviation",   "deviation.py"),
    ("004 forecast & anomaly",  "forecast_anomaly.py"),
    ("005 fouling validation",  "fouling_validation.py"),
    ("006 economics",           "economics.py"),
    ("007 AI assistant",        "assistant.py"),
    ("chart",                   "attribute.py"),
]

def main():
    py = sys.executable
    for label, script in STEPS:
        print(f"\n{'#'*72}\n# {label}\n{'#'*72}")
        r = subprocess.run([py, str(HERE / script)], cwd=HERE)
        if r.returncode != 0:
            sys.exit(f"step failed: {script}")
    print("\n✅ pipeline complete — outputs in data/")

if __name__ == "__main__":
    main()
