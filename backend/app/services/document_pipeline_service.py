import logging

from app.core.config import settings
from app.services.embedding_service import (
    EmbeddingResult,
    generate_chunk_embeddings,
)
from app.services.pdf_extraction_service import extract_text_from_pdf
from app.services.text_chunking_service import TextChunk, split_text_into_chunks
from app.services.vector_store_service import store_chunk_embeddings

logger = logging.getLogger(__name__)


def get_chunks_for_uploaded_pdf(filename: str) -> list[TextChunk]:
    extracted_text = extract_text_from_pdf(settings.upload_path, filename)
    return split_text_into_chunks(
        text=extracted_text,
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )


def generate_embeddings_for_uploaded_pdf(filename: str) -> EmbeddingResult:
    logger.info(
        "Generating embeddings for '%s'. Safe OpenAI config: %s",
        filename,
        settings.safe_openai_debug_info(),
    )
    chunks = get_chunks_for_uploaded_pdf(filename)
    logger.info("Prepared %s chunks for embedding generation", len(chunks))

    return generate_chunk_embeddings(
        chunks=chunks,
        api_key=settings.openai_api_key,
        model=settings.embedding_model,
    )


def store_uploaded_pdf_in_vector_database(filename: str) -> dict[str, int | str]:
    embedding_result = generate_embeddings_for_uploaded_pdf(filename)
    return store_chunk_embeddings(
        chunk_embeddings=embedding_result.chunk_embeddings,
        db_path=settings.chroma_path,
        collection_name=settings.chroma_collection_name,
        filename=filename,
        embedding_model=embedding_result.model,
    )
