"""In-memory request metrics for the /admin/monitor dashboard.

Deliberately not persisted anywhere: this is a live operational view for
whoever is running the server locally, not an analytics system. Counters
reset on every restart.
"""

import time
from collections import deque
from dataclasses import dataclass

_START_TIME = time.time()
_TOTAL_REQUESTS = 0
_RECENT_WINDOW = 500  # how many recent requests to keep for the rolling stats


@dataclass
class RequestRecord:
    ts: float
    ip: str
    method: str
    path: str
    status: int
    duration_ms: float


_records: deque[RequestRecord] = deque(maxlen=_RECENT_WINDOW)


def record(ip: str, method: str, path: str, status: int, duration_ms: float) -> None:
    global _TOTAL_REQUESTS
    _TOTAL_REQUESTS += 1
    _records.append(RequestRecord(time.time(), ip, method, path, status, duration_ms))


def snapshot() -> dict:
    now = time.time()
    last_minute = [r for r in _records if now - r.ts <= 60]
    last_5min = [r for r in _records if now - r.ts <= 300]
    distinct_ips_5min = {r.ip for r in last_5min}
    avg_ms = sum(r.duration_ms for r in last_minute) / len(last_minute) if last_minute else 0.0

    return {
        "uptime_seconds": round(now - _START_TIME),
        "total_requests": _TOTAL_REQUESTS,
        "requests_last_minute": len(last_minute),
        "distinct_ips_last_5min": len(distinct_ips_5min),
        "avg_response_ms_last_minute": round(avg_ms, 1),
        "recent": [
            {
                "time": time.strftime("%H:%M:%S", time.localtime(r.ts)),
                "ip": r.ip,
                "method": r.method,
                "path": r.path,
                "status": r.status,
                "duration_ms": round(r.duration_ms, 1),
            }
            for r in list(_records)[-25:][::-1]
        ],
    }
