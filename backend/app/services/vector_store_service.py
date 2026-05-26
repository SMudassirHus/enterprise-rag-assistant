import logging
from pathlib import Path

import chromadb
from fastapi import HTTPException, status

from app.services.embedding_service import ChunkEmbedding

logger = logging.getLogger(__name__)


def get_chroma_collection(db_path: Path, collection_name: str):
    try:
        db_path.mkdir(parents=True, exist_ok=True)
        client = chromadb.PersistentClient(path=str(db_path))
        return client.get_or_create_collection(name=collection_name)
    except Exception as exc:
        logger.exception("Could not initialize ChromaDB collection")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not initialize vector database.",
        ) from exc


def build_chunk_id(filename: str, chunk_index: int) -> str:
    return f"{filename}::chunk-{chunk_index}"


def store_chunk_embeddings(
    chunk_embeddings: list[ChunkEmbedding],
    db_path: Path,
    collection_name: str,
    filename: str,
    embedding_model: str,
) -> dict[str, int | str]:
    if not chunk_embeddings:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No embeddings were provided for vector storage.",
        )

    collection = get_chroma_collection(db_path, collection_name)

    ids = [
        build_chunk_id(filename, item.chunk.index)
        for item in chunk_embeddings
    ]
    documents = [item.chunk.text for item in chunk_embeddings]
    embeddings = [item.embedding for item in chunk_embeddings]
    metadatas = [
        {
            "filename": filename,
            "chunk_index": item.chunk.index,
            "character_count": item.chunk.character_count,
            "embedding_model": embedding_model,
        }
        for item in chunk_embeddings
    ]

    try:
        collection.upsert(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
        )
    except Exception as exc:
        logger.exception("Could not store embeddings in ChromaDB")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not store embeddings in vector database.",
        ) from exc

    return {
        "total_chunks_stored": len(chunk_embeddings),
        "collection_name": collection_name,
        "document_filename": filename,
    }


def query_similar_chunks(
    query_embedding: list[float],
    db_path: Path,
    collection_name: str,
    top_k: int,
):
    if top_k <= 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Retrieval top_k must be greater than zero.",
        )

    collection = get_chroma_collection(db_path, collection_name)

    try:
        if collection.count() == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No documents have been stored in the vector database yet.",
            )

        return collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Could not query ChromaDB collection")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not search vector database.",
        ) from exc
