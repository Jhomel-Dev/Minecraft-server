import { use } from "react";
import { ModList } from "@/features/servers/components/ModList";
import { Package } from "lucide-react";

export default function ModsPage({ params }) {
  const unwrappedParams = use(params);
  const serverId = unwrappedParams.id;

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6 animate-in fade-in">
      <div className="flex items-center gap-4 bg-surface p-6 rounded-blocky border-2 border-surface-border shadow-sm">
        <div className="p-3 bg-primary/10 text-primary rounded-blocky">
          <Package className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-black">Plugins</h1>
          <p className="text-foreground/70 font-semibold">{serverId}</p>
        </div>
      </div>
      <ModList serverId={serverId} mode="plugins" />
    </div>
  );
}
