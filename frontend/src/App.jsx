import { useEffect, useState } from "react";

import BackendStatus from "./components/BackendStatus.jsx";
import PdfUploadForm from "./components/PdfUploadForm.jsx";
import RetrievalSearch from "./components/RetrievalSearch.jsx";
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
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Enterprise RAG Assistant
        </p>

        <div className="mt-4 max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Full-stack starter is ready.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-700">
            This is the initial React, Vite, Tailwind CSS, and FastAPI setup.
            Document upload, retrieval, and AI chat features will be added in
            later steps.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <BackendStatus
            errorMessage={errorMessage}
            healthMessage={healthMessage}
            isConnected={isConnected}
            isLoading={isLoading}
          />

          <PdfUploadForm />

          <RetrievalSearch />

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
