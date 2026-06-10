import { useEffect, useState } from "react";

const toastStyles = {
  error: "bg-red-500/12 text-red-100 ring-red-300/20",
  info: "bg-indigo-500/12 text-indigo-100 ring-indigo-300/20",
  success: "bg-emerald-500/12 text-emerald-100 ring-emerald-300/20",
  warning: "bg-amber-500/12 text-amber-100 ring-amber-300/20",
};

function Toast({ toast, onDismiss }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const showTimer = window.setTimeout(() => setIsVisible(true), 20);
    const hideTimer = window.setTimeout(() => {
      setIsVisible(false);
      window.setTimeout(() => onDismiss(toast.id), 180);
    }, 5000);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [onDismiss, toast.id]);

  function dismissToast() {
    setIsVisible(false);
    window.setTimeout(() => onDismiss(toast.id), 180);
  }

  return (
    <div
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-sm shadow-2xl shadow-black/25 ring-1 backdrop-blur transition duration-200 ${
        toastStyles[toast.type] ?? toastStyles.info
      } ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "-translate-y-2 opacity-0"
      }`}
    >
      <p className="min-w-0 flex-1 leading-5">{toast.message}</p>
      <button
        className="rounded-full px-2 text-sm font-semibold leading-none text-current opacity-70 transition hover:opacity-100"
        onClick={dismissToast}
        type="button"
      >
        X
      </button>
    </div>
  );
}

function ToastContainer({ onDismiss, toasts }) {
  if (!toasts.length) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => (
        <Toast key={toast.id} onDismiss={onDismiss} toast={toast} />
      ))}
    </div>
  );
}

export default ToastContainer;
