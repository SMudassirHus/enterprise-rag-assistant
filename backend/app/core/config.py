import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[2]

load_dotenv(BACKEND_DIR / ".env")


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "Enterprise RAG Assistant API")
    app_env: str = os.getenv("APP_ENV", "development")
    api_prefix: str = os.getenv("API_PREFIX", "/api")
    upload_dir: str = os.getenv("UPLOAD_DIR", "uploads")
    document_metadata_file: str = os.getenv(
        "DOCUMENT_METADATA_FILE",
        "uploads/documents.json",
    )
    chunk_size: int = int(os.getenv("CHUNK_SIZE", "1000"))
    chunk_overlap: int = int(os.getenv("CHUNK_OVERLAP", "200"))
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    chat_model: str = os.getenv("CHAT_MODEL", "gpt-5.2")
    chroma_db_dir: str = os.getenv("CHROMA_DB_DIR", "chroma")
    chroma_collection_name: str = os.getenv(
        "CHROMA_COLLECTION_NAME",
        "enterprise_documents",
    )
    retrieval_top_k: int = int(os.getenv("RETRIEVAL_TOP_K", "3"))
    backend_cors_origins: str = os.getenv(
        "BACKEND_CORS_ORIGINS",
        "http://localhost:5173",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.backend_cors_origins.split(",")
            if origin.strip()
        ]

    @property
    def upload_path(self) -> Path:
        return Path(self.upload_dir)

    @property
    def document_metadata_path(self) -> Path:
        return Path(self.document_metadata_file)

    @property
    def chroma_path(self) -> Path:
        return Path(self.chroma_db_dir)

    @property
    def has_openai_api_key(self) -> bool:
        api_key = self.openai_api_key.strip()
        return bool(api_key) and api_key != "your_openai_api_key_here"

    def safe_openai_debug_info(self) -> dict[str, str | bool]:
        return {
            "openai_api_key_loaded": self.has_openai_api_key,
            "embedding_model": self.embedding_model,
            "chat_model": self.chat_model,
        }


settings = Settings()
