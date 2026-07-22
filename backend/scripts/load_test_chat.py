"""Concurrency load test for POST /api/chat.

Simulates N distinct users (signup + login, so each gets a real session and
the per-user rate limiter — 15/minute in api/routes/chat.py — doesn't throttle
them against each other) firing one legal question each, all at once, and
reports latency + throughput. This is the manual counterpart to the
methodology described in PERFORMANCE_ANALYSIS.md.

Usage:
    python scripts/load_test_chat.py
    python scripts/load_test_chat.py --users 30 --base-url http://localhost:8000/api
    python scripts/load_test_chat.py --users 30 --keep-users   # skip cleanup

Requires the backend (and, for full answers, Qdrant + TEI) already running.
"""

import argparse
import asyncio
import statistics
import time
import uuid

import httpx

QUESTIONS = [
    "ما عقوبة السرقة في القانون المصري؟",
    "ما حقوق المستأجر عند انتهاء عقد الإيجار؟",
    "ما إجراءات الفصل التعسفي في قانون العمل؟",
    "اشرح لي المادة 234 من قانون العقوبات.",
    "ما هي شروط صحة عقد البيع في القانون المدني؟",
    "كيف يتم تأسيس شركة ذات مسؤولية محدودة في مصر؟",
    "ما هي حقوق الحضانة في قانون الأحوال الشخصية؟",
    "ما عقوبة التزوير في المحررات الرسمية؟",
]


class UserResult:
    def __init__(self, index: int):
        self.index = index
        self.email = f"loadtest_{uuid.uuid4().hex[:10]}@example.com"
        self.signed_up = False
        self.logged_in = False
        self.chat_ok = False
        self.status_code: int | None = None
        self.latency_s: float | None = None
        self.error: str | None = None


async def _prepare_user(client: httpx.AsyncClient, base_url: str, result: UserResult) -> None:
    """Sign up (or fall back to login if the email exists) a synthetic user."""
    payload = {
        "name": f"Load Test {result.index}",
        "email": result.email,
        "phone": "01000000000",
        "city": "Cairo",
        "password": "loadtest12345",
    }
    resp = await client.post(f"{base_url}/auth/signup", json=payload)
    if resp.status_code == 201:
        result.signed_up = True
        result.logged_in = True
        return
    # Extremely unlikely with a random suffix, but handle a collision cleanly.
    resp = await client.post(
        f"{base_url}/auth/login",
        json={"email": result.email, "password": payload["password"]},
    )
    result.logged_in = resp.status_code == 200
    if not result.logged_in:
        result.error = f"signup/login failed: {resp.status_code} {resp.text[:200]}"


async def _fire_chat(client: httpx.AsyncClient, base_url: str, result: UserResult, timeout: float) -> None:
    if not result.logged_in:
        return
    question = QUESTIONS[result.index % len(QUESTIONS)]
    start = time.monotonic()
    try:
        resp = await client.post(
            f"{base_url}/chat",
            json={"message": question, "session_id": None, "extracted_text": ""},
            timeout=timeout,
        )
        result.latency_s = time.monotonic() - start
        result.status_code = resp.status_code
        result.chat_ok = resp.status_code == 200
        if not result.chat_ok:
            result.error = resp.text[:300]
    except Exception as e:
        result.latency_s = time.monotonic() - start
        result.error = f"{type(e).__name__}: {e}"


async def _cleanup_user(client: httpx.AsyncClient, base_url: str, result: UserResult) -> None:
    if result.logged_in:
        try:
            await client.delete(f"{base_url}/auth/me")
        except Exception:
            pass  # best-effort cleanup — a stray test account isn't worth failing the run over


async def run(base_url: str, n_users: int, timeout: float, keep_users: bool) -> None:
    print(f"Preparing {n_users} synthetic users against {base_url} ...")

    # One httpx.AsyncClient per user so each keeps its own cookie jar
    # (mirrors N independent browser sessions, not one shared connection).
    clients = [httpx.AsyncClient(timeout=30.0) for _ in range(n_users)]
    results = [UserResult(i) for i in range(n_users)]

    try:
        await asyncio.gather(
            *(_prepare_user(c, base_url, r) for c, r in zip(clients, results))
        )
        ready = sum(r.logged_in for r in results)
        print(f"{ready}/{n_users} users authenticated. Firing concurrent chat requests...\n")

        wall_start = time.monotonic()
        await asyncio.gather(
            *(_fire_chat(c, base_url, r, timeout) for c, r in zip(clients, results))
        )
        wall_total = time.monotonic() - wall_start

        _report(results, wall_total)

        if not keep_users:
            print("\nCleaning up test accounts...")
            await asyncio.gather(*(_cleanup_user(c, base_url, r) for c, r in zip(clients, results)))
    finally:
        await asyncio.gather(*(c.aclose() for c in clients))


def _report(results: list[UserResult], wall_total: float) -> None:
    ok = [r for r in results if r.chat_ok]
    failed = [r for r in results if r.logged_in and not r.chat_ok]
    unauth = [r for r in results if not r.logged_in]

    print("=" * 60)
    print("Per-request results")
    print("=" * 60)
    for r in results:
        if not r.logged_in:
            print(f"user {r.index:2d}  AUTH FAILED  {r.error}")
        elif r.chat_ok:
            print(f"user {r.index:2d}  OK   {r.latency_s:6.2f}s")
        else:
            print(f"user {r.index:2d}  FAIL {r.status_code}  {r.error}")

    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Total users targeted   : {len(results)}")
    print(f"Auth failures          : {len(unauth)}")
    print(f"Chat failures          : {len(failed)}")
    print(f"Successful chats       : {len(ok)}")
    print(f"Wall-clock time (all)  : {wall_total:.2f}s")

    if ok:
        latencies = sorted(r.latency_s for r in ok)
        p95_idx = min(len(latencies) - 1, int(len(latencies) * 0.95))
        print(f"Latency min / median / p95 / max : "
              f"{latencies[0]:.2f}s / {statistics.median(latencies):.2f}s / "
              f"{latencies[p95_idx]:.2f}s / {latencies[-1]:.2f}s")
        print(f"Throughput              : {len(ok) / wall_total:.2f} req/s")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://localhost:8000/api")
    parser.add_argument("--users", type=int, default=30)
    parser.add_argument("--timeout", type=float, default=120.0, help="per-request timeout in seconds")
    parser.add_argument("--keep-users", action="store_true", help="skip deleting the synthetic test accounts")
    args = parser.parse_args()

    asyncio.run(run(args.base_url, args.users, args.timeout, args.keep_users))


if __name__ == "__main__":
    main()
