# Enterprise RAG Assistant

A production-style full-stack starter for an Enterprise RAG Assistant.

This project is being built step-by-step. The current version includes:

- Frontend/backend health check
- PDF upload
- PDF text extraction
- Text chunking
- OpenAI embedding generation
- Local ChromaDB vector storage
- Semantic retrieval from stored chunks

AI answer generation and chat history will be added later.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS
- Backend: FastAPI
- AI: OpenAI API and OpenAI Embeddings API
- Vector database: ChromaDB

## Project Structure

```text
enterprise-rag-assistant/
├── backend/
│   ├── app/
│   │   ├── api/routes/
│   │   │   ├── health.py
│   │   │   ├── retrieval.py
│   │   │   └── uploads.py
│   │   ├── core/
│   │   │   └── config.py
│   │   ├── services/
│   │   │   ├── embedding_service.py
│   │   │   ├── pdf_extraction_service.py
│   │   │   ├── retrieval_service.py
│   │   │   ├── text_chunking_service.py
│   │   │   ├── upload_service.py
│   │   │   └── vector_store_service.py
│   │   └── main.py
│   ├── chroma/
│   │   └── .gitkeep
│   ├── uploads/
│   │   └── .gitkeep
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BackendStatus.jsx
│   │   │   ├── ChunkPreview.jsx
│   │   │   ├── EmbeddingStatus.jsx
│   │   │   ├── ExtractedTextPreview.jsx
│   │   │   ├── PdfUploadForm.jsx
│   │   │   ├── RetrievalSearch.jsx
│   │   │   └── VectorStoreStatus.jsx
│   │   ├── services/
│   │   │   ├── chunkApi.js
│   │   │   ├── embeddingApi.js
│   │   │   ├── extractionApi.js
│   │   │   ├── healthApi.js
│   │   │   ├── retrievalApi.js
│   │   │   ├── uploadApi.js
│   │   │   └── vectorStoreApi.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles/index.css
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

## Backend Setup

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

```bash
# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create your local environment file:

```bash
copy .env.example .env
```

Add your OpenAI key to `backend/.env`:

```env
OPENAI_API_KEY="your_real_openai_api_key"
```

Run the API:

```bash
uvicorn app.main:app --reload
```

Useful backend URLs:

- API root: http://localhost:8000
- Health check: http://localhost:8000/api/health
- API docs: http://localhost:8000/docs

## Frontend Setup

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

If PowerShell blocks `npm.ps1`, use:

```bash
npm.cmd install
npm.cmd run dev
```

Open the app at:

```text
http://localhost:5173
```

## Environment Variables

Backend configuration lives in `backend/.env`:

```env
APP_NAME="Enterprise RAG Assistant API"
APP_ENV="development"
API_PREFIX="/api"
BACKEND_CORS_ORIGINS="http://localhost:5173"
UPLOAD_DIR="uploads"
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
OPENAI_API_KEY="your_real_openai_api_key"
EMBEDDING_MODEL="text-embedding-3-small"
CHROMA_DB_DIR="chroma"
CHROMA_COLLECTION_NAME="enterprise_documents"
RETRIEVAL_TOP_K=3
```

Do not commit `.env`. It is ignored by Git.

## API Flow

The current pipeline is:

1. Upload PDF: `POST /api/uploads`
2. Extract text: `POST /api/uploads/{filename}/extract`
3. Generate chunks: `POST /api/uploads/{filename}/chunks`
4. Generate embeddings: `POST /api/uploads/{filename}/embeddings`
5. Store vectors: `POST /api/uploads/{filename}/vector-store`
6. Search documents: `POST /api/retrieval/search`

## ChromaDB Storage

ChromaDB stores each chunk with:

- chunk text as the Chroma document
- OpenAI embedding vector
- chunk index
- document filename
- character count
- embedding model

With the default commands in this README, local Chroma data is saved under:

```text
backend/chroma/
```

The generated Chroma files are ignored by Git. Only `.gitkeep` is committed.

The vector storage endpoint returns:

```json
{
  "status": "success",
  "message": "Chunks stored in vector database successfully",
  "total_chunks_stored": 3,
  "collection_name": "enterprise_documents",
  "document_filename": "stored_filename.pdf"
}
```

Stored vectors are queried by the semantic retrieval endpoint.

## Semantic Retrieval

Semantic retrieval accepts a user question, generates an OpenAI embedding for
that question, and asks ChromaDB for the closest stored chunk embeddings.

The retrieval endpoint accepts:

```json
{
  "question": "What does the document say about onboarding?",
  "top_k": 3
}
```

`top_k` is optional. If omitted, the backend uses `RETRIEVAL_TOP_K`.

The retrieval endpoint returns:

```json
{
  "status": "success",
  "message": "Relevant chunks retrieved successfully",
  "question": "What does the document say about onboarding?",
  "collection_name": "enterprise_documents",
  "total_matches": 3,
  "matches": [
    {
      "text": "Matching chunk text...",
      "chunk_index": 1,
      "document_filename": "stored_filename.pdf",
      "relevance_score": 0.82,
      "distance": 0.21
    }
  ]
}
```

The frontend displays the retrieved chunks only. It does not generate final AI
answers yet.
