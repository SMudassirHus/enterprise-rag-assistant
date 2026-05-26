import logging
from dataclasses import dataclass

from fastapi import HTTPException, status
from openai import OpenAI, OpenAIError

from app.services.text_chunking_service import TextChunk

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ChunkEmbedding:
    chunk: TextChunk
    embedding: list[float]


@dataclass(frozen=True)
class EmbeddingResult:
    chunk_embeddings: list[ChunkEmbedding]
    model: str
    dimensions: int


def create_openai_client(api_key: str) -> OpenAI:
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI API key is not configured.",
        )

    return OpenAI(api_key=api_key)


def generate_chunk_embeddings(
    chunks: list[TextChunk],
    api_key: str,
    model: str,
) -> EmbeddingResult:
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No text chunks were provided for embedding generation.",
        )

    client = create_openai_client(api_key)
    chunk_texts = [chunk.text for chunk in chunks]

    try:
        response = client.embeddings.create(
            model=model,
            input=chunk_texts,
        )
    except OpenAIError as exc:
        logger.exception("OpenAI embedding request failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenAI embedding request failed.",
        ) from exc

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenAI returned no embeddings.",
        )

    embeddings_by_index = sorted(response.data, key=lambda item: item.index)
    chunk_embeddings = [
        ChunkEmbedding(chunk=chunk, embedding=embedding_data.embedding)
        for chunk, embedding_data in zip(chunks, embeddings_by_index)
    ]

    if len(chunk_embeddings) != len(chunks):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenAI returned an unexpected number of embeddings.",
        )

    return EmbeddingResult(
        chunk_embeddings=chunk_embeddings,
        model=response.model,
        dimensions=len(chunk_embeddings[0].embedding),
    )


def generate_query_embedding(
    text: str,
    api_key: str,
    model: str,
) -> list[float]:
    query_text = text.strip()
    if not query_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty.",
        )

    client = create_openai_client(api_key)

    try:
        response = client.embeddings.create(
            model=model,
            input=query_text,
        )
    except OpenAIError as exc:
        logger.exception("OpenAI query embedding request failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenAI query embedding request failed.",
        ) from exc

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenAI returned no query embedding.",
        )

    return response.data[0].embedding


def summarize_embedding_result(result: EmbeddingResult) -> dict[str, int | str]:
    return {
        "total_chunks_processed": len(result.chunk_embeddings),
        "embedding_model": result.model,
        "embedding_dimensions": result.dimensions,
    }
