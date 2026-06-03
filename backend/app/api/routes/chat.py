import json
import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.answer_service import (
    generate_grounded_answer,
    retrieve_answer_sources,
    stream_grounded_answer_text,
)

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
def answer_question(request: AnswerRequest) -> dict:
    top_k = request.top_k or settings.retrieval_top_k
    answer_result = generate_grounded_answer(
        question=request.question,
        api_key=settings.openai_api_key,
        embedding_model=settings.embedding_model,
        chat_model=settings.chat_model,
        db_path=settings.chroma_path,
        collection_name=settings.chroma_collection_name,
        top_k=top_k,
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
def stream_answer_question(request: AnswerRequest) -> StreamingResponse:
    def event_stream():
        top_k = request.top_k or settings.retrieval_top_k

        try:
            source_chunks = retrieve_answer_sources(
                question=request.question,
                api_key=settings.openai_api_key,
                embedding_model=settings.embedding_model,
                db_path=settings.chroma_path,
                collection_name=settings.chroma_collection_name,
                top_k=top_k,
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
