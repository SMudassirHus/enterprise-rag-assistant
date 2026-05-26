import logging
from dataclasses import dataclass

from fastapi import HTTPException, status
from openai import OpenAIError

from app.services.embedding_service import create_openai_client
from app.services.retrieval_service import RetrievedChunk, retrieve_relevant_chunks

logger = logging.getLogger(__name__)

FALLBACK_ANSWER = "I could not find this information in the uploaded document."


@dataclass(frozen=True)
class AnswerResult:
    answer: str
    source_chunks: list[RetrievedChunk]
    model: str


def build_context_from_chunks(chunks: list[RetrievedChunk]) -> str:
    context_blocks = []

    for position, chunk in enumerate(chunks, start=1):
        context_blocks.append(
            "\n".join(
                [
                    f"Source {position}",
                    f"Document: {chunk.document_filename}",
                    f"Chunk index: {chunk.chunk_index}",
                    f"Text: {chunk.text}",
                ]
            )
        )

    return "\n\n---\n\n".join(context_blocks)


def generate_grounded_answer(
    question: str,
    api_key: str,
    embedding_model: str,
    chat_model: str,
    db_path,
    collection_name: str,
    top_k: int,
) -> AnswerResult:
    retrieved_chunks = retrieve_relevant_chunks(
        question=question,
        api_key=api_key,
        embedding_model=embedding_model,
        db_path=db_path,
        collection_name=collection_name,
        top_k=top_k,
    )

    if not retrieved_chunks:
        return AnswerResult(
            answer=FALLBACK_ANSWER,
            source_chunks=[],
            model=chat_model,
        )

    client = create_openai_client(api_key)
    context = build_context_from_chunks(retrieved_chunks)

    instructions = (
        "You are an enterprise document assistant. Answer the user's question "
        "using only the provided retrieved document context. Do not use outside "
        "knowledge. If the answer is not present in the context, respond exactly "
        f"with: {FALLBACK_ANSWER}"
    )
    prompt = (
        "Retrieved document context:\n"
        f"{context}\n\n"
        "User question:\n"
        f"{question}\n\n"
        "Grounded answer:"
    )

    try:
        response = client.responses.create(
            model=chat_model,
            instructions=instructions,
            input=prompt,
        )
    except OpenAIError as exc:
        logger.exception("OpenAI answer generation request failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenAI answer generation request failed.",
        ) from exc

    answer = response.output_text.strip()
    if not answer:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenAI returned an empty answer.",
        )

    return AnswerResult(
        answer=answer,
        source_chunks=retrieved_chunks,
        model=chat_model,
    )
