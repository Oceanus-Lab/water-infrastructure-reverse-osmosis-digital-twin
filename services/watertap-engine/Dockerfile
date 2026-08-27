# watertap-engine — the physics service docs/05-gcp-infrastructure.md specifies.
#
# Its own image rather than folding WaterTAP into ro-serving-api, for two reasons. The stack
# (Pyomo + IDAES + the Ipopt binaries) is far heavier than the rest of the API, and pip's
# WaterTAP does not ship a solver at all: `idaes get-extensions` has to download it at build
# time. Buildpacks cannot run that step, so this needs a Dockerfile, and ro-serving-api keeps
# its fast buildpack path.
# Debian 12 (bookworm), not the current slim tag. python:3.11-slim now resolves to Debian 13,
# which `idaes get-extensions` rejects with "Unsupported platform: debian13-x86_64" — it then
# exits 0 having installed nothing, and every solve fails with "Pynumero not available".
FROM python:3.11-slim-bookworm

# Ipopt's runtime deps. liblapack3 and libblas3 are the two that are easy to miss: without
# them the binary installs fine and `test -x` passes, then every solve dies with return code
# 127 (checked with ldd — they were the only "not found" entries). curl is for get-extensions.
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl libgfortran5 libgomp1 liblapack3 libblas3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download the Ipopt/IDAES solver binaries. Without this every solve returns
# "No default solver found", which the caller cannot tell apart from a genuine failure.
# --distro is pinned for the same reason: rely on autodetection and a future base-image bump
# silently takes the solver away again.
RUN idaes get-extensions --distro ubuntu2204 \
    && test -x /root/.idaes/bin/ipopt \
    && ! ldd /root/.idaes/bin/ipopt | grep -q 'not found'
ENV PATH="/root/.idaes/bin:${PATH}"

COPY main.py physics.py ./

# Fail the build, not the first request, if the solver did not land.
RUN python -c "\
import physics; r = physics.simulate(); \
assert r.get('fidelity') == 'high', f'solver check failed: {r}'; \
print('solver OK:', r['solver_status'], r['clean_water_flux_kg_m2_h'])"

ENV PORT=8080
CMD exec uvicorn main:app --host 0.0.0.0 --port ${PORT}
