"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, TerminalSquare, ExternalLink } from "lucide-react";
import { useServerConsole } from "@/features/servers/hooks/useServerConsole";
import { useRouter } from "next/navigation";

export function StatusBanner({ serverId, status }) {
  const { logs, isConnected } = useServerConsole(serverId);
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  
  // Ref para auto-scroll cuando está expandido
  const consoleEndRef = useRef(null);

  useEffect(() => {
    if (expanded && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, expanded]);

  // Si está offline y no hay logs relevantes, no mostrar nada intrusivo o mostrar un banner muy apagado
  if (status === "OFFLINE" && logs.length === 0) return null;

  const lastLog = logs.length > 0 ? logs[logs.length - 1] : "Esperando conexión...";
  
  // Quitar el timestamp del último log si lo tiene para que se vea más limpio en la barra
  const cleanLastLog = lastLog.replace(/^\[\d{2}:\d{2}:\d{2}\] /, "");

  return (
    <div className="bg-surface border-2 border-surface-border rounded-blocky overflow-hidden shadow-sm transition-all duration-300">
      
      {/* Banner Principal (Siempre visible si hay actividad) */}
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-hover/50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3 overflow-hidden flex-1">
          <TerminalSquare className="w-5 h-5 text-secondary flex-shrink-0" />
          <div className="flex-1 truncate">
            <span className="font-mono text-sm text-foreground/80 animate-in fade-in slide-in-from-bottom-1" key={lastLog}>
              {cleanLastLog}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 pl-4 border-l-2 border-surface-border">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground/50">Console</span>
          {expanded ? <ChevronUp className="w-5 h-5 text-foreground/50" /> : <ChevronDown className="w-5 h-5 text-foreground/50" />}
        </div>
      </div>

      {/* Mini-Monitor Expandido */}
      {expanded && (
        <div className="border-t-2 border-surface-border bg-background p-4 animate-in slide-in-from-top-2 flex flex-col gap-2">
          <div className="bg-black/80 rounded-blocky p-4 h-48 overflow-y-auto font-mono text-xs text-green-400 custom-scrollbar shadow-inner relative">
            {logs.slice(-50).map((log, i) => (
              <div key={i} className="mb-1 opacity-80 hover:opacity-100">{log}</div>
            ))}
            <div ref={consoleEndRef} />
          </div>
          <div className="flex justify-end mt-2">
            <button 
              onClick={(e) => { e.stopPropagation(); router.push(`/server/${serverId}/console`); }}
              className="flex items-center gap-2 text-xs font-bold text-secondary hover:text-white transition-colors px-3 py-1 bg-surface rounded-blocky border border-surface-border"
            >
              Ir a Consola Completa <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
