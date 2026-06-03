import logging

from fastapi import APIRouter, File, UploadFile
from fastapi import HTTPException, status
from pydantic import BaseModel

from app.core.config import settings
from app.services.document_metadata_service import (
    create_document_metadata,
    get_document_by_id,
    load_documents,
    remove_document_by_id,
)
from app.services.document_pipeline_service import (
    generate_embeddings_for_uploaded_pdf,
    get_chunks_for_uploaded_pdf,
    mark_document_status,
    store_uploaded_pdf_in_vector_database,
)
from app.services.embedding_service import summarize_embedding_result
from app.services.pdf_extraction_service import extract_text_from_pdf
from app.services.upload_service import save_uploaded_pdf
from app.services.vector_store_service import (
    count_document_vectors,
    delete_document_vectors,
)

router = APIRouter(prefix="/uploads", tags=["uploads"])
logger = logging.getLogger(__name__)


class DocumentStatusResponse(BaseModel):
    text_extracted: bool
    chunks_created: bool
    embeddings_generated: bool
    stored_in_vector_db: bool


class DocumentMetadataResponse(BaseModel):
    document_id: str
    original_filename: str
    stored_filename: str
    uploaded_at: str
    status: DocumentStatusResponse
    chunks_count: int = 0


class BaseApiResponse(BaseModel):
    status: str
    message: str


class DocumentListResponse(BaseApiResponse):
    total_documents: int
    documents: list[DocumentMetadataResponse]


class UploadResponse(BaseApiResponse):
    document_id: str
    filename: str
    original_filename: str
    document: DocumentMetadataResponse


class MultipleUploadResponse(BaseApiResponse):
    total_documents: int
    documents: list[DocumentMetadataResponse]


class ExtractionResponse(BaseApiResponse):
    filename: str
    document: DocumentMetadataResponse | None
    text: str
    character_count: int


class ChunkItemResponse(BaseModel):
    index: int
    text: str
    character_count: int


class ChunkingResponse(BaseApiResponse):
    filename: str
    document: DocumentMetadataResponse | None
    chunk_size: int
    chunk_overlap: int
    total_chunks: int
    chunks: list[ChunkItemResponse]


class EmbeddingResponse(BaseApiResponse):
    filename: str
    document: DocumentMetadataResponse | None
    total_chunks_processed: int
    embedding_model: str
    embedding_dimensions: int


class VectorStoreResponse(BaseApiResponse):
    document: DocumentMetadataResponse | None
    total_chunks_stored: int
    collection_name: str
    document_id: str
    document_filename: str
    original_filename: str


class DeleteDocumentResponse(BaseApiResponse):
    document_id: str
    original_filename: str
    stored_filename: str
    deleted_pdf: bool
    deleted_vectors: int


def serialize_document(document: dict) -> dict:
    chunks_count = count_document_vectors(
        settings.chroma_path,
        settings.chroma_collection_name,
        document["document_id"],
    )

    return {
        "document_id": document["document_id"],
        "original_filename": document["original_filename"],
        "stored_filename": document["stored_filename"],
        "uploaded_at": document["uploaded_at"],
        "status": {
            "text_extracted": document.get("text_extracted", False),
            "chunks_created": document.get("chunks_created", False),
            "embeddings_generated": document.get("embeddings_generated", False),
            "stored_in_vector_db": document.get("stored_in_vector_db", False),
        },
        "chunks_count": chunks_count,
    }


def delete_uploaded_pdf_file(stored_filename: str) -> bool:
    upload_dir = settings.upload_path.resolve()
    pdf_path = (settings.upload_path / stored_filename).resolve()

    if upload_dir not in pdf_path.parents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid stored filename.",
        )

    if not pdf_path.exists():
        return False

    pdf_path.unlink()
    return True


@router.get("", response_model=DocumentListResponse)
def list_uploaded_documents() -> dict:
    documents = load_documents(settings.document_metadata_path)

    return {
        "status": "success",
        "message": "Documents loaded successfully",
        "total_documents": len(documents),
        "documents": [serialize_document(document) for document in documents],
    }


@router.delete("/{document_id}", response_model=DeleteDocumentResponse)
def delete_uploaded_document(document_id: str) -> dict:
    document = get_document_by_id(settings.document_metadata_path, document_id)

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document was not found.",
        )

    deleted_vectors = delete_document_vectors(
        settings.chroma_path,
        settings.chroma_collection_name,
        document["document_id"],
    )
    deleted_pdf = delete_uploaded_pdf_file(document["stored_filename"])
    remove_document_by_id(settings.document_metadata_path, document_id)

    return {
        "status": "success",
        "message": "Document removed successfully",
        "document_id": document["document_id"],
        "original_filename": document["original_filename"],
        "stored_filename": document["stored_filename"],
        "deleted_pdf": deleted_pdf,
        "deleted_vectors": deleted_vectors,
    }


@router.post("", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)) -> dict:
    upload_result = await save_uploaded_pdf(file, settings.upload_path)
    document = create_document_metadata(
        metadata_path=settings.document_metadata_path,
        document_id=upload_result["document_id"],
        original_filename=upload_result["original_filename"],
        stored_filename=upload_result["stored_filename"],
    )

    return {
        "status": "success",
        "message": "PDF uploaded successfully",
        "document_id": document.document_id,
        "filename": document.stored_filename,
        "original_filename": document.original_filename,
        "document": serialize_document(document.__dict__),
    }


@router.post("/multiple", response_model=MultipleUploadResponse)
async def upload_multiple_pdfs(files: list[UploadFile] = File(...)) -> dict:
    uploaded_documents = []

    for file in files:
        upload_result = await save_uploaded_pdf(file, settings.upload_path)
        document = create_document_metadata(
            metadata_path=settings.document_metadata_path,
            document_id=upload_result["document_id"],
            original_filename=upload_result["original_filename"],
            stored_filename=upload_result["stored_filename"],
        )
        uploaded_documents.append(serialize_document(document.__dict__))

    return {
        "status": "success",
        "message": "PDFs uploaded successfully",
        "total_documents": len(uploaded_documents),
        "documents": uploaded_documents,
    }


@router.post("/{filename}/extract", response_model=ExtractionResponse)
def extract_pdf_text(filename: str) -> dict:
    extracted_text = extract_text_from_pdf(settings.upload_path, filename)
    document = mark_document_status(filename, text_extracted=True)

    return {
        "status": "success",
        "message": "Text extracted successfully",
        "filename": filename,
        "document": serialize_document(document) if document else None,
        "text": extracted_text,
        "character_count": len(extracted_text),
    }


@router.post("/{filename}/chunks", response_model=ChunkingResponse)
def create_pdf_chunks(filename: str) -> dict:
    chunks = get_chunks_for_uploaded_pdf(filename)
    document = mark_document_status(filename, chunks_created=True)

    return {
        "status": "success",
        "message": "Text chunks created successfully",
        "filename": filename,
        "document": serialize_document(document) if document else None,
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


@router.post("/{filename}/embeddings", response_model=EmbeddingResponse)
def create_pdf_embeddings(filename: str) -> dict:
    try:
        embedding_result = generate_embeddings_for_uploaded_pdf(filename)
        document = mark_document_status(filename, embeddings_generated=True)

        return {
            "status": "success",
            "message": "Embeddings generated successfully",
            "filename": filename,
            "document": serialize_document(document) if document else None,
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


@router.post("/{filename}/vector-store", response_model=VectorStoreResponse)
def store_pdf_chunks_in_vector_database(filename: str) -> dict:
    storage_result = store_uploaded_pdf_in_vector_database(filename)
    document = mark_document_status(filename, stored_in_vector_db=True)

    return {
        "status": "success",
        "message": "Chunks stored in vector database successfully",
        "document": serialize_document(document) if document else None,
        **storage_result,
    }
