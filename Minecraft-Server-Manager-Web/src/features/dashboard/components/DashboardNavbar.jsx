"use client";
import { Pickaxe, LogOut, User, Menu } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useRouter, useParams } from "next/navigation";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { LanguageSwitcher } from "@/shared/ui/LanguageSwitcher";
import { useState, useEffect } from "react";
import { useUIStore } from "@/core/store/uiStore";
import { useTranslations } from "next-intl";

export function DashboardNavbar() {
  const t = useTranslations("DashboardNavbar");
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const router = useRouter();
  const params = useParams();
  const toggleSidebar = useUIStore(state => state.toggleSidebar);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const showHamburger = !!params?.id;

  return (
    <nav className="bg-surface border-b-2 border-surface-border px-4 sm:px-8 py-4 flex justify-between items-center z-20 w-full h-16 sticky top-0">
      <div className="flex items-center gap-2">
        {showHamburger && (
          <button 
            onClick={toggleSidebar}
            className="p-2 bg-surface border-2 border-surface-border rounded-blocky md:hidden hover:bg-primary/10 transition-colors mr-2"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        
        <Link href="/servers" className="flex items-center gap-2 group cursor-pointer">
          <div className="p-2 bg-primary/20 rounded-blocky text-primary group-hover:scale-110 transition-transform">
            <Pickaxe className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <span className="font-black text-lg sm:text-xl tracking-tight hidden sm:block">CraftControl</span>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <LanguageSwitcher />
        <ThemeToggle />
        
        {mounted && (
          <Link href="/servers/profile" className="flex items-center gap-3 bg-background border-2 border-surface-border px-2 sm:px-4 py-2 rounded-blocky hover:border-primary transition-colors cursor-pointer">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold shadow-inner">
              <User className="w-4 h-4" />
            </div>
            <span className="font-bold hidden sm:block text-sm sm:text-base">
              {user?.username || t("myProfile")}
            </span>
          </Link>
        )}

        <button 
          onClick={handleLogout}
          className="p-2 text-danger hover:bg-danger/10 rounded-blocky transition-colors"
          title={t("logout")}
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
