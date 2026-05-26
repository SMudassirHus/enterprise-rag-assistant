import logging

from fastapi import APIRouter, File, UploadFile
from fastapi import HTTPException, status

from app.core.config import settings
from app.services.document_pipeline_service import (
    generate_embeddings_for_uploaded_pdf,
    get_chunks_for_uploaded_pdf,
    store_uploaded_pdf_in_vector_database,
)
from app.services.embedding_service import summarize_embedding_result
from app.services.pdf_extraction_service import extract_text_from_pdf
from app.services.upload_service import save_uploaded_pdf

router = APIRouter(prefix="/uploads", tags=["uploads"])
logger = logging.getLogger(__name__)


@router.post("")
async def upload_pdf(file: UploadFile = File(...)) -> dict[str, str]:
    stored_filename = await save_uploaded_pdf(file, settings.upload_path)

    return {
        "status": "success",
        "message": "PDF uploaded successfully",
        "filename": stored_filename,
    }


@router.post("/{filename}/extract")
def extract_pdf_text(filename: str) -> dict[str, str | int]:
    extracted_text = extract_text_from_pdf(settings.upload_path, filename)

    return {
        "status": "success",
        "message": "Text extracted successfully",
        "filename": filename,
        "text": extracted_text,
        "character_count": len(extracted_text),
    }


@router.post("/{filename}/chunks")
def create_pdf_chunks(filename: str) -> dict[str, str | int | list[dict[str, str | int]]]:
    chunks = get_chunks_for_uploaded_pdf(filename)

    return {
        "status": "success",
        "message": "Text chunks created successfully",
        "filename": filename,
        "chunk_size": settings.chunk_size,
        "chunk_overlap": settings.chunk_overlap,
        "total_chunks": len(chunks),
        "chunks": [
            {
                "index": chunk.index,
                "text": chunk.text,
                "character_count": chunk.character_count,
            }
            for chunk in chunks
        ],
    }


@router.post("/{filename}/embeddings")
def create_pdf_embeddings(filename: str) -> dict[str, str | int]:
    try:
        embedding_result = generate_embeddings_for_uploaded_pdf(filename)

        return {
            "status": "success",
            "message": "Embeddings generated successfully",
            "filename": filename,
            **summarize_embedding_result(embedding_result),
        }
    except HTTPException as exc:
        logger.exception("Embeddings endpoint failed with handled error")
        raise exc
    except Exception as exc:
        logger.exception("Embeddings endpoint failed with unexpected error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected embeddings endpoint error: {exc.__class__.__name__}",
        ) from exc


@router.post("/{filename}/vector-store")
def store_pdf_chunks_in_vector_database(filename: str) -> dict[str, str | int]:
    storage_result = store_uploaded_pdf_in_vector_database(filename)

    return {
        "status": "success",
        "message": "Chunks stored in vector database successfully",
        **storage_result,
    }
