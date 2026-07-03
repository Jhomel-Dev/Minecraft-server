"use client";
import { use, useState, useEffect } from "react";
import { Users, Ban, Shield, ShieldOff, Heart, Swords, Pickaxe, MapPin, Footprints, Clock, UserX, Activity, RefreshCw } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { getPlayers, fsOperation } from "@/features/servers/services/serverApi";

export default function PlayersPage({ params }) {
  const unwrappedParams = use(params);
  const serverId = unwrappedParams.id;
  
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      // Fetch data from NBT parser API
      const playersData = await getPlayers(serverId);
      
      // We can also fetch ops and bans if needed
      const opsRes = await fsOperation(serverId, { action: "read", filePath: "ops.json" }).catch(() => ({ content: "[]" }));
      const bansRes = await fsOperation(serverId, { action: "read", filePath: "banned-players.json" }).catch(() => ({ content: "[]" }));

      const ops = JSON.parse(opsRes.content || "[]");
      const bans = JSON.parse(bansRes.content || "[]");

      const opUuids = ops.map(op => op.uuid);
      const banUuids = bans.map(ban => ban.uuid);

      const enrichedPlayers = (Array.isArray(playersData) ? playersData : []).map(p => ({
        ...p,
        isOp: opUuids.includes(p.uuid),
        isBanned: banUuids.includes(p.uuid)
      }));

      setPlayers(enrichedPlayers);
    } catch (error) {
      console.error("Error loading players:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchPlayers, 10000);
    return () => clearInterval(interval);
  }, [serverId]);

  if (loading && players.length === 0) return <div className="p-8 text-center animate-pulse">Cargando datos de mundo...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in h-full">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-surface p-6 rounded-blocky border-2 border-surface-border shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-primary/10 text-primary rounded-blocky border-2 border-primary/20">
            <Users className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-3xl font-black">Jugadores</h1>
            <p className="text-foreground/70 font-semibold flex items-center gap-2">
              Estado, vida e inventario en tiempo real
            </p>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <Button variant="outline" onClick={fetchPlayers} disabled={loading} className="border-2 border-surface-border">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </Button>
          <div className="flex items-center gap-2 px-6 py-3 bg-background rounded-blocky border-2 border-surface-border">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="font-bold text-lg">
              {players.length} Registrados
            </span>
          </div>
        </div>
      </div>

      {/* Players Grid */}
      {players.length === 0 ? (
        <div className="text-center p-12 bg-surface border-2 border-surface-border rounded-blocky border-dashed">
          <UserX className="w-12 h-12 mx-auto text-foreground/30 mb-4" />
          <h3 className="font-bold text-xl text-foreground/70">No hay jugadores registrados</h3>
          <p className="text-foreground/50 mt-2">Los jugadores aparecerán aquí cuando entren al servidor y el mundo se guarde.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {players.map(player => (
            <div key={player.uuid} className="bg-surface border-2 border-surface-border rounded-blocky overflow-hidden shadow-sm">
              {/* Player Header */}
              <div className="p-4 border-b-2 border-surface-border flex items-center justify-between bg-surface-hover/30">
                <div className="flex items-center gap-4">
                  <img 
                    src={`https://crafatar.com/avatars/${player.uuid}?size=48&overlay`} 
                    alt={player.name}
                    className="w-12 h-12 rounded-lg border-2 border-surface-border bg-surface-border"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-xl">{player.name}</h3>
                      {player.isOp && <Shield className="w-4 h-4 text-warning fill-warning/20" title="Operador" />}
                      {player.isBanned && <Ban className="w-4 h-4 text-danger" title="Baneado" />}
                    </div>
                    <span className="text-xs text-foreground/50 font-mono">{player.uuid}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="text-warning border-warning hover:bg-warning hover:text-white" size="sm">
                    {player.isOp ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" className="text-danger border-danger hover:bg-danger hover:text-white" size="sm">
                    <Ban className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Player Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-surface-border border-b-2 border-surface-border bg-background">
                <div className="p-4 flex flex-col items-center justify-center gap-1">
                  <div className="flex items-center gap-1 text-red-500 font-bold">
                    <Heart className="w-4 h-4 fill-current" /> {Math.round(player.health)}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-foreground/50 tracking-wider">Vida</span>
                </div>
                <div className="p-4 flex flex-col items-center justify-center gap-1">
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Activity className="w-4 h-4" /> {Math.round(player.food)}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-foreground/50 tracking-wider">Hambre</span>
                </div>
                <div className="p-4 flex flex-col items-center justify-center gap-1">
                  <div className="flex items-center gap-1 text-green-500 font-bold">
                    XP {player.xpLevel}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-foreground/50 tracking-wider">Nivel</span>
                </div>
                <div className="p-4 flex flex-col items-center justify-center gap-1">
                  <div className="flex items-center gap-1 text-primary font-bold">
                    {player.inventory ? player.inventory.length : 0}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-foreground/50 tracking-wider">Items</span>
                </div>
              </div>

              {/* Player Inventory Preview */}
              <div className="p-4 bg-surface/50">
                <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-wider mb-3">Inventario (Vista previa)</h4>
                <div className="grid grid-cols-9 gap-1 max-w-full overflow-x-auto pb-2">
                  {/* Render 9 slots representing the hotbar */}
                  {Array.from({ length: 9 }).map((_, i) => {
                    const item = player.inventory?.find(item => item.slot === i);
                    return (
                      <div key={i} className="w-10 h-10 bg-background border-2 border-surface-border rounded flex items-center justify-center relative group">
                        {item ? (
                          <>
                            <div className="text-[10px] text-foreground truncate w-8 text-center" title={item.id.replace('minecraft:', '')}>
                              {item.id.split(':')[1].substring(0, 4)}...
                            </div>
                            {item.count > 1 && (
                              <span className="absolute -bottom-1 -right-1 bg-surface border border-surface-border text-[9px] font-bold px-1 rounded-sm z-10">
                                {item.count}
                              </span>
                            )}
                            <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-foreground text-background text-xs px-2 py-1 rounded z-50">
                              {item.id.replace('minecraft:', '')} x{item.count}
                            </div>
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
