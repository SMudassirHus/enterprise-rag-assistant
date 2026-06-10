# Atlas AI

A production-style full-stack Enterprise Knowledge Assistant with document upload, indexing, semantic retrieval, grounded AI answers, Supabase authentication, and user-specific document ownership.

This project is being built step-by-step. The current version includes:

- Frontend/backend health check
- PDF upload
- PDF text extraction
- Text chunking
- OpenAI embedding generation
- Local ChromaDB vector storage
- Semantic retrieval from stored chunks
- Grounded AI answer generation
- Streaming chat responses
- Source citations
- Browser-local chat history
- Supabase email/password authentication
- User-specific document ownership and retrieval isolation

## Tech Stack

- Frontend: React, Vite, Tailwind CSS
- Backend: FastAPI
- AI: OpenAI API and OpenAI Embeddings API
- Vector database: ChromaDB

## Project Structure

```text
enterprise-rag-assistant/
|-- backend/
|   |-- app/
|   |   |-- api/routes/
|   |   |   |-- chat.py
|   |   |   |-- health.py
|   |   |   |-- retrieval.py
|   |   |   `-- uploads.py
|   |   |-- core/
|   |   |   |-- auth.py
|   |   |   `-- config.py
|   |   |-- services/
|   |   |   |-- answer_service.py
|   |   |   |-- embedding_service.py
|   |   |   |-- pdf_extraction_service.py
|   |   |   |-- retrieval_service.py
|   |   |   |-- text_chunking_service.py
|   |   |   |-- upload_service.py
|   |   |   `-- vector_store_service.py
|   |   `-- main.py
|   |-- chroma/
|   |   `-- .gitkeep
|   |-- uploads/
|   |   `-- .gitkeep
|   |-- .env.example
|   `-- requirements.txt
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |   |-- AtlasLogo.jsx
|   |   |   |-- AuthScreen.jsx
|   |   |   |-- BackendStatus.jsx
|   |   |   |-- RagWorkspace.jsx
|   |   |   `-- Toast.jsx
|   |   |-- services/
|   |   |   |-- answerApi.js
|   |   |   |-- chunkApi.js
|   |   |   |-- embeddingApi.js
|   |   |   |-- extractionApi.js
|   |   |   |-- healthApi.js
|   |   |   |-- retrievalApi.js
|   |   |   |-- uploadApi.js
|   |   |   `-- vectorStoreApi.js
|   |   |-- App.jsx
|   |   |-- main.jsx
|   |   `-- styles/index.css
|   |-- .env.example
|   `-- package.json
|-- .gitignore
|-- DEPLOYMENT.md
|-- render.yaml
`-- README.md
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

Add your backend environment variables to `backend/.env`:

```env
OPENAI_API_KEY="your_real_openai_api_key"
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
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
CHAT_MODEL="gpt-4o-mini"
CHROMA_DB_DIR="chroma"
CHROMA_COLLECTION_NAME="enterprise_documents"
RETRIEVAL_TOP_K=3
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
```

Frontend configuration lives in `frontend/.env`:

```env
VITE_API_BASE_URL="http://localhost:8000"
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
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
7. Generate grounded answer: `POST /api/chat/answer`
8. Stream grounded answer: `POST /api/chat/answer/stream`

Document, retrieval, and chat routes require a Supabase bearer token from the authenticated frontend session.

## ChromaDB Storage

ChromaDB stores each chunk with:

- chunk text as the Chroma document
- OpenAI embedding vector
- chunk index
- document filename
- character count
- embedding model
- Supabase user id

With the default commands in this README, local Chroma data is saved under:

```text
backend/chroma/
```

The generated Chroma files are ignored by Git. Only `.gitkeep` is committed.

## User-Specific Ownership

Each uploaded document is associated with the authenticated Supabase `user_id`.

The backend enforces ownership by:

- validating the Supabase access token
- storing `user_id` in local document metadata
- storing `user_id` in ChromaDB chunk metadata
- filtering retrieval by `user_id`
- checking ownership before processing or deleting documents

## Deployment

Deployment targets:

- Frontend: Vercel
- Backend: Render

See [DEPLOYMENT.md](DEPLOYMENT.md) for Render/Vercel setup, environment variables, CORS configuration, and persistent disk notes.

## Semantic Retrieval

Semantic retrieval accepts a user question, generates an OpenAI embedding for
that question, and asks ChromaDB for the closest stored chunk embeddings.

Example request:

```json
{
  "question": "What does the document say about onboarding?",
  "top_k": 3
}
```

## Grounded Answer Generation

The answer endpoint accepts a user question, retrieves relevant chunks from
ChromaDB, and sends only those chunks plus the question to the OpenAI model.

The model is instructed to answer only from the retrieved context. If the answer
is not present, it should respond exactly:

```text
I could not find this information in the uploaded document.
```

Example response:

```json
{
  "status": "success",
  "message": "Answer generated successfully",
  "question": "What does the document say about onboarding?",
  "answer": "The document says...",
  "model": "gpt-5.2",
  "sources": [
    {
      "text": "Source chunk text...",
      "chunk_index": 1,
      "document_filename": "stored_filename.pdf",
      "relevance_score": 0.82,
      "distance": 0.21
    }
  ]
}
```
