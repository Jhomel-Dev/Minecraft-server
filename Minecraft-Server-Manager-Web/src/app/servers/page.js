"use client";
import { Server, Plus, HardDrive, Activity, PauseCircle, Unplug, Sun } from "lucide-react";
import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import { useServers } from "@/features/servers/hooks/useServers";
import { useState, useEffect } from "react";
import { LinkPcModal } from "@/features/servers/components/LinkPcModal";
import { AgentLinkingStage } from "@/features/servers/components/AgentLinkingStage";
import { getAgentStatus, unlinkAgentReq, hibernateAgentReq, wakeAgentReq } from "@/features/auth/services/api";
import { useToast } from "@/shared/ui/ToastProvider";

export default function DashboardHome() {
  const { servers, serverSizes, loading, formatSize } = useServers();
  const [isAgentLinked, setIsAgentLinked] = useState(null);
  const [agentStatus, setAgentStatus] = useState('OFFLINE');
  const [showUnlinkedMessage, setShowUnlinkedMessage] = useState(false);

  const fetchStatus = () => {
    getAgentStatus()
      .then(res => {
        setIsAgentLinked(prev => {
          if (prev === true && res.isLinked === false) {
            setShowUnlinkedMessage(true);
            setTimeout(() => {
              setShowUnlinkedMessage(false);
            }, 3000);
          }
          return res.isLinked;
        });
        if (res.status) setAgentStatus(res.status);
      })
      .catch(() => setIsAgentLinked(false));
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading || isAgentLinked === null) {
    return (
      <div className="p-4 sm:p-8 max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in h-full">
        <Header hideLinkButton />
        <p className="text-center text-foreground/50 font-bold mt-10">Cargando datos...</p>
      </div>
    );
  }

  if (showUnlinkedMessage) {
    return (
      <div className="p-4 sm:p-8 max-w-6xl mx-auto flex flex-col gap-6 items-center justify-center h-full animate-in fade-in zoom-in">
        <div className="bg-surface p-10 rounded-blocky border-2 border-primary shadow-xl text-center">
          <Unplug className="w-16 h-16 text-primary mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-foreground">Agente Desvinculado</h2>
          <p className="text-foreground/70 mt-2">El motor de sincronización ha sido desvinculado a través de la interfaz local.</p>
        </div>
      </div>
    );
  }

  // Si no tiene agente vinculado, forzamos la pantalla completa bonita de vinculación
  if (!isAgentLinked) {
    return (
      <div className="p-4 sm:p-8 max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in h-full">
        <Header hideLinkButton />
        <AgentLinkingStage onLinked={() => setIsAgentLinked(true)} />
      </div>
    );
  }

  // Si tiene agente vinculado, pero 0 servidores, mostramos el EmptyState clásico
  if (servers.length === 0) {
    return (
      <div className="p-4 sm:p-8 max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in h-full">
        <Header isLinked={isAgentLinked} agentStatus={agentStatus} onStatusChange={fetchStatus} onUnlinked={() => setIsAgentLinked(false)} />
        <EmptyState agentStatus={agentStatus} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in h-full">
      <Header isLinked={isAgentLinked} agentStatus={agentStatus} onStatusChange={fetchStatus} onUnlinked={() => setIsAgentLinked(false)} />
      <ServerGrid servers={servers} serverSizes={serverSizes} formatSize={formatSize} agentStatus={agentStatus} />
    </div>
  );
}

function Header({ hideLinkButton, isLinked, agentStatus, onStatusChange, onUnlinked }) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { toast } = useToast();

  const handleLinkPc = () => {
    setShowLinkModal(true);
  };

  const handleUnlink = async () => {
    try {
      setShowDropdown(false);
      await unlinkAgentReq();
      toast("Agente desvinculado con éxito", "success");
      if (onUnlinked) onUnlinked();
    } catch (e) {
      toast("Error al desvincular el agente", "error");
    }
  };

  const handleToggleHibernate = async () => {
    try {
      setShowDropdown(false);
      if (agentStatus === 'HIBERNATING') {
        await wakeAgentReq();
        toast("Agente despertando...", "success");
      } else {
        await hibernateAgentReq();
        toast("Agente hibernando...", "success");
      }
      if (onStatusChange) setTimeout(onStatusChange, 1000);
    } catch (e) {
      toast("Error al cambiar estado", "error");
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-surface p-6 rounded-blocky border-2 border-surface-border shadow-sm gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black">Mis Servidores</h1>
          <p className="text-foreground/70 font-semibold text-sm sm:text-base">Administra tu red de Minecraft</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {!hideLinkButton && !isLinked && (
            <Button variant="outline" className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10" onClick={handleLinkPc}>
              <HardDrive className="w-5 h-5 mr-2 inline-block" /> Vincular PC
            </Button>
          )}
          {!hideLinkButton && isLinked && (
            <div className="relative">
              <Button variant="outline" className="w-full sm:w-auto border-green-500 text-green-500 hover:bg-green-500/10" onClick={() => setShowDropdown(!showDropdown)}>
                <HardDrive className="w-5 h-5 mr-2 inline-block" /> Agente Conectado
              </Button>
              {showDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-surface border-2 border-surface-border rounded-blocky shadow-lg z-50 overflow-hidden animate-in slide-in-from-top-2">
                    <button 
                      onClick={handleToggleHibernate} 
                      className="w-full text-left px-4 py-3 text-sm font-semibold hover:bg-primary/20 hover:text-primary transition-colors border-b border-surface-border flex items-center gap-2"
                    >
                      {agentStatus === 'HIBERNATING' ? (
                        <><Sun className="w-4 h-4" /> Despertar</>
                      ) : (
                        <><PauseCircle className="w-4 h-4" /> Hibernar</>
                      )}
                    </button>
                    <button 
                      onClick={handleUnlink} 
                      className="w-full text-left px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                    >
                      <Unplug className="w-4 h-4" /> Desvincular
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {!hideLinkButton && (
            <Link href={agentStatus === 'HIBERNATING' ? "#" : "/servers/new-server"} className={`w-full sm:w-auto ${agentStatus === 'HIBERNATING' ? 'pointer-events-none opacity-50' : ''}`}>
              <Button variant="primary" className="w-full sm:w-auto" disabled={agentStatus === 'HIBERNATING'}>
                <Plus className="w-5 h-5 mr-2 inline-block" /> Crear Servidor
              </Button>
            </Link>
          )}
        </div>
      </div>
      {showLinkModal && <LinkPcModal onClose={() => setShowLinkModal(false)} />}
    </>
  );
}

function EmptyState({ agentStatus }) {
  return (
    <div className="bg-surface p-10 rounded-blocky border-2 border-dashed border-surface-border text-center flex flex-col items-center gap-4 mx-4 sm:mx-0">
      <Server className="w-16 h-16 text-foreground/30" />
      <h2 className="text-xl font-bold">No tienes servidores</h2>
      <p className="text-foreground/60 text-sm sm:text-base">Aún no has creado ningún servidor. ¡Empieza tu aventura ahora!</p>
      <Link href={agentStatus === 'HIBERNATING' ? "#" : "/servers/new-server"} className={agentStatus === 'HIBERNATING' ? 'pointer-events-none opacity-50' : ''}>
        <Button variant="primary" className="mt-2" disabled={agentStatus === 'HIBERNATING'}>Crear mi primer servidor</Button>
      </Link>
    </div>
  );
}

function ServerGrid({ servers, serverSizes, formatSize, agentStatus }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${agentStatus === 'HIBERNATING' ? 'opacity-50 pointer-events-none' : ''}`}>
      {servers.map(server => (
        <ServerCard 
          key={server.id} 
          server={server} 
          size={serverSizes[server.id]} 
          formatSize={formatSize} 
        />
      ))}
    </div>
  );
}

function ServerCard({ server, size, formatSize }) {
  const isOnline = server.status === "ONLINE";
  const isStarting = server.status === "STARTING";
  const isOffline = server.status === "OFFLINE";

  return (
    <Link href={`/server/${server.id}`}>
      <div className="bg-surface border-2 border-surface-border p-6 rounded-blocky hover:-translate-y-1 hover:border-primary transition-all cursor-pointer shadow-sm group h-full flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-blocky transition-colors ${isOnline ? 'bg-green-500/10 text-green-500' : isStarting ? 'bg-yellow-500/10 text-yellow-500 animate-pulse' : 'bg-primary/10 text-primary'}`}>
              <Server className="w-6 h-6" />
            </div>
            {isOnline && <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full text-xs font-bold border border-green-500/20 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> ONLINE</span>}
            {isStarting && <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded-full text-xs font-bold border border-yellow-500/20 flex items-center gap-1"><Activity className="w-3 h-3 animate-spin" /> STARTING</span>}
            {isOffline && <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full text-xs font-bold border border-red-500/20 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> OFFLINE</span>}
          </div>
          <span className="px-2 py-1 bg-surface-border rounded-full text-xs font-bold uppercase truncate max-w-[100px]">{server.type}</span>
        </div>
        <h3 className="font-bold text-xl group-hover:text-primary transition-colors truncate">{server.name}</h3>
        <p className="text-sm text-foreground/60 mt-1 truncate">Versión: {server.version}</p>
        <p className="text-sm text-foreground/60">RAM: {server.memory} MB</p>
        <div className="flex items-center gap-1 text-sm text-foreground/60 mt-2">
          <HardDrive className="w-4 h-4 shrink-0" />
          <span className="truncate">{formatSize(size)}</span>
        </div>
      </div>
    </Link>
  );
}
