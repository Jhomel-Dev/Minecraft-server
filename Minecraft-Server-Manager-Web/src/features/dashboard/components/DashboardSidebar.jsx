"use client";
import { SidebarItem } from "./SidebarItem";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { Server, FolderOpen, Package, Save, User, Pickaxe, LogOut } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useRouter, useParams } from "next/navigation";

export function DashboardSidebar() {
  const logout = useAuthStore(state => state.logout);
  const router = useRouter();
  const params = useParams();
  
  const serverId = params?.serverId || "new-server";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleLogoClick = () => {
    router.push("/");
  };

  return (
    <aside className="w-64 min-h-screen bg-surface border-r-2 border-surface-border flex flex-col shrink-0">
      <div 
        className="p-6 border-b-2 border-surface-border flex items-center gap-2 text-primary font-black text-xl cursor-pointer" 
        onClick={handleLogoClick}
      >
        <Pickaxe className="w-8 h-8" />
        <span>CraftControl</span>
      </div>

      <nav className="flex-1 p-4 flex flex-col gap-2">
        <SidebarItem 
          href={`/dashboard/${serverId}`} 
          icon={<Server className="w-5 h-5" />} 
          label="Consola" 
        />
        <SidebarItem 
          href={`/dashboard/${serverId}/files`} 
          icon={<FolderOpen className="w-5 h-5" />} 
          label="Archivos" 
        />
        <SidebarItem 
          href={`/dashboard/${serverId}/mods`} 
          icon={<Package className="w-5 h-5" />} 
          label="Mods y Plugins" 
        />
        <SidebarItem 
          href={`/dashboard/${serverId}/backups`} 
          icon={<Save className="w-5 h-5" />} 
          label="Respaldos" 
        />
      </nav>

      <div className="p-4 border-t-2 border-surface-border flex flex-col gap-2">
        <SidebarItem 
          href="/profile" 
          icon={<User className="w-5 h-5" />} 
          label="Mi Perfil" 
        />
        <div className="flex items-center justify-between mt-2">
          <ThemeToggle />
          <button 
            onClick={handleLogout}
            className="p-2 text-danger hover:bg-danger/10 rounded-blocky transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
