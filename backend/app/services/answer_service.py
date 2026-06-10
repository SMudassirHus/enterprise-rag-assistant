import logging
from dataclasses import dataclass
from collections.abc import Iterator

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
                    f"Document: {chunk.original_filename}",
                    f"Document ID: {chunk.document_id}",
                    f"Chunk index: {chunk.chunk_index}",
                    f"Text: {chunk.text}",
                ]
            )
        )

    return "\n\n---\n\n".join(context_blocks)


def build_answer_prompt(question: str, context: str) -> str:
    return (
        "Retrieved document context:\n"
        f"{context}\n\n"
        "User question:\n"
        f"{question}\n\n"
        "Grounded answer:"
    )


def build_answer_instructions() -> str:
    return (
        "You are an enterprise document assistant. Answer the user's question "
        "using only the provided retrieved document context. Do not use outside "
        "knowledge. If the answer is not present in the context, respond exactly "
        f"with: {FALLBACK_ANSWER}"
    )


def retrieve_answer_sources(
    question: str,
    api_key: str,
    embedding_model: str,
    db_path,
    collection_name: str,
    top_k: int,
    user_id: str,
) -> list[RetrievedChunk]:
    return retrieve_relevant_chunks(
        question=question,
        api_key=api_key,
        embedding_model=embedding_model,
        db_path=db_path,
        collection_name=collection_name,
        top_k=top_k,
        user_id=user_id,
    )


def generate_grounded_answer(
    question: str,
    api_key: str,
    embedding_model: str,
    chat_model: str,
    db_path,
    collection_name: str,
    top_k: int,
    user_id: str,
) -> AnswerResult:
    retrieved_chunks = retrieve_answer_sources(
        question=question,
        api_key=api_key,
        embedding_model=embedding_model,
        db_path=db_path,
        collection_name=collection_name,
        top_k=top_k,
        user_id=user_id,
    )

    if not retrieved_chunks:
        return AnswerResult(
            answer=FALLBACK_ANSWER,
            source_chunks=[],
            model=chat_model,
        )

    client = create_openai_client(api_key)
    context = build_context_from_chunks(retrieved_chunks)

    try:
        response = client.responses.create(
            model=chat_model,
            instructions=build_answer_instructions(),
            input=build_answer_prompt(question, context),
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


def stream_grounded_answer_text(
    question: str,
    source_chunks: list[RetrievedChunk],
    api_key: str,
    chat_model: str,
) -> Iterator[str]:
    if not source_chunks:
        yield FALLBACK_ANSWER
        return

    client = create_openai_client(api_key)
    context = build_context_from_chunks(source_chunks)

    try:
        stream = client.responses.create(
            model=chat_model,
            instructions=build_answer_instructions(),
            input=build_answer_prompt(question, context),
            stream=True,
        )

        for event in stream:
            event_type = getattr(event, "type", "")
            if event_type == "response.output_text.delta":
                delta = getattr(event, "delta", "")
                if delta:
                    yield delta
            elif event_type == "response.error":
                error = getattr(event, "error", None)
                raise RuntimeError(str(error or "OpenAI streaming error"))
    except OpenAIError as exc:
        logger.exception("OpenAI streaming answer request failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenAI streaming answer request failed.",
        ) from exc
