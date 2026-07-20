import logging
import torch
from qdrant_client import AsyncQdrantClient, QdrantClient
from fastembed.sparse import SparseTextEmbedding
from sentence_transformers import SentenceTransformer

from app.config.settings import QDRANT_URL, QDRANT_API_KEY, DENSE_MODEL_NAME, COLLECTION_NAME

logger = logging.getLogger(__name__)

device = "cuda" if torch.cuda.is_available() else "cpu"
logger.info("Using device: %s", device)

# Sync client: only used for the one-off startup sanity check below (there's
# no running event loop yet to await an async call with).
qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=300)
# Async client: used by every actual search call (see app.services.rag).
async_qdrant_client = AsyncQdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=300)
dense_model   = SentenceTransformer(DENSE_MODEL_NAME, device=device)
bm25_model    = SparseTextEmbedding(model_name="Qdrant/bm25")

_info = qdrant_client.get_collection(COLLECTION_NAME)
logger.info("Qdrant connected — %d points", _info.points_count)
logger.info("All models loaded successfully")
