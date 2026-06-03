from dataclasses import dataclass

from app.services.embedding_service import generate_query_embedding
from app.services.vector_store_service import query_similar_chunks


@dataclass(frozen=True)
class RetrievedChunk:
    text: str
    chunk_index: int | None
    document_id: str
    document_filename: str
    original_filename: str
    relevance_score: float | None
    distance: float | None


def distance_to_relevance_score(distance: float | None) -> float | None:
    if distance is None:
        return None

    # Chroma returns smaller distances for closer matches. This converts the
    # distance into a simple 0..1-style score for beginner-friendly display.
    return 1 / (1 + distance)


def retrieve_relevant_chunks(
    question: str,
    api_key: str,
    embedding_model: str,
    db_path,
    collection_name: str,
    top_k: int,
) -> list[RetrievedChunk]:
    query_embedding = generate_query_embedding(
        text=question,
        api_key=api_key,
        model=embedding_model,
    )
    query_result = query_similar_chunks(
        query_embedding=query_embedding,
        db_path=db_path,
        collection_name=collection_name,
        top_k=top_k,
    )

    documents = query_result.get("documents", [[]])[0]
    metadatas = query_result.get("metadatas", [[]])[0]
    distances = query_result.get("distances", [[]])[0]

    retrieved_chunks: list[RetrievedChunk] = []
    for document, metadata, distance in zip(documents, metadatas, distances):
        metadata = metadata or {}
        retrieved_chunks.append(
            RetrievedChunk(
                text=document,
                chunk_index=metadata.get("chunk_index"),
                document_id=metadata.get("document_id", metadata.get("filename", "unknown")),
                document_filename=metadata.get("filename", "unknown"),
                original_filename=metadata.get(
                    "original_filename",
                    metadata.get("filename", "unknown"),
                ),
                relevance_score=distance_to_relevance_score(distance),
                distance=distance,
            )
        )

    return retrieved_chunks
