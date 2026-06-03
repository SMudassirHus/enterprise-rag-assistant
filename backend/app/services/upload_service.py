from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

PDF_CONTENT_TYPE = "application/pdf"
PDF_EXTENSION = ".pdf"


def validate_pdf_file(file: UploadFile) -> None:
    filename = file.filename or ""
    has_pdf_extension = Path(filename).suffix.lower() == PDF_EXTENSION
    has_pdf_content_type = file.content_type == PDF_CONTENT_TYPE

    if not has_pdf_extension or not has_pdf_content_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed.",
        )


def build_stored_filename(document_id: str, original_filename: str) -> str:
    safe_name = Path(original_filename).name
    return f"{document_id}_{safe_name}"


async def save_uploaded_pdf(file: UploadFile, upload_dir: Path) -> dict[str, str]:
    validate_pdf_file(file)
    upload_dir.mkdir(parents=True, exist_ok=True)

    document_id = uuid4().hex
    original_filename = Path(file.filename or "document.pdf").name
    stored_filename = build_stored_filename(document_id, original_filename)
    destination = upload_dir / stored_filename

    try:
        contents = await file.read()
        destination.write_bytes(contents)
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save uploaded file.",
        ) from exc
    finally:
        await file.close()

    return {
        "document_id": document_id,
        "original_filename": original_filename,
        "stored_filename": stored_filename,
    }
