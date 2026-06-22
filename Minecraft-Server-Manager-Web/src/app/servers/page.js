"use client";
import { useEffect, useState } from "react";
import { getMyServers } from "@/features/servers/services/serverApi";
import { Server, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/shared/ui/Button";

import { useRouter } from "next/navigation";

export default function DashboardHome() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    getMyServers()
      .then(data => {
        const serverList = Array.isArray(data) ? data : [];
        if (serverList.length === 0) {
          router.push("/servers/new-server");
        } else {
          setServers(serverList);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in h-full">
      <div className="flex justify-between items-center bg-surface p-6 rounded-blocky border-2 border-surface-border shadow-sm">
        <div>
          <h1 className="text-3xl font-black">Mis Servidores</h1>
          <p className="text-foreground/70 font-semibold">Administra tu red de Minecraft</p>
        </div>
        <Link href="/servers/new-server">
          <Button variant="primary">
            <Plus className="w-5 h-5 mr-2 inline-block" /> Crear Servidor
          </Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-center text-foreground/50 font-bold mt-10">Cargando servidores...</p>
      ) : servers.length === 0 ? (
        <div className="bg-surface p-10 rounded-blocky border-2 border-dashed border-surface-border text-center flex flex-col items-center gap-4">
          <Server className="w-16 h-16 text-foreground/30" />
          <h2 className="text-xl font-bold">No tienes servidores</h2>
          <p className="text-foreground/60">Aún no has creado ningún servidor. ¡Empieza tu aventura ahora!</p>
          <Link href="/servers/new-server">
            <Button variant="primary" className="mt-2">Crear mi primer servidor</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map(server => (
            <Link key={server.id} href={`/server/${server.id}`}>
              <div className="bg-surface border-2 border-surface-border p-6 rounded-blocky hover:-translate-y-1 hover:border-primary transition-all cursor-pointer shadow-sm group h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-primary/10 rounded-blocky text-primary">
                    <Server className="w-6 h-6" />
                  </div>
                  <span className="px-2 py-1 bg-surface-border rounded-full text-xs font-bold uppercase">{server.type}</span>
                </div>
                <h3 className="font-bold text-xl group-hover:text-primary transition-colors">{server.name}</h3>
                <p className="text-sm text-foreground/60 mt-1">Versión: {server.version}</p>
                <p className="text-sm text-foreground/60">RAM: {server.memory} MB</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
