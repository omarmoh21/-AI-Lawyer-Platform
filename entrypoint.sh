#!/bin/bash
# Container entrypoint for the single-Space deployment: starts TEI (dense
# embeddings) in the background, waits for it to report healthy, runs DB
# migrations, then hands off to uvicorn as the foreground process.
set -euo pipefail
cd /app/backend

# Only --model-id is passed here — matching exactly what this project's own
# docker-compose.yml uses locally (proven to work). TEI's own default port
# (80, confirmed by that compose file's "8080:80" mapping) is used as-is
# rather than guessing at --port/--hostname flag names that were never
# actually exercised.
echo "[entrypoint] starting TEI (text-embeddings-router) on 127.0.0.1:80..."
text-embeddings-router --model-id "${DENSE_MODEL_NAME}" &
TEI_PID=$!

echo "[entrypoint] waiting for TEI to become healthy..."
TEI_READY=0
for _ in $(seq 1 30); do
    if curl -s -o /dev/null -f http://127.0.0.1:80/health; then
        TEI_READY=1
        break
    fi
    sleep 1
done

if [ "$TEI_READY" -eq 1 ]; then
    echo "[entrypoint] TEI is healthy."
else
    # Don't hard-fail the container: auth, contracts, and document upload
    # don't depend on TEI. Only legal search/chat will error until it comes
    # up (or the process at $TEI_PID crashed — check `docker logs` for why).
    echo "[entrypoint] WARNING: TEI did not become healthy in time — continuing anyway." >&2
fi

echo "[entrypoint] running database migrations..."
alembic upgrade head

echo "[entrypoint] starting uvicorn on 0.0.0.0:7860..."
exec uvicorn main:app --host 0.0.0.0 --port 7860
