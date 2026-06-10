import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path


@dataclass(frozen=True)
class DocumentMetadata:
    document_id: str
    user_id: str
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
    user_id: str,
    original_filename: str,
    stored_filename: str,
) -> DocumentMetadata:
    document = DocumentMetadata(
        document_id=document_id,
        user_id=user_id,
        original_filename=original_filename,
        stored_filename=stored_filename,
        uploaded_at=utc_now(),
    )
    documents = load_documents(metadata_path)
    documents.append(asdict(document))
    save_documents(metadata_path, documents)
    return document


def get_documents_by_user(metadata_path: Path, user_id: str) -> list[dict]:
    return [
        document
        for document in load_documents(metadata_path)
        if document.get("user_id") == user_id
    ]


def get_document_by_stored_filename(
    metadata_path: Path,
    stored_filename: str,
    user_id: str | None = None,
) -> dict | None:
    return next(
        (
            document
            for document in load_documents(metadata_path)
            if document["stored_filename"] == stored_filename
            and (user_id is None or document.get("user_id") == user_id)
        ),
        None,
    )


def get_document_by_id(
    metadata_path: Path,
    document_id: str,
    user_id: str | None = None,
) -> dict | None:
    return next(
        (
            document
            for document in load_documents(metadata_path)
            if document["document_id"] == document_id
            and (user_id is None or document.get("user_id") == user_id)
        ),
        None,
    )


def remove_document_by_id(
    metadata_path: Path,
    document_id: str,
    user_id: str | None = None,
) -> dict | None:
    documents = load_documents(metadata_path)
    remaining_documents = [
        document
        for document in documents
        if not (
            document["document_id"] == document_id
            and (user_id is None or document.get("user_id") == user_id)
        )
    ]

    if len(remaining_documents) == len(documents):
        return None

    removed_document = next(
        document
        for document in documents
        if document["document_id"] == document_id
        and (user_id is None or document.get("user_id") == user_id)
    )
    save_documents(metadata_path, remaining_documents)
    return removed_document


def update_document_status(
    metadata_path: Path,
    stored_filename: str,
    user_id: str | None = None,
    **status_updates: bool,
) -> dict | None:
    documents = load_documents(metadata_path)
    updated_document = None

    for document in documents:
        if document["stored_filename"] == stored_filename and (
            user_id is None or document.get("user_id") == user_id
        ):
            document.update(status_updates)
            updated_document = document
            break

    save_documents(metadata_path, documents)
    return updated_document
