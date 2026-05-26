import logging
from pathlib import Path

from fastapi import HTTPException, status
from pypdf import PdfReader

logger = logging.getLogger(__name__)


def get_pdf_path(upload_dir: Path, filename: str) -> Path:
    safe_filename = Path(filename).name
    pdf_path = upload_dir / safe_filename

    if safe_filename != filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename.",
        )

    if not pdf_path.exists() or not pdf_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uploaded PDF was not found.",
        )

    if pdf_path.suffix.lower() != ".pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files can be extracted.",
        )

    return pdf_path


def extract_text_from_pdf(upload_dir: Path, filename: str) -> str:
    pdf_path = get_pdf_path(upload_dir, filename)

    try:
        reader = PdfReader(str(pdf_path))
        page_texts = []

        for page_number, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            if text.strip():
                page_texts.append(text.strip())
            else:
                logger.info("No extractable text found on page %s", page_number)

        extracted_text = "\n\n".join(page_texts).strip()
    except Exception as exc:
        logger.exception("Failed to extract text from PDF: %s", pdf_path.name)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not extract text from the PDF.",
        ) from exc

    if not extracted_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No extractable text found in the PDF.",
        )

    return extracted_text
