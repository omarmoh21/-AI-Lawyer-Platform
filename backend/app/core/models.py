import logging
from qdrant_client import AsyncQdrantClient, QdrantClient
from fastembed.sparse import SparseTextEmbedding

from app.config.settings import QDRANT_URL, QDRANT_API_KEY, COLLECTION_NAME

logger = logging.getLogger(__name__)

# Async client for the request path (hybrid_search / article_search) so
# querying Qdrant never blocks the event loop. A separate short-lived sync
# client is used only for the one-off startup connectivity check below.
qdrant_client = AsyncQdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=300)
bm25_model = SparseTextEmbedding(model_name="Qdrant/bm25")

_startup_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=300)
_info = _startup_client.get_collection(COLLECTION_NAME)
_startup_client.close()
logger.info("Qdrant connected — %d points", _info.points_count)
logger.info("Sparse model loaded; dense embeddings served by TEI")
