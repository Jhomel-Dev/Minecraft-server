"use client";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <Button variant="outline" className="w-10 h-10 p-0" />;

  const isDark = theme === "dark";

  return (
    <Button 
      variant="outline" 
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-10 h-10 p-0"
      title={isDark ? "Cambiar al Tema Overworld" : "Cambiar al Tema Enderman"}
    >
      {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-primary" />}
    </Button>
  );
}
