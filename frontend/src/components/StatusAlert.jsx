const styles = {
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

function StatusAlert({ message, type = "success" }) {
  if (!message) {
    return null;
  }

  return (
    <p className={`rounded-md border px-4 py-3 text-sm ${styles[type]}`}>
      {message}
    </p>
  );
}

export default StatusAlert;
