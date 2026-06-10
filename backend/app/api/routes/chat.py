import json
import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.config import settings
from app.services.answer_service import (
    generate_grounded_answer,
    retrieve_answer_sources,
    stream_grounded_answer_text,
)
from app.services.conversation_intent_service import get_conversational_response

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)


class AnswerRequest(BaseModel):
    question: str = Field(..., min_length=1)
    top_k: int | None = Field(default=None, ge=1, le=10)


def serialize_source_chunk(chunk) -> dict:
    return {
        "text": chunk.text,
        "chunk_index": chunk.chunk_index,
        "document_id": chunk.document_id,
        "document_filename": chunk.document_filename,
        "original_filename": chunk.original_filename,
        "relevance_score": chunk.relevance_score,
        "distance": chunk.distance,
    }


def sse_event(event: str, data: dict | str) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("/answer")
def answer_question(
    request: AnswerRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    conversational_response = get_conversational_response(request.question)
    if conversational_response:
        return {
            "status": "success",
            "message": "Conversational response generated locally",
            "question": request.question,
            "answer": conversational_response.answer,
            "model": "local-intent",
            "sources": [],
        }

    top_k = request.top_k or settings.retrieval_top_k
    answer_result = generate_grounded_answer(
        question=request.question,
        api_key=settings.openai_api_key,
        embedding_model=settings.embedding_model,
        chat_model=settings.chat_model,
        db_path=settings.chroma_path,
        collection_name=settings.chroma_collection_name,
        top_k=top_k,
        user_id=current_user.user_id,
    )

    return {
        "status": "success",
        "message": "Answer generated successfully",
        "question": request.question,
        "answer": answer_result.answer,
        "model": answer_result.model,
        "sources": [
            serialize_source_chunk(chunk)
            for chunk in answer_result.source_chunks
        ],
    }


@router.post("/answer/stream")
def stream_answer_question(
    request: AnswerRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> StreamingResponse:
    def event_stream():
        conversational_response = get_conversational_response(request.question)
        if conversational_response:
            yield sse_event(
                "metadata",
                {
                    "question": request.question,
                    "model": "local-intent",
                    "sources": [],
                },
            )
            yield sse_event("delta", {"text": conversational_response.answer})
            yield sse_event(
                "done",
                {"message": "Conversational response generated locally"},
            )
            return

        top_k = request.top_k or settings.retrieval_top_k

        try:
            source_chunks = retrieve_answer_sources(
                question=request.question,
                api_key=settings.openai_api_key,
                embedding_model=settings.embedding_model,
                db_path=settings.chroma_path,
                collection_name=settings.chroma_collection_name,
                top_k=top_k,
                user_id=current_user.user_id,
            )

            yield sse_event(
                "metadata",
                {
                    "question": request.question,
                    "model": settings.chat_model,
                    "sources": [
                        serialize_source_chunk(chunk)
                        for chunk in source_chunks
                    ],
                },
            )

            for delta in stream_grounded_answer_text(
                question=request.question,
                source_chunks=source_chunks,
                api_key=settings.openai_api_key,
                chat_model=settings.chat_model,
            ):
                yield sse_event("delta", {"text": delta})

            yield sse_event("done", {"message": "Answer stream completed"})
        except Exception as exc:
            logger.exception("Streaming answer failed")
            yield sse_event(
                "error",
                {
                    "message": "Streaming answer failed.",
                    "error_type": exc.__class__.__name__,
                },
            )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
