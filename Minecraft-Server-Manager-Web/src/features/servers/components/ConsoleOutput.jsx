"use client";
import { useEffect, useRef } from "react";

import { Trash2 } from "lucide-react";

export function ConsoleOutput({ logs, onClear }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [logs]);

  return (
    <div className="relative group">
      {logs.length > 0 && (
        <button 
          data-cy="console-clear-btn"
          onClick={onClear}
          className="absolute top-4 right-4 p-2 bg-surface border-2 border-surface-border rounded-blocky text-foreground/50 hover:text-danger hover:border-danger opacity-0 group-hover:opacity-100 transition-all z-10 shadow-lg"
          title="Limpiar consola"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      <div 
        ref={containerRef}
        className="bg-[#282c34] text-[#abb2bf] font-mono text-sm p-4 rounded-t-blocky border-2 border-b-0 border-surface-border h-[60vh] overflow-y-auto whitespace-pre-wrap break-words shadow-inner"
      >
        {logs.length === 0 && (
          <span className="text-foreground/40 italic">Esperando conexión con el servidor...</span>
        )}
        {logs.map((log, index) => (
          <div key={index} className="hover:bg-white/5 px-1 rounded-sm leading-relaxed">{log}</div>
        ))}
      </div>
    </div>
  );
}
