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
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-6 py-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Enterprise RAG Assistant
        </p>

        <div className="mt-4 max-w-4xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Upload, index, and ask questions about enterprise PDFs.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-700">
            Process a document through the full RAG pipeline, then ask grounded
            questions with source chunks visible for inspection.
          </p>
        </div>

        <div className="mt-6 space-y-5">
          <BackendStatus
            errorMessage={errorMessage}
            healthMessage={healthMessage}
            isConnected={isConnected}
            isLoading={isLoading}
          />

          <RagWorkspace />

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Backend API URL
            </p>
            <p className="mt-2 break-all font-mono text-sm text-slate-800">
              {apiBaseUrl}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

export default App;
