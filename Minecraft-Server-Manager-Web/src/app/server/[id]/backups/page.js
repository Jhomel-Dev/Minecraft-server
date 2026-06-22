import { use } from "react";
import { BackupTable } from "@/features/servers/components/BackupTable";
import { Save, Plus } from "lucide-react";
import { Button } from "@/shared/ui/Button";

export default function BackupsPage({ params }) {
  const unwrappedParams = use(params);
  const serverId = unwrappedParams.id;

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6 animate-in fade-in">
      <div className="flex items-center justify-between bg-surface p-6 rounded-blocky border-2 border-surface-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-blocky">
            <Save className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black">Respaldos</h1>
            <p className="text-foreground/70 font-semibold">{serverId}</p>
          </div>
        </div>
        <Button variant="primary">
          <Plus className="w-5 h-5" /> Crear Backup
        </Button>
      </div>
      <BackupTable />
    </div>
  );
}
