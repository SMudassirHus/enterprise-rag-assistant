import { useState } from "react";

import ChunkPreview from "./ChunkPreview.jsx";
import EmbeddingStatus from "./EmbeddingStatus.jsx";
import ExtractedTextPreview from "./ExtractedTextPreview.jsx";
import VectorStoreStatus from "./VectorStoreStatus.jsx";
import { generatePdfChunks } from "../services/chunkApi.js";
import { generatePdfEmbeddings } from "../services/embeddingApi.js";
import { extractPdfText } from "../services/extractionApi.js";
import { uploadPdf } from "../services/uploadApi.js";
import { storePdfInVectorDatabase } from "../services/vectorStoreApi.js";

function PdfUploadForm() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedFilename, setUploadedFilename] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isChunking, setIsChunking] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [isStoring, setIsStoring] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [chunkResult, setChunkResult] = useState(null);
  const [embeddingResult, setEmbeddingResult] = useState(null);
  const [vectorStoreResult, setVectorStoreResult] = useState(null);

  function handleFileChange(event) {
    setSelectedFile(event.target.files[0] ?? null);
    setUploadedFilename("");
    setSuccessMessage("");
    setErrorMessage("");
    setExtractedText("");
    setChunkResult(null);
    setEmbeddingResult(null);
    setVectorStoreResult(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");
    setExtractedText("");
    setChunkResult(null);
    setEmbeddingResult(null);
    setVectorStoreResult(null);

    if (!selectedFile) {
      setErrorMessage("Please select a PDF file before uploading.");
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setErrorMessage("Only PDF files can be uploaded.");
      return;
    }

    try {
      setIsUploading(true);
      const result = await uploadPdf(selectedFile);
      setSuccessMessage(`Upload successful: ${result.filename}`);
      setUploadedFilename(result.filename);
      setSelectedFile(null);
      event.target.reset();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleExtractText() {
    setSuccessMessage("");
    setErrorMessage("");
    setExtractedText("");
    setChunkResult(null);
    setEmbeddingResult(null);
    setVectorStoreResult(null);

    if (!uploadedFilename) {
      setErrorMessage("Upload a PDF before extracting text.");
      return;
    }

    try {
      setIsExtracting(true);
      const result = await extractPdfText(uploadedFilename);
      setExtractedText(result.text);
      setSuccessMessage(result.message);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleGenerateChunks() {
    setSuccessMessage("");
    setErrorMessage("");
    setChunkResult(null);
    setEmbeddingResult(null);
    setVectorStoreResult(null);

    if (!uploadedFilename || !extractedText) {
      setErrorMessage("Extract text before generating chunks.");
      return;
    }

    try {
      setIsChunking(true);
      const result = await generatePdfChunks(uploadedFilename);
      setChunkResult(result);
      setSuccessMessage(result.message);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsChunking(false);
    }
  }

  async function handleGenerateEmbeddings() {
    setSuccessMessage("");
    setErrorMessage("");
    setEmbeddingResult(null);
    setVectorStoreResult(null);

    if (!uploadedFilename || !chunkResult?.chunks?.length) {
      setErrorMessage("Generate chunks before creating embeddings.");
      return;
    }

    try {
      setIsEmbedding(true);
      const result = await generatePdfEmbeddings(uploadedFilename);
      setEmbeddingResult(result);
      setSuccessMessage(result.message);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsEmbedding(false);
    }
  }

  async function handleStoreInVectorDatabase() {
    setSuccessMessage("");
    setErrorMessage("");
    setVectorStoreResult(null);

    if (!uploadedFilename || !embeddingResult) {
      setErrorMessage("Generate embeddings before storing vectors.");
      return;
    }

    try {
      setIsStoring(true);
      const result = await storePdfInVectorDatabase(uploadedFilename);
      setVectorStoreResult(result);
      setSuccessMessage(result.message);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsStoring(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-950">
          Upload PDF
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Select a PDF document and send it to the FastAPI backend.
        </p>
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label
            className="block text-sm font-medium text-slate-700"
            htmlFor="pdf-file"
          >
            PDF file
          </label>
          <input
            accept="application/pdf"
            className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
            id="pdf-file"
            name="file"
            onChange={handleFileChange}
            type="file"
          />
        </div>

        <button
          className="inline-flex items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={isUploading}
          type="submit"
        >
          {isUploading ? "Uploading..." : "Upload PDF"}
        </button>
      </form>

      {uploadedFilename && (
        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">Uploaded file</p>
          <p className="mt-1 break-all font-mono text-sm text-slate-800">
            {uploadedFilename}
          </p>

          <button
            className="mt-4 inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isExtracting}
            onClick={handleExtractText}
            type="button"
          >
            {isExtracting ? "Extracting..." : "Extract Text"}
          </button>
        </div>
      )}

      {successMessage && (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </p>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMessage}
        </p>
      )}

      <ExtractedTextPreview text={extractedText} />

      {extractedText && (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">
            Ready for chunking
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Generate overlapping text chunks from the extracted PDF text.
          </p>

          <button
            className="mt-4 inline-flex items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isChunking}
            onClick={handleGenerateChunks}
            type="button"
          >
            {isChunking ? "Generating..." : "Generate Chunks"}
          </button>
        </div>
      )}

      <ChunkPreview
        chunks={chunkResult?.chunks ?? []}
        chunkOverlap={chunkResult?.chunk_overlap}
        chunkSize={chunkResult?.chunk_size}
        totalChunks={chunkResult?.total_chunks}
      />

      {chunkResult?.chunks?.length > 0 && (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">
            Ready for embeddings
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Generate OpenAI embeddings for the current text chunks.
          </p>

          <button
            className="mt-4 inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isEmbedding}
            onClick={handleGenerateEmbeddings}
            type="button"
          >
            {isEmbedding ? "Generating..." : "Generate Embeddings"}
          </button>
        </div>
      )}

      <EmbeddingStatus result={embeddingResult} />

      {embeddingResult && (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">
            Ready for vector storage
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Store the embedded chunks in the local ChromaDB collection.
          </p>

          <button
            className="mt-4 inline-flex items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isStoring}
            onClick={handleStoreInVectorDatabase}
            type="button"
          >
            {isStoring ? "Storing..." : "Store in Vector Database"}
          </button>
        </div>
      )}

      <VectorStoreStatus result={vectorStoreResult} />
    </section>
  );
}

export default PdfUploadForm;
