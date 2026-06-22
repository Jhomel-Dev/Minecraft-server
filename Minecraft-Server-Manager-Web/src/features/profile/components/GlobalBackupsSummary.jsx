import { ShieldAlert } from "lucide-react";

export function GlobalBackupsSummary() {
  return (
    <div className="bg-surface p-6 rounded-blocky border-2 border-surface-border shadow-sm flex flex-col gap-4 h-full">
      <div className="flex items-center gap-3">
        <ShieldAlert className="w-6 h-6 text-secondary" />
        <h2 className="text-xl font-bold">Estado de Seguridad</h2>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-surface-border rounded-blocky">
        <p className="text-foreground/70 font-semibold mb-2">Todos tus servidores están respaldados.</p>
        <span className="text-sm text-foreground/50">Último respaldo global hace 3 horas.</span>
      </div>
    </div>
  );
}
