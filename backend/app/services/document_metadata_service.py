import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path


@dataclass(frozen=True)
class DocumentMetadata:
    document_id: str
    original_filename: str
    stored_filename: str
    uploaded_at: str
    text_extracted: bool = False
    chunks_created: bool = False
    embeddings_generated: bool = False
    stored_in_vector_db: bool = False


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def load_documents(metadata_path: Path) -> list[dict]:
    if not metadata_path.exists():
        return []

    with metadata_path.open("r", encoding="utf-8") as metadata_file:
        return json.load(metadata_file)


def save_documents(metadata_path: Path, documents: list[dict]) -> None:
    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    with metadata_path.open("w", encoding="utf-8") as metadata_file:
        json.dump(documents, metadata_file, indent=2)


def create_document_metadata(
    metadata_path: Path,
    document_id: str,
    original_filename: str,
    stored_filename: str,
) -> DocumentMetadata:
    document = DocumentMetadata(
        document_id=document_id,
        original_filename=original_filename,
        stored_filename=stored_filename,
        uploaded_at=utc_now(),
    )
    documents = load_documents(metadata_path)
    documents.append(asdict(document))
    save_documents(metadata_path, documents)
    return document


def get_document_by_stored_filename(
    metadata_path: Path,
    stored_filename: str,
) -> dict | None:
    return next(
        (
            document
            for document in load_documents(metadata_path)
            if document["stored_filename"] == stored_filename
        ),
        None,
    )


def update_document_status(
    metadata_path: Path,
    stored_filename: str,
    **status_updates: bool,
) -> dict | None:
    documents = load_documents(metadata_path)
    updated_document = None

    for document in documents:
        if document["stored_filename"] == stored_filename:
            document.update(status_updates)
            updated_document = document
            break

    save_documents(metadata_path, documents)
    return updated_document
