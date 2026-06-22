"use client";
import { Button } from "@/shared/ui/Button";
import { RefreshCw, Trash2, DownloadCloud } from "lucide-react";

export function BackupTable() {
  const backups = [
    { id: "b1", date: "2026-06-21 14:30", size: "450 MB", status: "success" },
    { id: "b2", date: "2026-06-20 03:00", size: "448 MB", status: "success" },
    { id: "b3", date: "2026-06-19 03:00", size: "445 MB", status: "success" },
  ];

  if (backups.length === 0) {
    return (
      <div className="text-center p-8 bg-surface border-2 border-surface-border rounded-blocky">
        <p className="text-foreground/60 font-semibold">No hay respaldos disponibles.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border-2 border-surface-border rounded-blocky overflow-hidden shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-border/30 text-foreground">
            <th className="p-4 font-bold border-b-2 border-surface-border">Fecha del Respaldo</th>
            <th className="p-4 font-bold border-b-2 border-surface-border">Tamaño</th>
            <th className="p-4 font-bold border-b-2 border-surface-border text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {backups.map((backup) => (
            <tr key={backup.id} className="hover:bg-surface-hover/50 transition-colors">
              <td className="p-4 border-b border-surface-border/50 text-foreground/80 font-mono text-sm">{backup.date}</td>
              <td className="p-4 border-b border-surface-border/50 text-foreground/80 font-mono text-sm">{backup.size}</td>
              <td className="p-4 border-b border-surface-border/50 flex justify-end gap-2">
                <Button variant="outline" className="p-2 h-10" title="Descargar Zip">
                  <DownloadCloud className="w-4 h-4 text-primary" />
                </Button>
                <Button variant="outline" className="p-2 h-10" title="Restaurar Servidor">
                  <RefreshCw className="w-4 h-4 text-secondary" />
                </Button>
                <Button variant="outline" className="p-2 h-10 hover:bg-danger/10" title="Eliminar Respaldo">
                  <Trash2 className="w-4 h-4 text-danger" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
