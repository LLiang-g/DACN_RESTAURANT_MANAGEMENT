import { useEffect } from "react";

export interface ToastMessage {
  id: number;
  type: "success" | "error" | "info";
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

export default function Toast({ toasts, onDismiss }: ToastProps) {
  useEffect(() => {
    if (toasts.length === 0) return;
    const latest = toasts[toasts.length - 1];
    const timer = setTimeout(() => {
      onDismiss(latest.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toasts, onDismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">
            {t.type === "success" ? "✓" : t.type === "error" ? "⚠" : "ℹ"}
          </span>
          <span className="toast-text">{t.text}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => onDismiss(t.id)}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
