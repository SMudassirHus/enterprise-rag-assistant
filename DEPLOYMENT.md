# Atlas AI Deployment Guide

This guide prepares Atlas AI for deployment without changing the local development flow.

Deployment targets:

- Frontend: Vercel
- Backend: Render

## Backend: Render

Create a Render Web Service for the `backend` directory.

Build command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Render can also use the root `render.yaml` blueprint.

## Backend Environment Variables

Required on Render:

```env
APP_ENV="production"
API_PREFIX="/api"
OPENAI_API_KEY="your_openai_api_key"
EMBEDDING_MODEL="text-embedding-3-small"
CHAT_MODEL="gpt-4o-mini"
CHROMA_DB_DIR="/var/data/chroma"
CHROMA_COLLECTION_NAME="enterprise_documents"
RETRIEVAL_TOP_K=3
UPLOAD_DIR="/var/data/uploads"
DOCUMENT_METADATA_FILE="/var/data/uploads/documents.json"
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
BACKEND_CORS_ORIGINS="https://your-vercel-app.vercel.app"
```

Use a comma-separated list for multiple frontend origins:

```env
BACKEND_CORS_ORIGINS="http://localhost:5173,https://your-vercel-app.vercel.app"
```

## Render Persistent Disk

Atlas AI currently stores uploaded PDFs, document metadata, and ChromaDB data locally.

For production on Render, attach a persistent disk and use paths like:

```env
UPLOAD_DIR="/var/data/uploads"
DOCUMENT_METADATA_FILE="/var/data/uploads/documents.json"
CHROMA_DB_DIR="/var/data/chroma"
```

Without a persistent disk, uploaded documents and indexed vectors may be lost when the Render service restarts or redeploys.

## Frontend: Vercel

Create a Vercel project for the `frontend` directory.

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

## Frontend Environment Variables

Required on Vercel:

```env
VITE_API_BASE_URL="https://your-render-backend.onrender.com"
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

`VITE_API_BASE_URL` should not include `/api`. The frontend already appends endpoint paths such as `/api/health`.

## Supabase Setup

Use the same Supabase project for frontend and backend.

Frontend uses:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Backend uses:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

The backend validates the user's Supabase access token before allowing document, retrieval, or chat requests.

## Deployment Order

1. Deploy the backend on Render.
2. Copy the Render backend URL.
3. Add that URL as `VITE_API_BASE_URL` in Vercel.
4. Add the deployed Vercel URL to `BACKEND_CORS_ORIGINS` in Render.
5. Redeploy both services after environment variables are set.

## Local Development

Local development still uses:

Backend:

```env
BACKEND_CORS_ORIGINS="http://localhost:5173"
```

Frontend:

```env
VITE_API_BASE_URL="http://localhost:8000"
```
