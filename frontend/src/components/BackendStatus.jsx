function BackendStatus({ errorMessage, healthMessage, isConnected, isLoading }) {
  let statusLabel = "Checking connection...";
  let statusDot = "bg-amber-300";

  if (isConnected) {
    statusLabel = "Connected";
    statusDot = "bg-emerald-300";
  }

  if (errorMessage) {
    statusLabel = "Disconnected";
    statusDot = "bg-red-300";
  }

  return (
    <section className="flex items-center justify-between gap-3 px-1 text-xs text-slate-400">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
        <span>{isLoading ? "Checking" : statusLabel}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
        <span>{isConnected ? "Ready" : "Standby"}</span>
      </div>
    </section>
  );
}

export default BackendStatus;
