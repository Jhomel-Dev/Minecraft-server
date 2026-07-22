"use client";
import { SidebarItem } from "./SidebarItem";
import { Server, FolderOpen, Package, Save, Settings, Users, ArrowLeft, Globe, X } from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyServers } from "@/features/servers/services/serverApi";
import { useUIStore } from "@/core/store/uiStore";
import { useTranslations } from "next-intl";

export function DashboardSidebar() {
  const params = useParams();
  const serverId = params?.id || "unknown"; 
  const [serverType, setServerType] = useState(null);
  const isSidebarOpen = useUIStore(state => state.isSidebarOpen);
  const closeSidebar = useUIStore(state => state.closeSidebar);
  const t = useTranslations("Sidebar");

  useEffect(() => {
    if (serverId === "unknown") return;
    
    getMyServers()
      .then(data => {
        const serverList = Array.isArray(data) ? data : [];
        const found = serverList.find(s => s.id === serverId);
        if (found) setServerType(found.type.toLowerCase());
      })
      .catch(() => {});
  }, [serverId]);

  const handleClose = () => {
    closeSidebar();
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-30 transition-opacity md:hidden ${
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleClose}
      />
      
      <aside 
        className={`fixed md:relative top-0 left-0 h-[100dvh] md:h-auto w-64 bg-surface border-r-2 border-surface-border flex flex-col shrink-0 z-40 transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-4 border-b-2 border-surface-border flex justify-between items-center">
          <Link href="/servers" className="flex items-center gap-2 text-foreground/70 hover:text-primary transition-colors font-bold text-sm">
            <ArrowLeft className="w-4 h-4" /> {t('back')}
          </Link>
          <button 
            onClick={handleClose}
            className="md:hidden p-1 text-foreground/50 hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          <SidebarItem 
            href={`/server/${serverId}`} 
            icon={<Server className="w-5 h-5" />} 
            label={t('server')} 
            exact={true}
            onClick={handleClose}
          />
          <SidebarItem 
            href={`/server/${serverId}/options`} 
            icon={<Settings className="w-5 h-5" />} 
            label={t('options')} 
            onClick={handleClose}
          />
          <SidebarItem 
            href={`/server/${serverId}/console`} 
            icon={<Server className="w-5 h-5" />} 
            label={t('console')} 
            onClick={handleClose}
          />
          <SidebarItem 
            href={`/server/${serverId}/players`} 
            icon={<Users className="w-5 h-5" />} 
            label={t('players')} 
            onClick={handleClose}
          />
          
          {serverType !== "vanilla" && (
            <>
              <SidebarItem 
                href={`/server/${serverId}/plugins`} 
                icon={<Package className="w-5 h-5" />} 
                label={t('plugins')} 
                onClick={handleClose}
              />
              <SidebarItem 
                href={`/server/${serverId}/mods`} 
                icon={<Package className="w-5 h-5" />} 
                label={t('mods')} 
                onClick={handleClose}
              />
            </>
          )}

          <SidebarItem 
            href={`/server/${serverId}/files`} 
            icon={<FolderOpen className="w-5 h-5" />} 
            label={t('files')} 
            onClick={handleClose}
          />
          <SidebarItem 
            href={`/server/${serverId}/backups`} 
            icon={<Save className="w-5 h-5" />} 
            label={t('backups')} 
            onClick={handleClose}
          />
          <SidebarItem 
            href={`/server/${serverId}/network`} 
            icon={<Globe className="w-5 h-5" />} 
            label={t('network')} 
            onClick={handleClose}
          />
        </nav>

      </aside>
    </>
  );
}
