const styles = {
  error: "bg-red-500/10 text-red-200 ring-red-300/20",
  success: "bg-emerald-500/10 text-emerald-200 ring-emerald-300/20",
};

function StatusAlert({ message, type = "success" }) {
  if (!message) {
    return null;
  }

  return (
    <p className={`rounded-2xl px-3 py-2 text-xs shadow-lg shadow-black/20 ring-1 backdrop-blur ${styles[type]}`}>
      {message}
    </p>
  );
}

export default StatusAlert;
