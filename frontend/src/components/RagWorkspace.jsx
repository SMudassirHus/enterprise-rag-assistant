import { useState } from "react";

import LoadingButton from "./LoadingButton.jsx";
import StatusAlert from "./StatusAlert.jsx";
import { generateAnswer } from "../services/answerApi.js";
import { generatePdfChunks } from "../services/chunkApi.js";
import { generatePdfEmbeddings } from "../services/embeddingApi.js";
import { extractPdfText } from "../services/extractionApi.js";
import { uploadPdf } from "../services/uploadApi.js";
import { storePdfInVectorDatabase } from "../services/vectorStoreApi.js";

const pipelineSteps = [
  { action: "upload", key: "uploaded", label: "PDF uploaded" },
  { action: "extract", key: "extracted", label: "Text extracted" },
  { action: "chunks", key: "chunked", label: "Chunks created" },
  { action: "embeddings", key: "embedded", label: "Embeddings generated" },
  { action: "store", key: "stored", label: "Stored in ChromaDB" },
];

function formatScore(score) {
  if (score === null || score === undefined) {
    return "Not available";
  }

  return score.toFixed(4);
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function PipelineStatus({ loadingAction, status }) {
  return (
    <div className="space-y-3">
      {pipelineSteps.map((step) => {
        const isComplete = Boolean(status[step.key]);
        const isCurrent = loadingAction === step.action;
        const label = isCurrent ? "Running" : isComplete ? "Done" : "Pending";
        const statusClass = isCurrent
          ? "bg-blue-50 text-blue-700"
          : isComplete
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-100 text-slate-500";

        return (
          <div
            className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-white px-3 py-2"
            key={step.key}
          >
            <span className="text-sm font-medium text-slate-700">
              {step.label}
            </span>
            <span
              className={`rounded-md px-2 py-1 text-xs font-semibold ${statusClass}`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SourceChunks({ sources }) {
  if (!sources?.length) {
    return null;
  }

  return (
    <details className="rounded-md border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-900">
        Source chunks used ({sources.length})
      </summary>

      <div className="mt-4 space-y-3">
        {sources.map((source, index) => (
          <article
            className="rounded-md border border-slate-200 bg-slate-50 p-4"
            key={`${source.document_filename}-${source.chunk_index}-${index}`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Chunk {source.chunk_index ?? "Unknown"}
                </h4>
                <p className="mt-1 break-all font-mono text-xs text-slate-500">
                  {source.document_filename}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Relevance {formatScore(source.relevance_score)}
              </p>
            </div>
            <p className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
              {source.text}
            </p>
          </article>
        ))}
      </div>
    </details>
  );
}

function RagWorkspace() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentName, setDocumentName] = useState("");
  const [storedFilename, setStoredFilename] = useState("");
  const [question, setQuestion] = useState("");
  const [answerResult, setAnswerResult] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [pipelineStatus, setPipelineStatus] = useState({
    uploaded: false,
    extracted: false,
    chunked: false,
    embedded: false,
    stored: false,
  });
  const [summary, setSummary] = useState({
    characterCount: null,
    totalChunks: null,
    embeddingDimensions: null,
    collectionName: "",
  });
  const [loadingAction, setLoadingAction] = useState("");

  const isBusy = Boolean(loadingAction);

  function resetWorkflow(file) {
    setSelectedFile(file);
    setDocumentName(file?.name ?? "");
    setStoredFilename("");
    setQuestion("");
    setAnswerResult(null);
    setStatusMessage("");
    setErrorMessage("");
    setPipelineStatus({
      uploaded: false,
      extracted: false,
      chunked: false,
      embedded: false,
      stored: false,
    });
    setSummary({
      characterCount: null,
      totalChunks: null,
      embeddingDimensions: null,
      collectionName: "",
    });
  }

  function handleFileChange(event) {
    resetWorkflow(event.target.files[0] ?? null);
  }

  async function runAction(actionName, action) {
    setErrorMessage("");
    setStatusMessage("");
    setLoadingAction(actionName);

    try {
      await action();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoadingAction("");
    }
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!selectedFile) {
      setErrorMessage("Select a PDF before uploading.");
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setErrorMessage("Only PDF files can be uploaded.");
      return;
    }

    await runAction("upload", async () => {
      const result = await uploadPdf(selectedFile);
      setStoredFilename(result.filename);
      setPipelineStatus((current) => ({ ...current, uploaded: true }));
      setStatusMessage("PDF uploaded successfully.");
    });
  }

  async function handleExtractText() {
    setAnswerResult(null);
    await runAction("extract", async () => {
      const result = await extractPdfText(storedFilename);
      setPipelineStatus((current) => ({ ...current, extracted: true }));
      setSummary((current) => ({
        ...current,
        characterCount: result.character_count,
      }));
      setStatusMessage("Text extracted successfully.");
    });
  }

  async function handleCreateChunks() {
    setAnswerResult(null);
    await runAction("chunks", async () => {
      const result = await generatePdfChunks(storedFilename);
      setPipelineStatus((current) => ({ ...current, chunked: true }));
      setSummary((current) => ({ ...current, totalChunks: result.total_chunks }));
      setStatusMessage("Chunks created successfully.");
    });
  }

  async function handleGenerateEmbeddings() {
    setAnswerResult(null);
    await runAction("embeddings", async () => {
      const result = await generatePdfEmbeddings(storedFilename);
      setPipelineStatus((current) => ({ ...current, embedded: true }));
      setSummary((current) => ({
        ...current,
        embeddingDimensions: result.embedding_dimensions,
      }));
      setStatusMessage("Embeddings generated successfully.");
    });
  }

  async function handleStoreInVectorDatabase() {
    setAnswerResult(null);
    await runAction("store", async () => {
      const result = await storePdfInVectorDatabase(storedFilename);
      setPipelineStatus((current) => ({ ...current, stored: true }));
      setSummary((current) => ({
        ...current,
        collectionName: result.collection_name,
        totalChunks: result.total_chunks_stored,
      }));
      setStatusMessage("Document stored in ChromaDB successfully.");
    });
  }

  async function handleAskQuestion(event) {
    event.preventDefault();

    if (!question.trim()) {
      setErrorMessage("Type a question before asking the assistant.");
      return;
    }

    await runAction("answer", async () => {
      const result = await generateAnswer(question);
      setAnswerResult(result);
      setStatusMessage("Answer generated from retrieved document context.");
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(280px,360px)_1fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase text-blue-700">
            Document pipeline
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">
            Prepare a PDF for RAG
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Upload a PDF, process it into chunks, embed it, and store it in the
            local vector database.
          </p>
        </div>

        <form className="mt-5 space-y-3" onSubmit={handleUpload}>
          <label
            className="block text-sm font-medium text-slate-700"
            htmlFor="rag-pdf-file"
          >
            PDF file
          </label>
          <input
            accept="application/pdf"
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
            id="rag-pdf-file"
            onChange={handleFileChange}
            type="file"
          />
          <button
            className="w-full rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isBusy || !selectedFile}
            type="submit"
          >
            {loadingAction === "upload" ? "Uploading..." : "Upload PDF"}
          </button>
        </form>

        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">Current document</p>
          <p className="mt-1 break-all font-mono text-sm text-slate-800">
            {documentName || "No PDF selected"}
          </p>
          {storedFilename && (
            <p className="mt-2 break-all text-xs text-slate-500">
              Stored as {storedFilename}
            </p>
          )}
        </div>

        <div className="mt-5">
          <PipelineStatus loadingAction={loadingAction} status={pipelineStatus} />
        </div>

        <div className="mt-5 grid gap-2">
          <LoadingButton
            className="bg-slate-900 text-white hover:bg-slate-800"
            disabled={isBusy || !pipelineStatus.uploaded}
            isLoading={loadingAction === "extract"}
            loadingLabel="Extracting..."
            onClick={handleExtractText}
            type="button"
          >
            Extract Text
          </LoadingButton>
          <LoadingButton
            className="bg-slate-900 text-white hover:bg-slate-800"
            disabled={isBusy || !pipelineStatus.extracted}
            isLoading={loadingAction === "chunks"}
            loadingLabel="Creating..."
            onClick={handleCreateChunks}
            type="button"
          >
            Create Chunks
          </LoadingButton>
          <LoadingButton
            className="bg-slate-900 text-white hover:bg-slate-800"
            disabled={isBusy || !pipelineStatus.chunked}
            isLoading={loadingAction === "embeddings"}
            loadingLabel="Generating..."
            onClick={handleGenerateEmbeddings}
            type="button"
          >
            Generate Embeddings
          </LoadingButton>
          <LoadingButton
            className="bg-blue-700 text-white hover:bg-blue-800"
            disabled={isBusy || !pipelineStatus.embedded}
            isLoading={loadingAction === "store"}
            loadingLabel="Storing..."
            onClick={handleStoreInVectorDatabase}
            type="button"
          >
            Store in Vector Database
          </LoadingButton>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md bg-slate-50 p-3">
            <dt className="font-medium text-slate-500">Characters</dt>
            <dd className="mt-1 text-slate-900">
              {summary.characterCount ?? "-"}
            </dd>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <dt className="font-medium text-slate-500">Chunks</dt>
            <dd className="mt-1 text-slate-900">{summary.totalChunks ?? "-"}</dd>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <dt className="font-medium text-slate-500">Dimensions</dt>
            <dd className="mt-1 text-slate-900">
              {summary.embeddingDimensions ?? "-"}
            </dd>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <dt className="font-medium text-slate-500">Collection</dt>
            <dd className="mt-1 break-all text-slate-900">
              {summary.collectionName || "-"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-700">
              Grounded chat
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">
              Ask your document
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Answers are generated from retrieved ChromaDB chunks only.
            </p>
          </div>
          <span
            className={`w-fit rounded-md px-3 py-2 text-xs font-semibold ${
              pipelineStatus.stored
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {pipelineStatus.stored ? "Ready to ask" : "Store vectors first"}
          </span>
        </div>

        <div className="mt-5 min-h-72 rounded-lg border border-slate-200 bg-slate-50 p-4">
          {!answerResult && (
            <div className="flex min-h-56 items-center justify-center text-center">
              <div className="max-w-md">
                <p className="text-sm font-medium text-slate-700">
                  No answer yet
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Once the document is stored in ChromaDB, ask a question and
                  the assistant will answer with source chunks attached.
                </p>
              </div>
            </div>
          )}

          {answerResult && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <div className="max-w-2xl rounded-lg bg-blue-700 px-4 py-3 text-sm leading-6 text-white">
                  {answerResult.question}
                </div>
              </div>
              <div className="max-w-3xl rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <p className="text-sm font-semibold text-slate-900">
                    Assistant
                  </p>
                  <p className="break-all font-mono text-xs text-slate-500">
                    {answerResult.model}
                  </p>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {answerResult.answer}
                </p>
              </div>
              <SourceChunks sources={answerResult.sources} />
            </div>
          )}
        </div>

        <form className="mt-5 space-y-3" onSubmit={handleAskQuestion}>
          <label
            className="block text-sm font-medium text-slate-700"
            htmlFor="rag-question"
          >
            Question
          </label>
          <textarea
            className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            disabled={isBusy || !pipelineStatus.stored}
            id="rag-question"
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask a question about the uploaded document..."
            value={question}
          />
          <LoadingButton
            className="w-full bg-slate-900 text-white hover:bg-slate-800 sm:w-auto"
            disabled={isBusy || !pipelineStatus.stored}
            isLoading={loadingAction === "answer"}
            loadingLabel="Generating answer..."
            type="submit"
          >
            Ask
          </LoadingButton>
        </form>

        <div className="mt-4 space-y-3">
          <StatusAlert message={statusMessage} />
          <StatusAlert message={errorMessage} type="error" />
        </div>
      </section>
    </div>
  );
}

export default RagWorkspace;
