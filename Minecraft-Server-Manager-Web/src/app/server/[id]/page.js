"use client";
import { use, useEffect, useState } from "react";
import { Server, Activity, Play, Square, RotateCw, Globe, RefreshCw, Pickaxe } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { startServer, stopServer, restartServer, getMyServers } from "@/features/servers/services/serverApi";
import { StatusBanner } from "@/features/servers/components/StatusBanner";
import { PerformanceCharts } from "@/features/servers/components/PerformanceCharts";

export default function ServerOverviewPage({ params }) {
  const unwrappedParams = use(params);
  const serverId = unwrappedParams.id;
  const [server, setServer] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchServer = async () => {
    try {
      const data = await getMyServers();
      const serverList = Array.isArray(data) ? data : [];
      const found = serverList.find(s => s.id === serverId);
      if (found) setServer(found);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServer();
    const interval = setInterval(fetchServer, 3000);
    return () => clearInterval(interval);
  }, [serverId]);

  const handleStart = async () => { try { await startServer(serverId); } catch (e) { console.log(e.message); } };
  const handleStop = async () => { try { await stopServer(serverId); } catch (e) { console.log(e.message); } };
  const handleRestart = async () => { try { await restartServer(serverId); } catch (e) { console.log(e.message); } };

  if (loading) return <div className="p-8 text-center animate-pulse">Cargando servidor...</div>;
  if (!server) return <div className="p-8 text-center text-danger">Servidor no encontrado.</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8 h-full animate-in fade-in">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-surface p-6 rounded-blocky border-2 border-surface-border shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-primary/10 text-primary rounded-blocky border-2 border-primary/20">
            <Server className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-3xl font-black">{server.name}</h1>
            <div className="text-foreground/70 font-semibold flex items-center gap-2 mt-1">
              <Globe className="w-4 h-4" /> 
              {server.customDomain ? (
                <span>{server.customDomain}</span>
              ) : server.tunnelIp ? (
                <span className="bg-primary/10 text-primary px-2 rounded">{server.tunnelIp}</span>
              ) : server.status !== "OFFLINE" ? (
                <span className="italic opacity-60">Asignando IP...</span>
              ) : (
                <span className="italic opacity-60">Apagado (Sin IP)</span>
              )}
              {(server.customDomain || server.tunnelIp) && (
                <button 
                  onClick={() => navigator.clipboard.writeText(server.customDomain || server.tunnelIp)}
                  className="text-xs bg-foreground/10 hover:bg-foreground/20 px-2 py-1 rounded transition-colors text-foreground"
                  title="Copiar IP"
                >
                  Copiar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-3 bg-background rounded-blocky border-2 border-surface-border">
          <Activity className={`w-5 h-5 ${server.status === "ONLINE" ? "text-primary animate-pulse" : "text-danger"}`} />
          <span className="font-bold text-lg">
            {server.status === "ONLINE" ? "En Línea" : server.status === "STARTING" ? "Iniciando..." : "Desconectado"}
          </span>
        </div>
      </div>

      {/* Main Actions */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="outline" className="border-green-500 text-green-500 hover:bg-green-500/10 h-14 px-8 text-lg flex-1 md:flex-none" onClick={handleStart} disabled={server.status !== "OFFLINE"}>
            <Play className="w-5 h-5 mr-2" /> Iniciar
          </Button>
          <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10 h-14 px-8 text-lg flex-1 md:flex-none" onClick={handleStop} disabled={server.status === "OFFLINE" || server.status === "STOPPING"}>
            <Square className="w-5 h-5 mr-2" /> Detener
          </Button>
          <Button variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-500/10 h-14 px-8 text-lg flex-1 md:flex-none" onClick={handleRestart} disabled={server.status === "OFFLINE" || server.status === "STOPPING"}>
            <RotateCw className="w-5 h-5 mr-2" /> Reiniciar
          </Button>
        </div>
        {server.status === "ONLINE" && !server.customDomain && (
          <p className="text-xs text-warning font-semibold">
            ⚠️ Nota: Si detienes o reinicias el servidor, la dirección IP pública actual cambiará.
          </p>
        )}
      </div>

      {/* Hybrid Console Banner / Mini-Monitor */}
      <StatusBanner serverId={serverId} status={server.status} />

      <PerformanceCharts 
        serverId={serverId} 
        status={server.status}
        maxMemoryMB={server.memory ? (server.memory.toUpperCase().endsWith('G') ? parseInt(server.memory) * 1024 : parseInt(server.memory)) : 4096} 
      />

      {/* Software and Version Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        
        {/* Software Card */}
        <div className="bg-surface border-2 border-surface-border p-6 rounded-blocky flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-foreground/70 text-sm tracking-wider uppercase">Software Instalado</h3>
            <span className="bg-primary/20 text-primary px-3 py-1 text-xs font-bold rounded-full uppercase">{server.type}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Pickaxe className="w-8 h-8 text-foreground/80" />
              <div>
                <p className="font-black text-2xl uppercase">{server.type}</p>
                <p className="text-sm text-foreground/60">Motor de Java</p>
              </div>
            </div>
            <Button variant="secondary" className="border-2">
              <RefreshCw className="w-4 h-4 mr-2" /> Reinstalar
            </Button>
          </div>
        </div>

        {/* Version Card */}
        <div className="bg-surface border-2 border-surface-border p-6 rounded-blocky flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-foreground/70 text-sm tracking-wider uppercase">Versión del Juego</h3>
            <span className="bg-secondary/20 text-secondary px-3 py-1 text-xs font-bold rounded-full uppercase">{server.version}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8 text-foreground/80" />
              <div>
                <p className="font-black text-2xl">{server.version}</p>
                <p className="text-sm text-foreground/60">Minecraft</p>
              </div>
            </div>
            <Button variant="secondary" className="border-2">
              <RefreshCw className="w-4 h-4 mr-2" /> Cambiar
            </Button>
          </div>
        </div>

      </div>

    </div>
  );
}
