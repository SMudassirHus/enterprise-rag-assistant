from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.error_handlers import register_error_handlers
from app.api.routes.chat import router as chat_router
from app.api.routes.health import router as health_router
from app.api.routes.retrieval import router as retrieval_router
from app.api.routes.uploads import router as uploads_router
from app.core.logging import configure_logging
from app.core.config import settings

import logging

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    configure_logging()
    logger.info("OpenAI config loaded: %s", settings.safe_openai_debug_info())

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
    )
    register_error_handlers(app)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(chat_router, prefix=settings.api_prefix)
    app.include_router(health_router, prefix=settings.api_prefix)
    app.include_router(retrieval_router, prefix=settings.api_prefix)
    app.include_router(uploads_router, prefix=settings.api_prefix)

    @app.get("/")
    def root() -> dict[str, str]:
        return {
            "message": "Enterprise RAG Assistant API is running",
            "environment": settings.app_env,
        }

    return app


app = create_app()
