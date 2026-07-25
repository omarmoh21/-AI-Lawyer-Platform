# Running the App

Two ways to run المستشار (Al-Mustashar): locally on your own machine, or exposed
publicly through a Cloudflare quick tunnel so other people can test it.

The app is two processes:
- **Backend** — FastAPI, `backend/`, runs on port `8000`.
- **Frontend** — React/Vite, `frontend-v2/`, runs on port `5174`.

---

## 1. Local only

### Backend

```bash
cd backend
../venv/Scripts/python.exe -m uvicorn main:app --port 8000
```

Check it's up: `http://localhost:8000/api/health` should return `{"status":"ok"}`.

### Frontend

```bash
cd frontend-v2
npm run dev
```

Open `http://localhost:5174`. `frontend-v2/.env` should have:

```
VITE_API_BASE_URL=http://localhost:8000
```

That's it — no other config needed for local use.

---

## 2. Public testing via Cloudflare Tunnel

Use this when you want to share a URL with people who aren't on your machine/network.
Both the frontend and backend need their own tunnel, since testers' browsers talk to
both directly.

### One-time setup

Install `cloudflared` (no Cloudflare account needed for quick tunnels):

```bash
winget install --id Cloudflare.cloudflared -e
```

### Every time you want to go public

**Step 1 — start the backend and frontend locally first** (see section 1 above),
or make sure they're already running.

**Step 2 — start a tunnel for each port:**

```bash
cloudflared tunnel --url http://localhost:8000   # backend  -> prints a *.trycloudflare.com URL
cloudflared tunnel --url http://localhost:5174   # frontend -> prints a *.trycloudflare.com URL
```

Each command keeps running and prints a random URL like:

```
https://exports-advanced-presents-charges.trycloudflare.com
```

Keep both terminals/processes open — closing them kills the tunnel and the URL stops working.

**Step 3 — point the frontend at the backend's tunnel URL.**

Edit `frontend-v2/.env`:

```
VITE_API_BASE_URL=https://<your-backend-tunnel>.trycloudflare.com
```

**Step 4 — allow the frontend tunnel's hostname in Vite.**

`frontend-v2/vite.config.ts` already allow-lists `.trycloudflare.com`, so no edit
needed here unless you're using a different tunnel provider/domain.

**Step 5 — restart the backend with two extra environment variables:**

```bash
cd backend
export CORS_ORIGINS="https://<your-frontend-tunnel>.trycloudflare.com"
export COOKIE_CROSS_SITE="true"
../venv/Scripts/python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
```

- `CORS_ORIGINS` — lets the backend accept requests from the frontend's public URL
  (browsers block cross-origin requests otherwise).
- `COOKIE_CROSS_SITE` — the login cookie needs `SameSite=None; Secure` to survive
  being sent from one `trycloudflare.com` URL to a *different* one (that's genuinely
  cross-site, not just cross-origin like `localhost:5174` → `localhost:8000` is).
  Leaving this unset keeps the cookie `SameSite=Lax`, which is correct for local dev
  but breaks auth over tunnels — every request after login will fail with
  "Not authenticated".

**Step 6 — restart the frontend** so it picks up the new `.env`:

```bash
cd frontend-v2
npm run dev
```

**Step 7 — share the frontend tunnel URL** with your testers, e.g.:

```
https://chuck-hampshire-surname-princeton.trycloudflare.com
```

Testers sign up / log in through the app itself — the tunnel adds no access control
of its own, so anyone with the link can reach the login/signup pages.

### Things to know

- Quick tunnel URLs are random and **change every time `cloudflared` restarts** —
  if you restart either tunnel, redo steps 3–6 with the new URL(s).
- Your laptop must stay on and both `cloudflared` processes must keep running for
  testers to reach the app.
- No uptime guarantee — these are free, account-less Cloudflare tunnels meant for
  short testing sessions, not production hosting.
- To go back to local-only, stop both `cloudflared` processes, revert
  `frontend-v2/.env` to `http://localhost:8000`, and restart the backend without
  `CORS_ORIGINS`/`COOKIE_CROSS_SITE` set.

---

## 3. Watching live traffic & server health

While testers are using the app (local or via tunnel), open the live monitor
dashboard in a browser tab:

```
http://localhost:8000/api/admin/monitor           (local)
https://<your-backend-tunnel>.trycloudflare.com/api/admin/monitor   (via tunnel)
```

It auto-refreshes every 2 seconds and shows total requests, requests/min, distinct
IPs seen in the last 5 minutes, average response time, this process's CPU/memory,
your machine's overall CPU/memory, and a live tail of the most recent requests.

Notes:
- Counters are in-memory only — they reset whenever the backend restarts.
- The endpoint (`/api/admin/monitor`) is **unauthenticated** on purpose, so don't
  share that link next to the app link — it shows testers' IP addresses.
