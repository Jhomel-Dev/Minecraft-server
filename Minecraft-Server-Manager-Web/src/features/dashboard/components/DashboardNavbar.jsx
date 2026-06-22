"use client";
import { Pickaxe, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { useState, useEffect } from "react";

export function DashboardNavbar() {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav className="bg-surface border-b-2 border-surface-border px-8 py-4 flex justify-between items-center z-10 w-full h-16">
      <Link href="/servers" className="flex items-center gap-2 group cursor-pointer">
        <div className="p-2 bg-primary/20 rounded-blocky text-primary group-hover:scale-110 transition-transform">
          <Pickaxe className="w-6 h-6" />
        </div>
        <span className="font-black text-xl tracking-tight hidden sm:block">CraftControl</span>
      </Link>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        
        {mounted && (
          <Link href="/servers/profile" className="flex items-center gap-3 bg-background border-2 border-surface-border px-4 py-2 rounded-blocky hover:border-primary transition-colors cursor-pointer">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold shadow-inner">
              <User className="w-4 h-4" />
            </div>
            <span className="font-bold hidden sm:block">
              {user?.username || "Mi Perfil"}
            </span>
          </Link>
        )}

        <button 
          onClick={handleLogout}
          className="p-2 text-danger hover:bg-danger/10 rounded-blocky transition-colors"
          title="Cerrar Sesión"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
