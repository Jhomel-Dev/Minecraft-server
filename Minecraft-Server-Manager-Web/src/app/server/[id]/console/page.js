"use client";
import { useEffect, use } from "react";
import { useTranslations } from "next-intl";
import { useServerConsole } from "@/features/servers/hooks/useServerConsole";
import { useServerControl } from "@/features/servers/hooks/useServerControl";
import { ConsoleOutput } from "@/features/servers/components/ConsoleOutput";
import { ConsoleInput } from "@/features/servers/components/ConsoleInput";
import { Server, Activity, Play, Square, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";

export default function ServerConsolePage({ params }) {
  const unwrappedParams = use(params);
  const serverId = unwrappedParams.id;
  const router = useRouter();
  
  const { logs, isConnected, sendCommand, clearLogs } = useServerConsole(serverId);
  const { server, errorMsg, clearError, handleStart, handleStop, handleRestart } = useServerControl(serverId);

  useEffect(() => {
    // Auth is now handled by httpOnly cookies and authFetch interceptors
  }, [router]);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto flex flex-col gap-6 h-full animate-in fade-in w-full overflow-x-hidden">
      <ConsoleHeader 
        server={server} 
        serverId={serverId} 
        onStart={handleStart} 
        onStop={handleStop} 
        onRestart={handleRestart} 
      />
      
      <ErrorBanner errorMsg={errorMsg} onClose={clearError} />

      <div className="flex flex-col flex-1 w-full max-w-full">
        <ConsoleOutput logs={logs} onClear={clearLogs} />
        <ConsoleInput onSend={sendCommand} disabled={!isConnected} />
      </div>
    </div>
  );
}

function ConsoleHeader({ server, serverId, onStart, onStop, onRestart }) {
  const t = useTranslations("ServerConsole");
  const isOnline = server?.status === 'ONLINE';
  const isOffline = server?.status === 'OFFLINE' || !server;
  const isTransitioning = server?.status === 'STARTING' || server?.status === 'STOPPING';

  return (
    <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between bg-surface p-4 sm:p-6 rounded-blocky border-2 border-surface-border shadow-sm gap-4">
      <div className="flex items-center gap-4 w-full xl:w-auto">
        <div className="p-3 bg-primary/10 text-primary rounded-blocky shrink-0">
          <Server className="w-6 h-6 sm:w-8 sm:h-8" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-black truncate">{server ? server.name : t('loading')}</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-foreground/70 font-semibold text-xs sm:text-sm">{t('mainControlPanel')}</span>
            <span className="text-foreground/30 font-mono text-xs sm:text-sm hidden sm:inline">•</span>
            <span className="text-foreground/30 font-mono text-xs truncate max-w-[150px] sm:max-w-none">{serverId}</span>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
        <Button data-cy="console-start-btn" variant="outline" className="border-green-500 text-green-500 hover:bg-green-500/10 flex-1 sm:flex-none" onClick={onStart} disabled={isOnline || isTransitioning}>
          <Play className="w-4 h-4 mr-1 sm:mr-2 inline-block" /> <span className="hidden sm:inline">{t('start')}</span>
        </Button>
        <Button data-cy="console-stop-btn" variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10 flex-1 sm:flex-none" onClick={onStop} disabled={isOffline || isTransitioning}>
          <Square className="w-4 h-4 mr-1 sm:mr-2 inline-block" /> <span className="hidden sm:inline">{t('stop')}</span>
        </Button>
        <Button variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-500/10 flex-1 sm:flex-none" onClick={onRestart} disabled={isOffline || isTransitioning}>
          <RotateCw className="w-4 h-4 mr-1 sm:mr-2 inline-block" /> <span className="hidden sm:inline">{t('restart')}</span>
        </Button>

        <StatusBadge status={server?.status} />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const t = useTranslations("ServerConsole");
  const isOnline = status === 'ONLINE';
  const label = isOnline ? t('statusOnline') : 
                status === 'STARTING' ? t('statusStarting') :
                status === 'STOPPING' ? t('statusStopping') : t('statusOffline');

  return (
    <div className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-background rounded-blocky border-2 border-surface-border w-full sm:w-auto justify-center mt-2 sm:mt-0">
      <Activity className={`w-4 h-4 sm:w-5 sm:h-5 ${isOnline ? "text-primary animate-pulse" : "text-danger"}`} />
      <span data-cy="console-server-status" className="font-bold text-xs sm:text-sm">{label}</span>
    </div>
  );
}

function ErrorBanner({ errorMsg, onClose }) {
  if (!errorMsg) return null;

  return (
    <div className="bg-danger/10 border-2 border-danger text-danger p-4 rounded-blocky flex items-start sm:items-center justify-between animate-in fade-in slide-in-from-top-4 gap-2">
      <div className="flex items-start sm:items-center gap-3 font-bold">
        <span className="text-xl shrink-0">⚠️</span>
        <span className="text-sm sm:text-base">{errorMsg}</span>
      </div>
      <button 
        onClick={onClose} 
        className="text-danger hover:text-danger/70 transition-colors font-black text-xl px-2 shrink-0"
      >
        ×
      </button>
    </div>
  );
}
