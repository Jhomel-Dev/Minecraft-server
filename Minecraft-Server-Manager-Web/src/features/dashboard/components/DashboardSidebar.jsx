"use client";
import { SidebarItem } from "./SidebarItem";
import { Server, FolderOpen, Package, Save, Settings, Users, ArrowLeft, Globe } from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyServers } from "@/features/servers/services/serverApi";

export function DashboardSidebar() {
  const params = useParams();
  const serverId = params?.id || "unknown"; // since route is /server/[id]
  const [serverType, setServerType] = useState(null);

  useEffect(() => {
    if (serverId !== "unknown") {
      getMyServers().then(data => {
        const serverList = Array.isArray(data) ? data : [];
        const found = serverList.find(s => s.id === serverId);
        if (found) setServerType(found.type.toLowerCase());
      }).catch(console.error);
    }
  }, [serverId]);

  return (
    <aside className="w-64 min-h-full bg-surface border-r-2 border-surface-border flex flex-col shrink-0 z-0">
      <div className="p-4 border-b-2 border-surface-border">
        <Link href="/servers" className="flex items-center gap-2 text-foreground/70 hover:text-primary transition-colors font-bold text-sm">
          <ArrowLeft className="w-4 h-4" /> Volver a Servidores
        </Link>
      </div>

      <nav className="flex-1 p-4 flex flex-col gap-2">
        <SidebarItem 
          href={`/server/${serverId}`} 
          icon={<Server className="w-5 h-5" />} 
          label="Servidor" 
          exact={true}
        />
        <SidebarItem 
          href={`/server/${serverId}/options`} 
          icon={<Settings className="w-5 h-5" />} 
          label="Opciones" 
        />
        <SidebarItem 
          href={`/server/${serverId}/console`} 
          icon={<Server className="w-5 h-5" />} 
          label="Consola" 
        />
        <SidebarItem 
          href={`/server/${serverId}/players`} 
          icon={<Users className="w-5 h-5" />} 
          label="Jugadores" 
        />
        
        {serverType !== "vanilla" && (
          <>
            <SidebarItem 
              href={`/server/${serverId}/plugins`} 
              icon={<Package className="w-5 h-5" />} 
              label="Plugins" 
            />
            <SidebarItem 
              href={`/server/${serverId}/mods`} 
              icon={<Package className="w-5 h-5" />} 
              label="Mods" 
            />
          </>
        )}

        <SidebarItem 
          href={`/server/${serverId}/files`} 
          icon={<FolderOpen className="w-5 h-5" />} 
          label="Archivos" 
        />
        <SidebarItem 
          href={`/server/${serverId}/backups`} 
          icon={<Save className="w-5 h-5" />} 
          label="Respaldos" 
        />
        <SidebarItem 
          href={`/server/${serverId}/network`} 
          icon={<Globe className="w-5 h-5" />} 
          label="Red y Dominios" 
        />
      </nav>
    </aside>
  );
}
