"use client";
import { useState, useEffect } from "react";
import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";

export function LanguageSwitcher() {
  const [locale, setLocale] = useState("en");
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Read the locale from the cookie on mount
    const cookies = document.cookie.split("; ");
    const localeCookie = cookies.find((row) => row.startsWith("NEXT_LOCALE="));
    if (localeCookie) {
      setLocale(localeCookie.split("=")[1]);
    } else {
      setLocale("es"); // default
    }
  }, []);

  const changeLocale = (newLocale) => {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`; // 1 year
    setLocale(newLocale);
    setIsOpen(false);
    router.refresh();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 sm:p-2.5 bg-background border-2 border-surface-border rounded-blocky hover:border-primary hover:text-primary transition-colors flex items-center justify-center shadow-sm"
        title="Cambiar Idioma / Change Language"
      >
        <Languages className="w-5 h-5 sm:w-5 sm:h-5" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute right-0 mt-2 w-32 bg-surface border-2 border-surface-border rounded-blocky shadow-lg z-50 overflow-hidden animate-in slide-in-from-top-2">
            <button
              onClick={() => changeLocale("en")}
              className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${
                locale === "en" ? "bg-primary/20 text-primary" : "hover:bg-surface-border text-foreground/80"
              }`}
            >
              English
            </button>
            <button
              onClick={() => changeLocale("es")}
              className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors border-t border-surface-border ${
                locale === "es" ? "bg-primary/20 text-primary" : "hover:bg-surface-border text-foreground/80"
              }`}
            >
              Español
            </button>
          </div>
        </>
      )}
    </div>
  );
}
