"""Smoke tests for service layer."""


def test_hybrid_search_returns_list():
    from core.services.rag.qdrant_search import hybrid_search
    results = hybrid_search("عقوبة السرقة")
    assert isinstance(results, list)


def test_article_search_unknown_returns_none():
    from core.services.rag.qdrant_search import article_search
    result = article_search("قانون غير موجود", 9999)
    assert result is None
