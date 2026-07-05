"use client";
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = "info", duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ toast, onRemove }) => {
  useEffect(() => {
  }, []);

  const colors = {
    info: "bg-surface border-surface-border text-foreground",
    success: "bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400",
    error: "bg-red-500/10 border-red-500/50 text-red-600 dark:text-red-400",
    warning: "bg-yellow-500/10 border-yellow-500/50 text-yellow-600 dark:text-yellow-400"
  };

  const icons = {
    info: <Info className="w-5 h-5 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 shrink-0" />,
    error: <AlertTriangle className="w-5 h-5 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 shrink-0" />
  };

  return (
    <div className={`pointer-events-auto p-4 rounded-blocky border-2 flex items-start gap-3 shadow-lg animate-in slide-in-from-right-8 fade-in duration-300 ${colors[toast.type]}`}>
      {icons[toast.type]}
      <p className="font-semibold text-sm flex-1 break-words">{toast.message}</p>
      <button onClick={onRemove} className="opacity-50 hover:opacity-100 transition-opacity">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};
