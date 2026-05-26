function BackendStatus({ errorMessage, healthMessage, isConnected, isLoading }) {
  let statusLabel = "Checking connection...";
  let statusStyles = "border-amber-200 bg-amber-50 text-amber-800";

  if (isConnected) {
    statusLabel = "Backend Connected";
    statusStyles = "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (errorMessage) {
    statusLabel = "Backend Disconnected";
    statusStyles = "border-red-200 bg-red-50 text-red-800";
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            Backend Connection
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            The frontend checks the FastAPI health endpoint when the page loads.
          </p>
        </div>

        <div
          className={`inline-flex w-fit items-center rounded-md border px-3 py-2 text-sm font-medium ${statusStyles}`}
        >
          {statusLabel}
        </div>
      </div>

      <div className="mt-5 rounded-md bg-slate-50 p-4 text-sm text-slate-700">
        {isLoading && <p>Waiting for the backend response.</p>}
        {isConnected && <p>{healthMessage}</p>}
        {errorMessage && <p>{errorMessage}</p>}
      </div>
    </section>
  );
}

export default BackendStatus;
