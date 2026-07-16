"""
Live fetch of Egyptian contract templates from lawhub.info (الموسوعة القانونية - LAW HUB).

The site is plain WordPress: stable category IDs list posts, each post page
holds the full contract text in an <article> tag. No login wall.
"""

import os
import re
import json
import time
import logging
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

BASE_URL = "https://lawhub.info/eg/"
HEADERS  = {"User-Agent": "Mozilla/5.0 (compatible; LegalAssistantBot/1.0)"}
TIMEOUT  = 15

CACHE_DIR = os.path.join(os.path.dirname(__file__), "_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# ── Contract categories (verified stable IDs on lawhub.info) ───
CATEGORIES: dict[str, int] = {
    "بيع":          947,   # sale
    "ايجار":        946,   # rental
    "شركات":        952,   # companies
    "عمل":          955,   # employment
    "مقاولة":       960,   # contracting
    "وكالة":        963,   # agency
    "رهن":          950,   # mortgage
    "هبة":          961,   # gift
    "قسمة":         957,   # division
    "مقايضة":       965,   # barter
    "وديعة":        962,   # deposit
    "قرض":          956,   # loan
    "عارية":        954,   # loan for use
    "صلح":          953,   # settlement
    "زواج":         951,   # marriage
    "تفاسخ":        969,
    "حراسة":        948,   # custody/guard
    "دخل دائم":     949,   # perpetual income
    "انتفاع":       972,   # usufruct
    "اخرى":         967,   # other
    "كفالة":        958,   # guarantee
    "مرتب مدى الحياة": 959,
    "وصية":         968,   # will
    "حوالة":        964,   # assignment
    "ملكية طبقات وشقق": 966,
}


def _cache_path(key: str) -> str:
    safe = re.sub(r"[^\w\-]", "_", key)
    return os.path.join(CACHE_DIR, f"{safe}.json")


def _cache_get(key: str, max_age_seconds: int = 7 * 24 * 3600):
    path = _cache_path(key)
    if not os.path.exists(path):
        return None
    if time.time() - os.path.getmtime(path) > max_age_seconds:
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _cache_set(key: str, value):
    with open(_cache_path(key), "w", encoding="utf-8") as f:
        json.dump(value, f, ensure_ascii=False)


def list_categories() -> dict[str, int]:
    """Return the available contract categories and their IDs."""
    return CATEGORIES


def list_contracts(category: str) -> list[dict]:
    """List contract titles + post IDs available in a given category keyword."""
    category = category.strip()
    cat_id = CATEGORIES.get(category)
    if cat_id is None:
        # fuzzy match against keys
        for key, cid in CATEGORIES.items():
            if category in key or key in category:
                cat_id = cid
                break
    if cat_id is None:
        return []

    cache_key = f"cat_{cat_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    logger.info("lawhub: listing category %s (id=%d)", category, cat_id)
    resp = requests.get(BASE_URL, params={"cat": cat_id}, headers=HEADERS, timeout=TIMEOUT)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    results, seen = [], set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "?p=" not in href or href in seen:
            continue
        title = a.get_text(strip=True)
        if not title:
            continue
        seen.add(href)
        m = re.search(r"[?&]p=(\d+)", href)
        if m:
            results.append({"title": title, "post_id": m.group(1), "url": href})

    _cache_set(cache_key, results)
    return results


def search_contracts(query: str) -> list[dict]:
    """
    Search lawhub.info's own search engine for a contract by free-text query.
    More reliable than category-guessing — a query like 'صيانة كمبيوتر' finds
    the exact match even though it's filed under an unrelated-sounding category.
    """
    query = query.strip()
    if not query:
        return []

    cache_key = f"search_{query}"
    cached = _cache_get(cache_key, max_age_seconds=3 * 24 * 3600)
    if cached is not None:
        return cached

    logger.info("lawhub: searching for %r", query)
    resp = requests.get(BASE_URL, params={"s": query}, headers=HEADERS, timeout=TIMEOUT)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    results, seen = [], set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "?p=" not in href or href in seen:
            continue
        title = a.get_text(strip=True)
        if not title or "صيغة" not in title and "عقد" not in title and "اتفاق" not in title:
            continue  # skip non-contract results (laws, regulations, etc.)
        seen.add(href)
        m = re.search(r"[?&]p=(\d+)", href)
        if m:
            results.append({"title": title, "post_id": m.group(1), "url": href})

    _cache_set(cache_key, results)
    return results


def fetch_contract_text(post_id: str) -> str:
    """Fetch and return the full contract text for a given lawhub post ID."""
    cache_key = f"post_{post_id}"
    cached = _cache_get(cache_key, max_age_seconds=30 * 24 * 3600)
    if cached is not None:
        return cached["text"]

    url = f"{BASE_URL}?p={post_id}"
    logger.info("lawhub: fetching post %s", post_id)
    resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    article = (
        soup.find("article")
        or soup.find("div", class_="entry-content")
        or soup.find("div", class_="post-content")
    )
    if article is None:
        raise ValueError(f"Could not locate article content for post {post_id}")

    text = article.get_text("\n", strip=True)
    text = _clean_article_text(text)
    _cache_set(cache_key, {"text": text, "url": url})
    return text


_NOISE_MARKERS = [
    "📋 أضغط هُنا لنسخ الصيغة",   # page repeats the contract a 2nd time after this — cut it off
    "يمكنك مشاركة المقالة",
]


def _clean_article_text(text: str) -> str:
    """Strip page chrome: relative-date stamp, share widgets, and the
    duplicated 'click to copy' block that repeats the contract a 2nd time."""
    for marker in _NOISE_MARKERS:
        idx = text.find(marker)
        if idx != -1:
            text = text[:idx]

    lines = text.split("\n")
    cleaned = [
        ln for ln in lines
        if ln.strip() not in ("x",) and not re.match(r"^.{0,15}\s?ago$", ln.strip())
    ]
    return "\n".join(cleaned).strip()
