"""Live operational dashboard: request traffic + process/server health.

Unauthenticated by design (it's a glance-at-it-yourself tool while running a
tunnel for testers, not a user-facing feature) — don't share the /admin/monitor
link alongside the app link.
"""

import os

import psutil
from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from app.core import metrics

router = APIRouter(prefix="/admin", tags=["admin"])
_process = psutil.Process(os.getpid())


@router.get("/stats")
def stats():
    snap = metrics.snapshot()
    snap["process_cpu_percent"] = _process.cpu_percent(interval=None)
    snap["process_memory_mb"] = round(_process.memory_info().rss / (1024 * 1024), 1)
    snap["system_cpu_percent"] = psutil.cpu_percent(interval=None)
    snap["system_memory_percent"] = psutil.virtual_memory().percent
    return snap


_PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Al-Mustashar — Live Monitor</title>
<style>
  :root {
    --bg: #1c1a17; --panel: #26221d; --border: #3a3327;
    --gold: #c9a34e; --text: #e8e1d3; --muted: #9b9082;
    --ok: #7fae6b; --warn: #d99a4e; --err: #c1584a;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 2rem; background: var(--bg); color: var(--text);
    font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
  }
  h1 { font-family: Georgia, serif; color: var(--gold); font-weight: 600; margin: 0 0 1.5rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .card {
    background: var(--panel); border: 1px solid var(--border); border-radius: 8px;
    padding: 1rem 1.2rem;
  }
  .card .label { color: var(--muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .card .value { font-size: 1.6rem; color: var(--gold); margin-top: 0.25rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th, td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid var(--border); }
  th { color: var(--muted); font-weight: 400; text-transform: uppercase; font-size: 0.7rem; }
  .status-2 { color: var(--ok); } .status-3 { color: var(--warn); } .status-4, .status-5 { color: var(--err); }
  .path { color: var(--text); }
  .muted { color: var(--muted); }
  #err { color: var(--err); display: none; margin-bottom: 1rem; }
</style>
</head>
<body>
<h1>Al-Mustashar — Live Monitor</h1>
<div id="err">Lost connection to backend…</div>
<div class="grid" id="grid"></div>
<table>
  <thead><tr><th>Time</th><th>IP</th><th>Method</th><th>Path</th><th>Status</th><th>ms</th></tr></thead>
  <tbody id="rows"></tbody>
</table>

<script>
const grid = document.getElementById('grid');
const rows = document.getElementById('rows');
const err = document.getElementById('err');

function card(label, value) {
  return `<div class="card"><div class="label">${label}</div><div class="value">${value}</div></div>`;
}

function fmtUptime(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

async function tick() {
  try {
    const r = await fetch('/api/admin/stats', { cache: 'no-store' });
    if (!r.ok) throw new Error('bad status');
    const d = await r.json();
    err.style.display = 'none';

    grid.innerHTML = [
      card('Uptime', fmtUptime(d.uptime_seconds)),
      card('Total requests', d.total_requests),
      card('Req / last min', d.requests_last_minute),
      card('Distinct IPs (5 min)', d.distinct_ips_last_5min),
      card('Avg response (ms)', d.avg_response_ms_last_minute),
      card('Process CPU %', d.process_cpu_percent.toFixed(1)),
      card('Process memory (MB)', d.process_memory_mb),
      card('System CPU %', d.system_cpu_percent.toFixed(1)),
      card('System memory %', d.system_memory_percent.toFixed(1)),
    ].join('');

    rows.innerHTML = d.recent.map(r => `
      <tr>
        <td class="muted">${r.time}</td>
        <td class="muted">${r.ip}</td>
        <td>${r.method}</td>
        <td class="path">${r.path}</td>
        <td class="status-${String(r.status)[0]}">${r.status}</td>
        <td class="muted">${r.duration_ms}</td>
      </tr>`).join('');
  } catch (e) {
    err.style.display = 'block';
  }
}
tick();
setInterval(tick, 2000);
</script>
</body>
</html>
"""


@router.get("/monitor", response_class=HTMLResponse)
def monitor_page():
    return _PAGE
