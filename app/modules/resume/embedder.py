"""
Local embedding generation using sentence-transformers.
No external API needed — runs entirely on CPU.
Model: all-MiniLM-L6-v2 (384-dim, fast, good quality).
"""

import logging

import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

_MODEL_NAME = "all-MiniLM-L6-v2"
_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    """Lazy-load the model on first use (avoids slow startup if not needed)."""
    global _model
    if _model is None:
        logger.info("Loading sentence-transformer model '%s' …", _MODEL_NAME)
        _model = SentenceTransformer(_MODEL_NAME)
        logger.info("Model loaded.")
    return _model


def generate_embeddings(chunks: list[str]) -> np.ndarray:
    """
    Generate embeddings for a list of text chunks.
    Returns a numpy array of shape (n_chunks, embedding_dim).
    """
    model = _get_model()
    embeddings = model.encode(chunks, convert_to_numpy=True, show_progress_bar=False)
    return embeddings


def generate_query_embedding(query: str) -> np.ndarray:
    """Generate a single embedding vector for a retrieval query."""
    model = _get_model()
    return model.encode(query, convert_to_numpy=True, show_progress_bar=False)
