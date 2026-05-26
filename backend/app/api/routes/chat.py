from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.answer_service import generate_grounded_answer

router = APIRouter(prefix="/chat", tags=["chat"])


class AnswerRequest(BaseModel):
    question: str = Field(..., min_length=1)
    top_k: int | None = Field(default=None, ge=1, le=10)


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
            {
                "text": chunk.text,
                "chunk_index": chunk.chunk_index,
                "document_filename": chunk.document_filename,
                "relevance_score": chunk.relevance_score,
                "distance": chunk.distance,
            }
            for chunk in answer_result.source_chunks
        ],
    }
