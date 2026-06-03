import { useEffect, useState } from "react";

import BackendStatus from "./components/BackendStatus.jsx";
import RagWorkspace from "./components/RagWorkspace.jsx";
import { apiBaseUrl, getBackendHealth } from "./services/healthApi.js";

function App() {
  const [healthMessage, setHealthMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkBackendConnection() {
      try {
        const health = await getBackendHealth();
        setHealthMessage(health.message);
      } catch {
        setErrorMessage(
          "Could not reach the backend. Make sure FastAPI is running on the configured API URL.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    checkBackendConnection();
  }, []);

  const isConnected = !isLoading && !errorMessage;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Enterprise RAG Assistant
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Document intelligence workspace
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Upload PDFs, index them into ChromaDB, and ask grounded questions
              with streamed answers and visible source chunks.
            </p>
          </div>
          <div className="w-full lg:w-[360px]">
            <BackendStatus
              errorMessage={errorMessage}
              healthMessage={healthMessage}
              isConnected={isConnected}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-6 py-6">
        <RagWorkspace />

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-500">
            Backend API URL
          </p>
          <p className="mt-2 break-all font-mono text-sm text-slate-800">
            {apiBaseUrl}
          </p>
        </section>
      </div>
    </main>
  );
}

export default App;
