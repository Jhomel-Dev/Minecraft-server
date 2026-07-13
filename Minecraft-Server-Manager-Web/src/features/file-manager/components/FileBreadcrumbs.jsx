"use client";
import { ChevronRight, Home } from "lucide-react";
import { Button } from "@/shared/ui/Button";

export function FileBreadcrumbs({ path, onNavigate }) {
  const parts = path.split("/").filter(Boolean);

  return (
    <div className="flex items-center gap-2 text-sm font-mono bg-surface p-2 rounded-blocky border-2 border-surface-border w-fit shadow-sm">
      <Button 
        variant="outline" 
        className="p-2 h-8 border-none hover:bg-primary/10 hover:text-primary"
        onClick={() => onNavigate("")}
      >
        <Home className="w-4 h-4" />
      </Button>
      {parts.map((part, index) => {
        const currentPath = parts.slice(0, index + 1).join("/");
        return (
          <div key={index} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-foreground/40" />
            <Button 
              variant="outline" 
              className="px-2 h-8 border-none hover:bg-primary/10 hover:text-primary"
              onClick={() => onNavigate(currentPath)}
            >
              {part}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
