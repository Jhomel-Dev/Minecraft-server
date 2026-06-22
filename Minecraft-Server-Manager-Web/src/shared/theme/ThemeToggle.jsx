"use client";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-[60px] h-8 rounded-blocky bg-surface-border animate-pulse border-2 border-transparent" />;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`relative w-[60px] h-8 flex items-center rounded-blocky border-2 transition-colors duration-300 outline-none overflow-hidden ${
        isDark ? "bg-background border-primary" : "bg-surface-border border-secondary"
      }`}
      title="Alternar Tema"
    >
      {/* Iconos de fondo estáticos */}
      <div className="absolute w-full flex justify-between px-1.5 z-0 pointer-events-none">
        <Sun className={`w-4 h-4 transition-opacity ${isDark ? "opacity-30" : "opacity-0"}`} />
        <Moon className={`w-4 h-4 transition-opacity ${isDark ? "opacity-0" : "opacity-30"}`} />
      </div>

      {/* Slider / Perilla movible */}
      <div
        className={`absolute w-6 h-6 rounded flex items-center justify-center transition-all duration-300 z-10 shadow-sm ${
          isDark 
            ? "translate-x-[30px] bg-primary text-white" 
            : "translate-x-[2px] bg-white text-yellow-500"
        }`}
      >
        {isDark ? <Moon className="w-4 h-4 fill-current" /> : <Sun className="w-4 h-4 fill-current" />}
      </div>
    </button>
  );
}
