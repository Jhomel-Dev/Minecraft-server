"use client";
import { Server, Plus, HardDrive } from "lucide-react";
import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import { useServers } from "@/features/servers/hooks/useServers";

export default function DashboardHome() {
  const { servers, serverSizes, loading, formatSize } = useServers();

  if (loading) {
    return (
      <div className="p-4 sm:p-8 max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in h-full">
        <Header />
        <p className="text-center text-foreground/50 font-bold mt-10">Cargando servidores...</p>
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <div className="p-4 sm:p-8 max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in h-full">
        <Header />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in h-full">
      <Header />
      <ServerGrid servers={servers} serverSizes={serverSizes} formatSize={formatSize} />
    </div>
  );
}

function Header() {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-surface p-6 rounded-blocky border-2 border-surface-border shadow-sm gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black">Mis Servidores</h1>
        <p className="text-foreground/70 font-semibold text-sm sm:text-base">Administra tu red de Minecraft</p>
      </div>
      <Link href="/servers/new-server" className="w-full sm:w-auto">
        <Button variant="primary" className="w-full sm:w-auto">
          <Plus className="w-5 h-5 mr-2 inline-block" /> Crear Servidor
        </Button>
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-surface p-10 rounded-blocky border-2 border-dashed border-surface-border text-center flex flex-col items-center gap-4 mx-4 sm:mx-0">
      <Server className="w-16 h-16 text-foreground/30" />
      <h2 className="text-xl font-bold">No tienes servidores</h2>
      <p className="text-foreground/60 text-sm sm:text-base">Aún no has creado ningún servidor. ¡Empieza tu aventura ahora!</p>
      <Link href="/servers/new-server">
        <Button variant="primary" className="mt-2">Crear mi primer servidor</Button>
      </Link>
    </div>
  );
}

function ServerGrid({ servers, serverSizes, formatSize }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
  return (
    <Link href={`/server/${server.id}`}>
      <div className="bg-surface border-2 border-surface-border p-6 rounded-blocky hover:-translate-y-1 hover:border-primary transition-all cursor-pointer shadow-sm group h-full">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-primary/10 rounded-blocky text-primary">
            <Server className="w-6 h-6" />
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
