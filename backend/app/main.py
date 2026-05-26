import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.chat import router as chat_router
from app.api.routes.health import router as health_router
from app.api.routes.retrieval import router as retrieval_router
from app.api.routes.uploads import router as uploads_router
from app.core.config import settings


def create_app() -> FastAPI:
    logging.basicConfig(level=logging.INFO)

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
    )

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
