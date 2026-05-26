from dataclasses import dataclass

from fastapi import HTTPException, status


@dataclass(frozen=True)
class TextChunk:
    index: int
    text: str
    character_count: int


def validate_chunk_settings(chunk_size: int, chunk_overlap: int) -> None:
    if chunk_size <= 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Chunk size must be greater than zero.",
        )

    if chunk_overlap < 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Chunk overlap cannot be negative.",
        )

    if chunk_overlap >= chunk_size:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Chunk overlap must be smaller than chunk size.",
        )


def normalize_text(text: str) -> str:
    return " ".join(text.split())


def find_chunk_end(text: str, start: int, target_end: int) -> int:
    if target_end >= len(text):
        return len(text)

    # Prefer ending on whitespace so words are not split unnecessarily.
    whitespace_index = text.rfind(" ", start, target_end)
    if whitespace_index > start:
        return whitespace_index

    return target_end


def split_text_into_chunks(
    text: str,
    chunk_size: int,
    chunk_overlap: int,
) -> list[TextChunk]:
    validate_chunk_settings(chunk_size, chunk_overlap)

    cleaned_text = normalize_text(text)
    if not cleaned_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cannot chunk empty text.",
        )

    chunks: list[TextChunk] = []
    start = 0

    while start < len(cleaned_text):
        target_end = start + chunk_size
        end = find_chunk_end(cleaned_text, start, target_end)
        chunk_text = cleaned_text[start:end].strip()

        if chunk_text:
            chunks.append(
                TextChunk(
                    index=len(chunks) + 1,
                    text=chunk_text,
                    character_count=len(chunk_text),
                )
            )

        if end >= len(cleaned_text):
            break

        next_start = max(end - chunk_overlap, start + 1)

        # Move to the next word boundary when possible.
        while next_start < len(cleaned_text) and cleaned_text[next_start] == " ":
            next_start += 1

        start = next_start

    return chunks
