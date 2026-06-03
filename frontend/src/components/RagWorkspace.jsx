import { useEffect, useMemo, useState } from "react";

import LoadingButton from "./LoadingButton.jsx";
import StatusAlert from "./StatusAlert.jsx";
import { streamAnswer } from "../services/answerApi.js";
import { generatePdfChunks } from "../services/chunkApi.js";
import { generatePdfEmbeddings } from "../services/embeddingApi.js";
import { extractPdfText } from "../services/extractionApi.js";
import {
  listUploadedDocuments,
  uploadPdfs,
} from "../services/uploadApi.js";
import { storePdfInVectorDatabase } from "../services/vectorStoreApi.js";

const pipelineSteps = [
  { action: "upload", key: "uploaded", label: "Uploaded" },
  { action: "extract", key: "text_extracted", label: "Extracted" },
  { action: "chunks", key: "chunks_created", label: "Chunked" },
  { action: "embeddings", key: "embeddings_generated", label: "Embedded" },
  { action: "store", key: "stored_in_vector_db", label: "Stored" },
];

function formatScore(score) {
  return score === null || score === undefined ? "N/A" : score.toFixed(4);
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function getDocumentStatus(document) {
  return {
    uploaded: Boolean(document),
    text_extracted: Boolean(document?.status?.text_extracted),
    chunks_created: Boolean(document?.status?.chunks_created),
    embeddings_generated: Boolean(document?.status?.embeddings_generated),
    stored_in_vector_db: Boolean(document?.status?.stored_in_vector_db),
  };
}

function isDocumentReady(document) {
  return getDocumentStatus(document).stored_in_vector_db;
}

function countReadyDocuments(documents) {
  return documents.filter(isDocumentReady).length;
}

function StatusBadge({ children, tone = "slate" }) {
  const tones = {
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
  };

  return (
    <span className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}

function PipelineStatus({ document, loadingAction }) {
  const status = getDocumentStatus(document);

  return (
    <div className="grid grid-cols-5 gap-2">
      {pipelineSteps.map((step) => {
        const isComplete = Boolean(status[step.key]);
        const isRunning = loadingAction === step.action;
        const tone = isRunning ? "blue" : isComplete ? "emerald" : "slate";

        return (
          <div
            className="rounded-md border border-slate-200 bg-white px-2 py-2 text-center"
            key={step.key}
            title={step.label}
          >
            <div
              className={`mx-auto h-2 w-2 rounded-full ${
                tone === "emerald"
                  ? "bg-emerald-500"
                  : tone === "blue"
                    ? "bg-blue-500"
                    : "bg-slate-300"
              }`}
            />
            <p className="mt-2 truncate text-xs font-medium text-slate-600">
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function DocumentList({ documents, onSelect, selectedDocumentId }) {
  if (!documents.length) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
        <p className="text-sm font-medium text-slate-700">No documents yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Upload one or more PDFs to start building the local knowledge base.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((document) => {
        const isSelected = document.document_id === selectedDocumentId;
        const ready = isDocumentReady(document);

        return (
          <button
            className={`w-full rounded-md border px-3 py-3 text-left transition ${
              isSelected
                ? "border-blue-300 bg-blue-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
            key={document.document_id}
            onClick={() => onSelect(document.document_id)}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {document.original_filename}
                </p>
                <p className="mt-1 truncate font-mono text-xs text-slate-500">
                  {document.stored_filename}
                </p>
              </div>
              <StatusBadge tone={ready ? "emerald" : "amber"}>
                {ready ? "Indexed" : "Draft"}
              </StatusBadge>
            </div>
          </button>
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
    <details className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer text-sm font-semibold text-slate-900">
        Source chunks ({sources.length})
      </summary>
      <div className="mt-4 grid gap-3">
        {sources.map((source, index) => (
          <article
            className="rounded-md border border-slate-200 bg-slate-50 p-4"
            key={`${source.document_id}-${source.chunk_index}-${index}`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h4 className="truncate text-sm font-semibold text-slate-900">
                  {source.original_filename ?? source.document_filename}
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Chunk {source.chunk_index ?? "Unknown"}
                </p>
              </div>
              <StatusBadge>Score {formatScore(source.relevance_score)}</StatusBadge>
            </div>
            <p className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
              {source.text}
            </p>
          </article>
        ))}
      </div>
    </details>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold text-slate-900">
        {value ?? "-"}
      </dd>
    </div>
  );
}

function RagWorkspace() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [question, setQuestion] = useState("");
  const [answerResult, setAnswerResult] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState("");
  const [summaryByDocumentId, setSummaryByDocumentId] = useState({});

  const selectedDocument = useMemo(
    () => documents.find((document) => document.document_id === selectedDocumentId),
    [documents, selectedDocumentId],
  );
  const selectedSummary = summaryByDocumentId[selectedDocumentId] ?? {};
  const indexedCount = countReadyDocuments(documents);
  const hasIndexedDocuments = indexedCount > 0;
  const isBusy = Boolean(loadingAction);

  useEffect(() => {
    async function loadDocuments() {
      try {
        const result = await listUploadedDocuments();
        setDocuments(result.documents);
        setSelectedDocumentId((current) => current || result.documents[0]?.document_id || "");
      } catch {
        setDocuments([]);
      }
    }

    loadDocuments();
  }, []);

  function updateDocument(updatedDocument) {
    if (!updatedDocument) {
      return;
    }

    setDocuments((current) =>
      current.map((document) =>
        document.document_id === updatedDocument.document_id
          ? updatedDocument
          : document,
      ),
    );
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

    if (!selectedFiles.length) {
      setErrorMessage("Select one or more PDF files before uploading.");
      return;
    }

    const nonPdf = selectedFiles.find((file) => file.type !== "application/pdf");
    if (nonPdf) {
      setErrorMessage("Only PDF files can be uploaded.");
      return;
    }

    await runAction("upload", async () => {
      const result = await uploadPdfs(selectedFiles);
      setDocuments((current) => [...result.documents, ...current]);
      setSelectedDocumentId(result.documents[0]?.document_id ?? "");
      setSelectedFiles([]);
      event.target.reset();
      setAnswerResult(null);
      setStatusMessage(`${result.total_documents} PDF document(s) uploaded.`);
    });
  }

  async function handleExtractText() {
    await runAction("extract", async () => {
      const result = await extractPdfText(selectedDocument.stored_filename);
      updateDocument(result.document);
      setSummaryByDocumentId((current) => ({
        ...current,
        [selectedDocumentId]: {
          ...current[selectedDocumentId],
          characterCount: result.character_count,
        },
      }));
      setAnswerResult(null);
      setStatusMessage("Text extracted successfully.");
    });
  }

  async function handleCreateChunks() {
    await runAction("chunks", async () => {
      const result = await generatePdfChunks(selectedDocument.stored_filename);
      updateDocument(result.document);
      setSummaryByDocumentId((current) => ({
        ...current,
        [selectedDocumentId]: {
          ...current[selectedDocumentId],
          totalChunks: result.total_chunks,
        },
      }));
      setAnswerResult(null);
      setStatusMessage("Chunks created successfully.");
    });
  }

  async function handleGenerateEmbeddings() {
    await runAction("embeddings", async () => {
      const result = await generatePdfEmbeddings(selectedDocument.stored_filename);
      updateDocument(result.document);
      setSummaryByDocumentId((current) => ({
        ...current,
        [selectedDocumentId]: {
          ...current[selectedDocumentId],
          embeddingDimensions: result.embedding_dimensions,
        },
      }));
      setAnswerResult(null);
      setStatusMessage("Embeddings generated successfully.");
    });
  }

  async function handleStoreInVectorDatabase() {
    await runAction("store", async () => {
      const result = await storePdfInVectorDatabase(selectedDocument.stored_filename);
      updateDocument(result.document);
      setSummaryByDocumentId((current) => ({
        ...current,
        [selectedDocumentId]: {
          ...current[selectedDocumentId],
          totalChunks: result.total_chunks_stored,
          collectionName: result.collection_name,
        },
      }));
      setAnswerResult(null);
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
      setAnswerResult({
        question,
        answer: "",
        model: "",
        sources: [],
        isStreaming: true,
      });

      await streamAnswer(question, {
        onMetadata: (metadata) => {
          setAnswerResult((current) => ({
            ...current,
            question: metadata.question,
            model: metadata.model,
            sources: metadata.sources,
          }));
        },
        onDelta: (delta) => {
          setAnswerResult((current) => ({
            ...current,
            answer: `${current?.answer ?? ""}${delta}`,
          }));
        },
        onDone: () => {
          setAnswerResult((current) => ({ ...current, isStreaming: false }));
          setStatusMessage("Answer generated from all indexed documents.");
        },
        onError: () => {
          setAnswerResult((current) =>
            current ? { ...current, isStreaming: false } : current,
          );
        },
      });
    });
  }

  const selectedStatus = getDocumentStatus(selectedDocument);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-blue-700">
                Knowledge base
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">
                Documents
              </h2>
            </div>
            <StatusBadge tone={hasIndexedDocuments ? "emerald" : "amber"}>
              {indexedCount}/{documents.length} indexed
            </StatusBadge>
          </div>

          <form className="mt-5 space-y-3" onSubmit={handleUpload}>
            <input
              accept="application/pdf"
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              multiple
              onChange={(event) => setSelectedFiles(Array.from(event.target.files))}
              type="file"
            />
            <LoadingButton
              className="w-full bg-blue-700 text-white hover:bg-blue-800"
              disabled={isBusy || !selectedFiles.length}
              isLoading={loadingAction === "upload"}
              loadingLabel="Uploading..."
              type="submit"
            >
              Upload PDFs
            </LoadingButton>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Uploaded documents
            </h3>
            <span className="text-xs text-slate-500">{documents.length} total</span>
          </div>
          <div className="max-h-[420px] overflow-auto pr-1">
            <DocumentList
              documents={documents}
              onSelect={setSelectedDocumentId}
              selectedDocumentId={selectedDocumentId}
            />
          </div>
        </section>
      </aside>

      <main className="space-y-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-blue-700">
                Selected document
              </p>
              <h2 className="mt-2 truncate text-xl font-semibold text-slate-950">
                {selectedDocument?.original_filename ?? "No document selected"}
              </h2>
              {selectedDocument && (
                <p className="mt-1 truncate font-mono text-xs text-slate-500">
                  {selectedDocument.stored_filename}
                </p>
              )}
            </div>
            <div className="w-full xl:w-[420px]">
              <PipelineStatus
                document={selectedDocument}
                loadingAction={loadingAction}
              />
            </div>
          </div>

          {selectedDocument && (
            <>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <LoadingButton
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  disabled={isBusy}
                  isLoading={loadingAction === "extract"}
                  loadingLabel="Extracting..."
                  onClick={handleExtractText}
                  type="button"
                >
                  Extract
                </LoadingButton>
                <LoadingButton
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  disabled={isBusy || !selectedStatus.text_extracted}
                  isLoading={loadingAction === "chunks"}
                  loadingLabel="Chunking..."
                  onClick={handleCreateChunks}
                  type="button"
                >
                  Chunk
                </LoadingButton>
                <LoadingButton
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  disabled={isBusy || !selectedStatus.chunks_created}
                  isLoading={loadingAction === "embeddings"}
                  loadingLabel="Embedding..."
                  onClick={handleGenerateEmbeddings}
                  type="button"
                >
                  Embed
                </LoadingButton>
                <LoadingButton
                  className="bg-blue-700 text-white hover:bg-blue-800"
                  disabled={isBusy || !selectedStatus.embeddings_generated}
                  isLoading={loadingAction === "store"}
                  loadingLabel="Storing..."
                  onClick={handleStoreInVectorDatabase}
                  type="button"
                >
                  Store
                </LoadingButton>
              </div>

              <dl className="mt-5 grid gap-3 sm:grid-cols-4">
                <MetricCard
                  label="Characters"
                  value={selectedSummary.characterCount}
                />
                <MetricCard label="Chunks" value={selectedSummary.totalChunks} />
                <MetricCard
                  label="Dimensions"
                  value={selectedSummary.embeddingDimensions}
                />
                <MetricCard
                  label="Collection"
                  value={selectedSummary.collectionName}
                />
              </dl>
            </>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-blue-700">
                  Grounded chat
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  Ask all indexed documents
                </h2>
              </div>
              <StatusBadge tone={hasIndexedDocuments ? "emerald" : "amber"}>
                {hasIndexedDocuments ? "Ready to ask" : "Index a document first"}
              </StatusBadge>
            </div>
          </div>

          <div className="min-h-[420px] bg-slate-50 p-5">
            {!answerResult && (
              <div className="flex min-h-[340px] items-center justify-center text-center">
                <div className="max-w-md">
                  <p className="text-sm font-medium text-slate-700">
                    No conversation yet
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Store at least one document, then ask a question. Answers
                    stream from retrieved source chunks.
                  </p>
                </div>
              </div>
            )}

            {answerResult && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <div className="max-w-2xl rounded-lg bg-blue-700 px-4 py-3 text-sm leading-6 text-white shadow-sm">
                    {answerResult.question}
                  </div>
                </div>
                <div className="max-w-3xl rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
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
                    {answerResult.isStreaming && (
                      <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-slate-400 align-middle" />
                    )}
                  </p>
                  {answerResult.isStreaming && !answerResult.answer && (
                    <p className="mt-3 text-sm text-slate-500">
                      Reading the most relevant chunks...
                    </p>
                  )}
                </div>
                <SourceChunks sources={answerResult.sources} />
              </div>
            )}
          </div>

          <form className="border-t border-slate-200 bg-white p-5" onSubmit={handleAskQuestion}>
            <div className="flex flex-col gap-3 lg:flex-row">
              <textarea
                className="min-h-24 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                disabled={isBusy || !hasIndexedDocuments}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask a question across all indexed PDFs..."
                value={question}
              />
              <LoadingButton
                className="bg-slate-900 text-white hover:bg-slate-800 lg:w-32"
                disabled={isBusy || !hasIndexedDocuments}
                isLoading={loadingAction === "answer"}
                loadingLabel="Streaming..."
                type="submit"
              >
                Ask
              </LoadingButton>
            </div>
            <div className="mt-4 space-y-3">
              <StatusAlert message={statusMessage} />
              <StatusAlert message={errorMessage} type="error" />
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

export default RagWorkspace;
