"use client";
import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Server, Activity, Play, Square, RotateCw, Globe, RefreshCw, Pickaxe } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { startServer, stopServer, restartServer, getMyServers } from "@/features/servers/services/serverApi";
import { StatusBanner } from "@/features/servers/components/StatusBanner";
import { PerformanceCharts } from "@/features/servers/components/PerformanceCharts";
import { ReinstallModal } from "@/features/servers/components/ReinstallModal";
import { updateSettings } from "@/features/servers/services/serverApi";
import { useToast } from "@/shared/ui/ToastProvider";

export default function ServerOverviewPage({ params }) {
  const t = useTranslations("ServerOverview");
  const unwrappedParams = use(params);
  const serverId = unwrappedParams.id;
  const [server, setServer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReinstallModal, setShowReinstallModal] = useState(false);
  const { toast } = useToast();

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

  const handleStart = async () => { try { await startServer(serverId); toast(t("startingServer"), "info"); } catch (e) { toast(e.message, "error"); } };
  const handleStop = async () => { try { await stopServer(serverId); toast(t("stoppingServer"), "warning"); } catch (e) { toast(e.message, "error"); } };
  const handleRestart = async () => { try { await restartServer(serverId); toast(t("restartingServer"), "info"); } catch (e) { toast(e.message, "error"); } };

  const handleReinstallConfirm = async (type, version) => {
    try {
      await updateSettings(serverId, { type, version });
      setShowReinstallModal(false);
      fetchServer();
      toast(t("configUpdatedToast"), "success");
    } catch (e) {
      toast(t("updateErrorToast") + e.message, "error");
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">{t("loadingServer")}</div>;
  if (!server) return <div className="p-8 text-center text-danger">{t("serverNotFound")}</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8 h-full animate-in fade-in">
      
      {}
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
                <span className="italic opacity-60">{t("assigningIp")}</span>
              ) : (
                <span data-cy="server-ip-status" className="italic opacity-60">{t("offlineNoIp")}</span>
              )}
              {(server.customDomain || server.tunnelIp) && (
                <button 
                  onClick={() => navigator.clipboard.writeText(server.customDomain || server.tunnelIp)}
                  className="text-xs bg-foreground/10 hover:bg-foreground/20 px-2 py-1 rounded transition-colors text-foreground"
                  title={t("copyIp")}
                >
                  {t("copy")}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-3 bg-background rounded-blocky border-2 border-surface-border">
          <Activity className={`w-5 h-5 ${server.status === "ONLINE" ? "text-primary animate-pulse" : "text-danger"}`} />
          <span data-cy="server-status-text" className="font-bold text-lg">
            {server.status === "ONLINE" ? t("statusOnline") : server.status === "STARTING" ? t("statusStarting") : t("statusOffline")}
          </span>
        </div>
      </div>

      {}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-4">
          <Button data-cy="server-start-btn" variant="outline" className="border-green-500 text-green-500 hover:bg-green-500/10 h-14 px-8 text-lg flex-1 md:flex-none" onClick={handleStart} disabled={server.status !== "OFFLINE"}>
            <Play className="w-5 h-5 mr-2" /> {t("start")}
          </Button>
          <Button data-cy="server-stop-btn" variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10 h-14 px-8 text-lg flex-1 md:flex-none" onClick={handleStop} disabled={server.status === "OFFLINE" || server.status === "STOPPING"}>
            <Square className="w-5 h-5 mr-2" /> {t("stop")}
          </Button>
          <Button data-cy="server-restart-btn" variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-500/10 h-14 px-8 text-lg flex-1 md:flex-none" onClick={handleRestart} disabled={server.status === "OFFLINE" || server.status === "STOPPING"}>
            <RotateCw className="w-5 h-5 mr-2" /> {t("restart")}
          </Button>
        </div>
        {server.status === "ONLINE" && !server.customDomain && (
          <p className="text-xs text-warning font-semibold">
            ⚠️ {t("ipNotice")}
          </p>
        )}
      </div>

      {}
      <StatusBanner serverId={serverId} status={server.status} />

      <PerformanceCharts 
        serverId={serverId} 
        status={server.status}
        maxMemoryMB={server.memory ? (server.memory.toUpperCase().endsWith('G') ? parseInt(server.memory) * 1024 : parseInt(server.memory)) : 4096} 
      />

      {}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        
        {}
        <div className="bg-surface border-2 border-surface-border p-6 rounded-blocky flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-foreground/70 text-sm tracking-wider uppercase">{t("installedSoftware")}</h3>
            <span className="bg-primary/20 text-primary px-3 py-1 text-xs font-bold rounded-full uppercase">{server.type}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Pickaxe className="w-8 h-8 text-foreground/80" />
              <div>
                <p className="font-black text-2xl uppercase">{server.type}</p>
                <p className="text-sm text-foreground/60">{t("javaEngine")}</p>
              </div>
            </div>
            <Button variant="secondary" className="border-2" onClick={() => setShowReinstallModal(true)}>
              <RefreshCw className="w-4 h-4 mr-2" /> {t("reinstall")}
            </Button>
          </div>
        </div>

        {}
        <div className="bg-surface border-2 border-surface-border p-6 rounded-blocky flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-foreground/70 text-sm tracking-wider uppercase">{t("gameVersion")}</h3>
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
            <Button variant="secondary" className="border-2" onClick={() => setShowReinstallModal(true)}>
              <RefreshCw className="w-4 h-4 mr-2" /> {t("change")}
            </Button>
          </div>
        </div>

      </div>

      {showReinstallModal && (
        <ReinstallModal 
          server={server}
          onClose={() => setShowReinstallModal(false)}
          onConfirm={handleReinstallConfirm}
        />
      )}

    </div>
  );
}
