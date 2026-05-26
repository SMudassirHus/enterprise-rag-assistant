from fastapi import APIRouter, File, UploadFile

from app.core.config import settings
from app.services.embedding_service import (
    generate_chunk_embeddings,
    summarize_embedding_result,
)
from app.services.pdf_extraction_service import extract_text_from_pdf
from app.services.text_chunking_service import TextChunk, split_text_into_chunks
from app.services.upload_service import save_uploaded_pdf
from app.services.vector_store_service import store_chunk_embeddings

router = APIRouter(prefix="/uploads", tags=["uploads"])


def get_chunks_for_uploaded_pdf(filename: str) -> list[TextChunk]:
    extracted_text = extract_text_from_pdf(settings.upload_path, filename)
    return split_text_into_chunks(
        text=extracted_text,
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )


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
    chunks = get_chunks_for_uploaded_pdf(filename)
    embedding_result = generate_chunk_embeddings(
        chunks=chunks,
        api_key=settings.openai_api_key,
        model=settings.embedding_model,
    )

    return {
        "status": "success",
        "message": "Embeddings generated successfully",
        "filename": filename,
        **summarize_embedding_result(embedding_result),
    }


@router.post("/{filename}/vector-store")
def store_pdf_chunks_in_vector_database(filename: str) -> dict[str, str | int]:
    chunks = get_chunks_for_uploaded_pdf(filename)
    embedding_result = generate_chunk_embeddings(
        chunks=chunks,
        api_key=settings.openai_api_key,
        model=settings.embedding_model,
    )
    storage_result = store_chunk_embeddings(
        chunk_embeddings=embedding_result.chunk_embeddings,
        db_path=settings.chroma_path,
        collection_name=settings.chroma_collection_name,
        filename=filename,
        embedding_model=embedding_result.model,
    )

    return {
        "status": "success",
        "message": "Chunks stored in vector database successfully",
        **storage_result,
    }
