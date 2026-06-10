import { useEffect, useMemo, useRef, useState } from "react";

import AtlasLogo from "./AtlasLogo.jsx";
import LoadingButton from "./LoadingButton.jsx";
import ToastContainer from "./Toast.jsx";
import { streamAnswer } from "../services/answerApi.js";
import { generatePdfChunks } from "../services/chunkApi.js";
import { generatePdfEmbeddings } from "../services/embeddingApi.js";
import { extractPdfText } from "../services/extractionApi.js";
import {
  deleteUploadedDocument,
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

const CHAT_HISTORY_STORAGE_KEY = "enterprise-rag-chat-history";
const AUTO_SCROLL_THRESHOLD_PX = 160;

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

function createMessageId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getChatHistoryStorageKey(userId) {
  return userId
    ? `${CHAT_HISTORY_STORAGE_KEY}:${userId}`
    : CHAT_HISTORY_STORAGE_KEY;
}

function loadSavedChatMessages(userId) {
  if (typeof localStorage === "undefined") {
    return [];
  }

  try {
    const savedHistory = localStorage.getItem(getChatHistoryStorageKey(userId));
    if (!savedHistory) {
      return [];
    }

    const parsedHistory = JSON.parse(savedHistory);
    if (!Array.isArray(parsedHistory)) {
      return [];
    }

    return parsedHistory
      .filter((message) => message?.id && message?.role && message?.content !== undefined)
      .map((message) => ({
        ...message,
        sources: Array.isArray(message.sources) ? message.sources : [],
        isStreaming: false,
      }));
  } catch {
    return [];
  }
}

function saveChatMessages(messages, userId) {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    const messagesToSave = messages.map((message) => ({
      ...message,
      isStreaming: false,
    }));

    localStorage.setItem(
      getChatHistoryStorageKey(userId),
      JSON.stringify(messagesToSave),
    );
  } catch {
    // localStorage can fail in private browsing or when storage is full.
  }
}

function removeSavedChatMessages(userId) {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(getChatHistoryStorageKey(userId));
  } catch {
    // Clearing browser storage should never break the chat UI.
  }
}

function StatusBadge({ children, tone = "slate" }) {
  const tones = {
    amber: "bg-amber-500/10 text-amber-200 ring-amber-300/15",
    blue: "bg-indigo-400/10 text-indigo-100 ring-indigo-300/15",
    emerald: "bg-emerald-500/10 text-emerald-100 ring-emerald-300/15",
    slate: "bg-slate-400/[0.08] text-slate-400 ring-slate-300/10",
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}

function PipelineStatus({ document, loadingAction }) {
  const status = getDocumentStatus(document);

  return (
    <div className="space-y-2">
      {pipelineSteps.map((step) => {
        const isComplete = Boolean(status[step.key]);
        const isRunning = loadingAction === step.action;
        const tone = isRunning ? "blue" : isComplete ? "emerald" : "slate";

        return (
          <div
            className="flex items-center justify-between gap-3 text-xs"
            key={step.key}
            title={step.label}
          >
            <span className="truncate text-slate-400">
              {step.label}
            </span>
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                tone === "emerald"
                  ? "bg-emerald-300"
                  : tone === "blue"
                    ? "bg-indigo-300"
                    : "bg-slate-700"
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}

function DocumentList({
  documents,
  loadingAction,
  onDelete,
  onReprocess,
  onSelect,
  selectedDocumentId,
}) {
  if (!documents.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300/10 bg-slate-300/[0.035] p-4 text-center">
        <p className="text-sm font-medium text-slate-200">No documents yet</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
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
        const status = getDocumentStatus(document);
        const completedSteps = pipelineSteps.filter((step) => status[step.key]).length;
        const isDeleting = loadingAction === `delete-${document.document_id}`;
        const isReprocessing = loadingAction === `reprocess-${document.document_id}`;
        const isBusy = Boolean(loadingAction);

        return (
          <article
            className={`group w-full rounded-xl px-3 py-2.5 text-left transition ${
              isSelected
                ? "bg-indigo-500/[0.12] shadow-[inset_0_0_0_1px_rgba(129,140,248,0.2)]"
                : "bg-slate-300/[0.04] hover:bg-slate-300/[0.07]"
            }`}
            key={document.document_id}
          >
            <button
              className="block w-full text-left"
              onClick={() => onSelect(document.document_id)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">
                    {document.original_filename}
                  </p>
                </div>
                <StatusBadge tone={ready ? "emerald" : "amber"}>
                  {ready ? "Ready" : `${completedSteps}/5`}
                </StatusBadge>
              </div>
            </button>

            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-slate-500 transition hover:text-slate-300">
                Manage
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  className="rounded-xl bg-slate-300/[0.07] px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-300/[0.11] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isBusy}
                  onClick={() => onReprocess(document)}
                  type="button"
                >
                  {isReprocessing ? "Re-indexing..." : "Re-index"}
                </button>
                <button
                  className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isBusy}
                  onClick={() => onDelete(document)}
                  type="button"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </details>
          </article>
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
    <details className="rounded-2xl bg-slate-300/[0.035] ring-1 ring-slate-300/10">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-200">
        Sources ({sources.length})
      </summary>
      <div className="border-t border-slate-300/10 px-4 py-4">
        <div className="grid gap-2">
        {sources.map((source, index) => (
          <details
            className="rounded-xl bg-slate-950/45 ring-1 ring-slate-300/10"
            key={`${source.document_id}-${source.chunk_index}-${index}`}
          >
            <summary className="cursor-pointer px-3 py-2.5">
              <div className="inline-flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-medium text-slate-100">
                    Source {index + 1}
                  </h4>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {source.original_filename ?? source.document_filename}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge>Chunk {source.chunk_index ?? "N/A"}</StatusBadge>
                  <StatusBadge tone="emerald">
                    Score {formatScore(source.relevance_score)}
                  </StatusBadge>
                </div>
              </div>
            </summary>
            <div className="border-t border-slate-300/10 px-3 py-3">
              <p className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                {source.text}
              </p>
            </div>
          </details>
        ))}
        </div>
      </div>
    </details>
  );
}

function RagWorkspace({
  backendStatus,
  currentUser,
  isLoggingOut = false,
  onLogout,
}) {
  const chatScrollRef = useRef(null);
  const chatBottomRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [question, setQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState(() =>
    loadSavedChatMessages(currentUser?.id),
  );
  const [toasts, setToasts] = useState([]);
  const [loadingAction, setLoadingAction] = useState("");
  const [summaryByDocumentId, setSummaryByDocumentId] = useState({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.innerWidth >= 1024;
  });

  const selectedDocument = useMemo(
    () => documents.find((document) => document.document_id === selectedDocumentId),
    [documents, selectedDocumentId],
  );
  const selectedSummary = summaryByDocumentId[selectedDocumentId] ?? {};
  const indexedCount = countReadyDocuments(documents);
  const hasIndexedDocuments = indexedCount > 0;
  const isBusy = Boolean(loadingAction);
  const hasStreamingMessage = chatMessages.some((message) => message.isStreaming);
  const latestAssistantContent =
    chatMessages.findLast((message) => message.role === "assistant")?.content ?? "";

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

  useEffect(() => {
    saveChatMessages(chatMessages, currentUser?.id);
  }, [chatMessages, currentUser?.id]);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) {
      return;
    }

    chatBottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [chatMessages.length, latestAssistantContent, hasStreamingMessage]);

  function handleChatScroll() {
    const scrollContainer = chatScrollRef.current;
    if (!scrollContainer) {
      return;
    }

    const distanceFromBottom =
      scrollContainer.scrollHeight -
      scrollContainer.scrollTop -
      scrollContainer.clientHeight;

    shouldAutoScrollRef.current = distanceFromBottom < AUTO_SCROLL_THRESHOLD_PX;
  }

  function keepChatPinnedToBottom() {
    shouldAutoScrollRef.current = true;
  }

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

  function dismissToast(toastId) {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }

  function showToast(message, type = "info") {
    const toastId = createMessageId();

    setToasts((current) => [
      ...current,
      {
        id: toastId,
        message,
        type,
      },
    ]);
  }

  async function runAction(actionName, action) {
    setLoadingAction(actionName);

    try {
      await action();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setLoadingAction("");
    }
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!selectedFiles.length) {
      showToast("Select one or more PDF files before uploading.", "warning");
      return;
    }

    const nonPdf = selectedFiles.find((file) => file.type !== "application/pdf");
    if (nonPdf) {
      showToast("Only PDF files can be uploaded.", "warning");
      return;
    }

    await runAction("upload", async () => {
      const result = await uploadPdfs(selectedFiles);
      setDocuments((current) => [...result.documents, ...current]);
      setSelectedDocumentId(result.documents[0]?.document_id ?? "");
      setSelectedFiles([]);
      event.target.reset();
      showToast(`${result.total_documents} PDF document(s) uploaded.`, "success");
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
      showToast("Text extracted successfully.", "success");
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
      showToast("Chunks created successfully.", "success");
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
      showToast("Embeddings generated successfully.", "success");
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
      showToast("Document stored in ChromaDB successfully.", "success");
    });
  }

  async function handleDeleteDocument(document) {
    await runAction(`delete-${document.document_id}`, async () => {
      const result = await deleteUploadedDocument(document.document_id);

      setDocuments((current) => {
        const remainingDocuments = current.filter(
          (item) => item.document_id !== document.document_id,
        );

        if (selectedDocumentId === document.document_id) {
          setSelectedDocumentId(remainingDocuments[0]?.document_id ?? "");
        }

        return remainingDocuments;
      });
      setSummaryByDocumentId((current) => {
        const nextSummary = { ...current };
        delete nextSummary[document.document_id];
        return nextSummary;
      });
      showToast(
        `${result.original_filename} removed. Deleted ${result.deleted_vectors} vector chunk(s).`,
        "success",
      );
    });
  }

  async function handleReprocessDocument(document) {
    await runAction(`reprocess-${document.document_id}`, async () => {
      const extractedResult = await extractPdfText(document.stored_filename);
      updateDocument(extractedResult.document);

      const chunkResult = await generatePdfChunks(document.stored_filename);
      updateDocument(chunkResult.document);

      const embeddingResult = await generatePdfEmbeddings(document.stored_filename);
      updateDocument(embeddingResult.document);

      const storageResult = await storePdfInVectorDatabase(document.stored_filename);
      updateDocument(storageResult.document);

      setSummaryByDocumentId((current) => ({
        ...current,
        [document.document_id]: {
          characterCount: extractedResult.character_count,
          totalChunks: storageResult.total_chunks_stored,
          embeddingDimensions: embeddingResult.embedding_dimensions,
          collectionName: storageResult.collection_name,
        },
      }));
      showToast(`${document.original_filename} re-indexed successfully.`, "success");
    });
  }

  function updateAssistantMessage(messageId, updater) {
    setChatMessages((current) =>
      current.map((message) =>
        message.id === messageId ? updater(message) : message,
      ),
    );
  }

  function handleClearChat() {
    removeSavedChatMessages(currentUser?.id);
    setChatMessages([]);
    showToast("Chat history cleared.", "info");
  }

  async function handleAskQuestion(event) {
    event?.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      showToast("Type a question before asking the assistant.", "warning");
      return;
    }

    await runAction("answer", async () => {
      keepChatPinnedToBottom();

      const userMessage = {
        id: createMessageId(),
        role: "user",
        content: trimmedQuestion,
      };
      const assistantMessageId = createMessageId();
      const assistantMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        model: "",
        sources: [],
        isStreaming: true,
      };

      setChatMessages((current) => [...current, userMessage, assistantMessage]);
      setQuestion("");

      try {
        await streamAnswer(trimmedQuestion, {
          onMetadata: (metadata) => {
            updateAssistantMessage(assistantMessageId, (message) => ({
              ...message,
              model: metadata.model,
              sources: metadata.sources,
            }));
          },
          onDelta: (delta) => {
            updateAssistantMessage(assistantMessageId, (message) => ({
              ...message,
              content: `${message.content}${delta}`,
            }));
          },
          onDone: () => {
            updateAssistantMessage(assistantMessageId, (message) => ({
              ...message,
              isStreaming: false,
            }));
            showToast("Answer generated from indexed documents.", "success");
          },
          onError: () => {
            updateAssistantMessage(assistantMessageId, (message) => ({
              ...message,
              content:
                message.content ||
                "The response stream was interrupted. Please try again.",
              isStreaming: false,
            }));
          },
        });
      } catch (error) {
        updateAssistantMessage(assistantMessageId, (message) => ({
          ...message,
          content:
            message.content ||
            "The response stream was interrupted. Please try again.",
          isStreaming: false,
        }));
        throw error;
      }
    });
  }

  function handleQuestionKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleAskQuestion();
    }
  }

  const selectedStatus = getDocumentStatus(selectedDocument);

  return (
    <div className="flex h-screen overflow-hidden bg-[#090f1f] text-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex h-full shrink-0 flex-col bg-[#0d1424]/95 shadow-2xl shadow-black/30 ring-1 ring-slate-300/10 backdrop-blur-xl transition-all duration-200 lg:relative lg:z-auto ${
          isSidebarOpen ? "w-[min(360px,100vw)]" : "hidden w-16 lg:flex"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-4">
          {isSidebarOpen && (
            <div className="flex min-w-0 items-center gap-3">
              <AtlasLogo className="h-9 w-9" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-slate-50">
                  Atlas AI
                </p>
                <p className="truncate text-xs text-slate-500">
                  Enterprise Knowledge Assistant
                </p>
              </div>
            </div>
          )}
          <button
            className="rounded-xl bg-slate-300/[0.06] px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-300/[0.1]"
            onClick={() => setIsSidebarOpen((current) => !current)}
            type="button"
            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isSidebarOpen ? "Hide" : ">"}
          </button>
        </div>

        {isSidebarOpen && (
          <>
            <div className="space-y-3 px-4 pb-4">
              {backendStatus}

              <section className="flex items-center justify-between gap-3 rounded-2xl bg-slate-300/[0.035] px-3 py-3 ring-1 ring-slate-300/10">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Signed in
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-slate-100">
                    {currentUser?.email ?? "Authenticated user"}
                  </p>
                </div>
                <button
                  className="shrink-0 rounded-xl bg-slate-300/[0.07] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-300/[0.11] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoggingOut}
                  onClick={onLogout}
                  type="button"
                >
                  {isLoggingOut ? "..." : "Logout"}
                </button>
              </section>

              <details className="rounded-2xl bg-slate-300/[0.035] ring-1 ring-slate-300/10">
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-100 transition hover:text-white">
                  + Upload Documents
                </summary>
                <form className="space-y-3 px-4 pb-4" onSubmit={handleUpload}>
                  <input
                    accept="application/pdf"
                    className="sr-only"
                    id="document-upload-input"
                    multiple
                    onChange={(event) =>
                      setSelectedFiles(Array.from(event.target.files))
                    }
                    type="file"
                  />
                  <label
                    className="flex cursor-pointer items-center justify-center rounded-xl bg-slate-300/[0.07] px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-slate-300/[0.11]"
                    htmlFor="document-upload-input"
                  >
                    Choose PDFs
                  </label>
                  {selectedFiles.length > 0 && (
                    <p className="truncate text-xs text-slate-500">
                      {selectedFiles.length} file(s) selected
                    </p>
                  )}
                  <LoadingButton
                    className="w-full rounded-xl bg-indigo-400 text-white shadow-lg shadow-indigo-950/25 hover:bg-indigo-300"
                    disabled={isBusy || !selectedFiles.length}
                    isLoading={loadingAction === "upload"}
                    loadingLabel="Uploading..."
                    type="submit"
                  >
                    Add to library
                  </LoadingButton>
                </form>
              </details>

              {selectedDocument && !selectedStatus.stored_in_vector_db && (
                <details className="rounded-2xl bg-slate-300/[0.035] ring-1 ring-slate-300/10">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-100">
                    Index document
                  </summary>
                  <div className="space-y-4 px-4 pb-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">
                        {selectedDocument.original_filename}
                      </p>
                    </div>

                    <PipelineStatus
                      document={selectedDocument}
                      loadingAction={loadingAction}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <LoadingButton
                        className="rounded-xl bg-slate-300/[0.07] text-slate-100 hover:bg-slate-300/[0.11]"
                        disabled={isBusy}
                        isLoading={loadingAction === "extract"}
                        loadingLabel="Extracting..."
                        onClick={handleExtractText}
                        type="button"
                      >
                        Extract
                      </LoadingButton>
                      <LoadingButton
                        className="rounded-xl bg-slate-300/[0.07] text-slate-100 hover:bg-slate-300/[0.11]"
                        disabled={isBusy || !selectedStatus.text_extracted}
                        isLoading={loadingAction === "chunks"}
                        loadingLabel="Chunking..."
                        onClick={handleCreateChunks}
                        type="button"
                      >
                        Chunk
                      </LoadingButton>
                      <LoadingButton
                        className="rounded-xl bg-slate-300/[0.07] text-slate-100 hover:bg-slate-300/[0.11]"
                        disabled={isBusy || !selectedStatus.chunks_created}
                        isLoading={loadingAction === "embeddings"}
                        loadingLabel="Embedding..."
                        onClick={handleGenerateEmbeddings}
                        type="button"
                      >
                        Embed
                      </LoadingButton>
                      <LoadingButton
                        className="rounded-xl bg-indigo-400 text-white hover:bg-indigo-300"
                        disabled={isBusy || !selectedStatus.embeddings_generated}
                        isLoading={loadingAction === "store"}
                        loadingLabel="Storing..."
                        onClick={handleStoreInVectorDatabase}
                        type="button"
                      >
                        Store
                      </LoadingButton>
                    </div>
                  </div>
                </details>
              )}
            </div>

            <section className="flex min-h-0 flex-1 flex-col px-4 pb-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Documents
                </h3>
                <span className="text-xs text-slate-500" title={`${indexedCount} indexed`}>
                  {documents.length}
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <DocumentList
                  documents={documents}
                  loadingAction={loadingAction}
                  onDelete={handleDeleteDocument}
                  onReprocess={handleReprocessDocument}
                  onSelect={setSelectedDocumentId}
                  selectedDocumentId={selectedDocumentId}
                />
              </div>
            </section>
          </>
        )}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-[radial-gradient(circle_at_top,#172033_0,#090f1f_42%,#070b16_100%)]">
        <header className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {!isSidebarOpen && (
              <button
                className="rounded-xl bg-slate-300/[0.07] px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-300/[0.11]"
                onClick={() => setIsSidebarOpen(true)}
                type="button"
              >
                Docs
              </button>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight text-slate-50 sm:text-lg">
                Ask your indexed documents
              </h1>
              <p className="truncate text-xs text-slate-500">
                Chat history is saved locally in this browser only.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge tone={hasIndexedDocuments ? "emerald" : "amber"}>
              {hasIndexedDocuments ? "Ready" : "Index a document"}
            </StatusBadge>
            <button
              className="hidden rounded-xl bg-slate-300/[0.06] px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-300/[0.1] disabled:cursor-not-allowed disabled:opacity-60 sm:block"
              disabled={!chatMessages.length || hasStreamingMessage}
              onClick={handleClearChat}
              type="button"
            >
              Clear history
            </button>
          </div>
        </header>

        <section
          className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
          onScroll={handleChatScroll}
          ref={chatScrollRef}
        >
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
            {!chatMessages.length && (
              <div className="flex flex-1 items-center justify-center text-center">
                <div className="max-w-md">
                  <h2 className="text-xl font-medium tracking-tight text-slate-100">
                    Ask your documents anything.
                  </h2>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
                    Upload and index PDFs in the sidebar. Answers appear here
                    with source citations attached.
                  </p>
                </div>
              </div>
            )}

            {chatMessages.length > 0 && (
              <div className="space-y-6 pb-4">
                {chatMessages.map((message) => {
                  if (message.role === "user") {
                    return (
                      <div className="flex justify-end" key={message.id}>
                        <div className="max-w-[82%] rounded-[1.4rem] bg-indigo-400 px-4 py-3 text-sm leading-6 text-white shadow-lg shadow-indigo-950/25">
                          {message.content}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3" key={message.id}>
                      <div className="max-w-[88%] rounded-[1.4rem] bg-slate-300/[0.055] px-4 py-4 shadow-lg shadow-black/10 ring-1 ring-slate-300/10">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <p className="text-sm font-medium text-slate-100">
                            Assistant
                          </p>
                          <p className="break-all font-mono text-xs text-slate-500">
                            {message.model}
                          </p>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                          {message.content}
                          {message.isStreaming && (
                            <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded-sm bg-slate-400 align-middle" />
                          )}
                        </p>
                        {message.isStreaming && !message.content && (
                          <p className="mt-3 text-sm text-slate-500">
                            Reading the most relevant chunks...
                          </p>
                        )}
                      </div>
                      <SourceChunks sources={message.sources} />
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>
        </section>

        <form
          className="shrink-0 bg-gradient-to-t from-[#090f1f] via-[#090f1f] to-transparent px-4 pb-5 pt-3 sm:px-6"
          onSubmit={handleAskQuestion}
        >
          <div className="mx-auto w-full max-w-3xl">
            <div className="rounded-[1.6rem] bg-slate-300/[0.07] p-2 shadow-2xl shadow-black/35 ring-1 ring-slate-300/10 backdrop-blur focus-within:ring-indigo-300/45">
              <div className="flex items-end gap-2">
                <textarea
                  className="max-h-40 min-h-16 flex-1 resize-none border-0 bg-transparent px-4 py-3 text-sm leading-6 text-slate-100 placeholder:text-slate-500 focus:outline-none"
                  disabled={isBusy || !hasIndexedDocuments}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={handleQuestionKeyDown}
                  placeholder="Message your documents..."
                  value={question}
                />
                <LoadingButton
                  className="mb-1 rounded-2xl bg-indigo-400 px-5 py-3 text-white shadow-lg shadow-indigo-950/25 hover:bg-indigo-300"
                  disabled={isBusy || !hasIndexedDocuments || !question.trim()}
                  isLoading={loadingAction === "answer"}
                  loadingLabel="..."
                  type="submit"
                >
                  Send
                </LoadingButton>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Press Enter to send, Shift+Enter for a new line.
              </p>
              <button
                className="text-left text-xs font-semibold text-slate-400 transition hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50 sm:hidden"
                disabled={!chatMessages.length || hasStreamingMessage}
                onClick={handleClearChat}
                type="button"
              >
                Clear history
              </button>
            </div>
          </div>
        </form>
      </main>

      <ToastContainer onDismiss={dismissToast} toasts={toasts} />
    </div>
  );
}

export default RagWorkspace;
