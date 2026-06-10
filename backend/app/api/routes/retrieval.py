from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.config import settings
from app.services.retrieval_service import retrieve_relevant_chunks

router = APIRouter(prefix="/retrieval", tags=["retrieval"])


class RetrievalRequest(BaseModel):
    question: str = Field(..., min_length=1)
    top_k: int | None = Field(default=None, ge=1, le=10)


@router.post("/search")
def search_documents(
    request: RetrievalRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> dict:
    top_k = request.top_k or settings.retrieval_top_k
    matches = retrieve_relevant_chunks(
        question=request.question,
        api_key=settings.openai_api_key,
        embedding_model=settings.embedding_model,
        db_path=settings.chroma_path,
        collection_name=settings.chroma_collection_name,
        top_k=top_k,
        user_id=current_user.user_id,
    )

    return {
        "status": "success",
        "message": "Relevant chunks retrieved successfully",
        "question": request.question,
        "collection_name": settings.chroma_collection_name,
        "total_matches": len(matches),
        "matches": [
            {
                "text": match.text,
                "chunk_index": match.chunk_index,
                "document_id": match.document_id,
                "document_filename": match.document_filename,
                "original_filename": match.original_filename,
                "relevance_score": match.relevance_score,
                "distance": match.distance,
            }
            for match in matches
        ],
    }
