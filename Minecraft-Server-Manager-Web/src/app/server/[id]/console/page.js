"use client";
import { useEffect, use, useState } from "react";
import { useServerConsole } from "@/features/servers/hooks/useServerConsole";
import { ConsoleOutput } from "@/features/servers/components/ConsoleOutput";
import { ConsoleInput } from "@/features/servers/components/ConsoleInput";
import { Server, Activity, Play, Square, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { startServer, stopServer, restartServer } from "@/features/servers/services/serverApi";
import { Button } from "@/shared/ui/Button";

export default function ServerConsolePage({ params }) {
  const unwrappedParams = use(params);
  const serverId = unwrappedParams.id;
  const router = useRouter();
  const { logs, isConnected, sendCommand, clearLogs } = useServerConsole(serverId);

  const [errorMsg, setErrorMsg] = useState("");

  const handleStart = async () => { 
    setErrorMsg("");
    await startServer(serverId).catch(err => setErrorMsg(err.message)); 
  };
  const handleStop = async () => { 
    setErrorMsg("");
    await stopServer(serverId).catch(err => setErrorMsg(err.message)); 
  };
  const handleRestart = async () => { 
    setErrorMsg("");
    await restartServer(serverId).catch(err => setErrorMsg(err.message)); 
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-6 h-full animate-in fade-in">
      
      <div className="flex items-center justify-between bg-surface p-6 rounded-blocky border-2 border-surface-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-blocky">
            <Server className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black">{serverId}</h1>
            <p className="text-foreground/70 font-semibold">Panel de Control Principal</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-green-500 text-green-500 hover:bg-green-500/10" onClick={handleStart}>
            <Play className="w-4 h-4 mr-2 inline-block" /> Iniciar
          </Button>
          <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10" onClick={handleStop}>
            <Square className="w-4 h-4 mr-2 inline-block" /> Detener
          </Button>
          <Button variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-500/10" onClick={handleRestart}>
            <RotateCw className="w-4 h-4 mr-2 inline-block" /> Reiniciar
          </Button>

          <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-blocky border-2 border-surface-border">
            <Activity className={`w-5 h-5 ${isConnected ? "text-primary animate-pulse" : "text-danger"}`} />
            <span className="font-bold text-sm">
              {isConnected ? "En línea" : "Desconectado"}
            </span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border-2 border-red-500 text-red-500 p-4 rounded-blocky font-semibold">
          Error: {errorMsg}
        </div>
      )}

      <div className="flex flex-col flex-1">
        <ConsoleOutput logs={logs} onClear={clearLogs} />
        <ConsoleInput onSend={sendCommand} disabled={!isConnected} />
      </div>

    </div>
  );
}
