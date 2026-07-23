# syntax=docker/dockerfile:1
#
# Single-container deployment for Hugging Face Spaces: builds frontend-v2,
# bakes in the TEI dense-embedding model weights, and packages the FastAPI
# backend to serve both the API and the built frontend on one origin/port.
#
# Three stages:
#   1. frontend-build — npm run build (frontend-v2/dist)
#   2. model-fetch     — pre-download the embedding model into the HF cache
#                         layout, isolated so huggingface_hub never ends up
#                         in the final runtime image
#   3. final           — Python runtime + TEI binary + baked-in model +
#                         backend code + built frontend

# ── Stage 1: build the frontend ─────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /build/frontend-v2
COPY frontend-v2/package.json frontend-v2/package-lock.json ./
RUN npm ci
COPY frontend-v2/ ./
# Loads .env.production automatically (vite build defaults to production mode)
# so API calls resolve to a relative "/api" path — see .env.production.
RUN npm run build

# ── Stage 2: pre-download the dense embedding model ─────────────────────
FROM python:3.12-slim AS model-fetch
ARG DENSE_MODEL_NAME="Omartificial-Intelligence-Space/Arabic-Triplet-Matryoshka-V2"
ENV HF_HOME=/hf-cache
RUN pip install --no-cache-dir "huggingface_hub[cli]" \
    && huggingface-cli download "${DENSE_MODEL_NAME}"

# ── Stage 3: final runtime image ─────────────────────────────────────────
FROM python:3.12-slim AS final

# TEI's compiled binary — no need to build/run their whole image, just the
# router binary this project's docker-compose.yml already uses locally.
COPY --from=ghcr.io/huggingface/text-embeddings-inference:cpu-latest \
    /usr/local/bin/text-embeddings-router /usr/local/bin/text-embeddings-router

# curl: used by entrypoint.sh to poll TEI's /health.
# libcap2-bin: provides setcap (see below).
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl libcap2-bin \
    && rm -rf /var/lib/apt/lists/*

# text-embeddings-router defaults to port 80 (confirmed by docker-compose.yml's
# "8080:80" mapping) — a privileged port. The container runs as non-root
# (below), so grant just this binary permission to bind it, instead of
# guessing at an unverified --port/--hostname flag to move it elsewhere.
RUN setcap 'cap_net_bind_service=+ep' /usr/local/bin/text-embeddings-router

# Hugging Face Spaces runs containers as a non-root user.
RUN useradd -m -u 1000 appuser
ENV HOME=/home/appuser \
    HF_HOME=/home/appuser/.cache/huggingface \
    DENSE_MODEL_NAME="Omartificial-Intelligence-Space/Arabic-Triplet-Matryoshka-V2" \
    TEI_EMBED_URL="http://127.0.0.1:80/embed" \
    PYTHONUNBUFFERED=1

# Baked-in model weights from stage 2 — TEI finds these via HF_HOME at
# startup and never touches the network for them.
COPY --from=model-fetch /hf-cache /home/appuser/.cache/huggingface

WORKDIR /app/backend

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
# Built frontend, served by main.py's static-files/SPA-fallback block
# (guarded by `_FRONTEND_DIR.is_dir()` — absent in local dev, present here).
COPY --from=frontend-build /build/frontend-v2/dist ./static

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh \
    && chown -R appuser:appuser /app /home/appuser

USER appuser

EXPOSE 7860

ENTRYPOINT ["/app/entrypoint.sh"]
