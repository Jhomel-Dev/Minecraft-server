"use client";
import { use, useState, useEffect } from "react";
import { generateOfflineUUID } from "./offlineUuid";
import { Users, Ban, Shield, ShieldOff, Heart, Activity, RefreshCw, UserX, Skull, PlusSquare, MapPin, Navigation, Clock, ChevronLeft, X, ShieldCheck } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { getPlayers, fsOperation, sendCommand } from "@/features/servers/services/serverApi";

export default function PlayersPage({ params }) {
  const unwrappedParams = use(params);
  const serverId = unwrappedParams.id;
  
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commandError, setCommandError] = useState(null);
  const [addWhitelistName, setAddWhitelistName] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [isWhitelistEnabled, setIsWhitelistEnabled] = useState(false);
  const [isOnlineMode, setIsOnlineMode] = useState(true);
  const [isWhitelistView, setIsWhitelistView] = useState(false);
  const [whitelistUsers, setWhitelistUsers] = useState([]);

  const fetchWhitelistFile = async () => {
    try {
      const res = await fsOperation(serverId, { action: "read", filePath: "whitelist.json" });
      if (res && res.content) {
        setWhitelistUsers(JSON.parse(res.content));
      } else {
        setWhitelistUsers([]);
      }
    } catch(e) {
      setWhitelistUsers([]);
    }
  };

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      // Fetch data from NBT parser API
      const playersData = await getPlayers(serverId);
      
      const opsRes = await fsOperation(serverId, { action: "read", filePath: "ops.json" }).catch(() => ({ content: "[]" }));
      const bansRes = await fsOperation(serverId, { action: "read", filePath: "banned-players.json" }).catch(() => ({ content: "[]" }));
      const whitelistRes = await fsOperation(serverId, { action: "read", filePath: "whitelist.json" }).catch(() => ({ content: "[]" }));

      const ops = JSON.parse(opsRes.content || "[]");
      const bans = JSON.parse(bansRes.content || "[]");
      const whitelist = JSON.parse(whitelistRes.content || "[]");

      const opUuids = ops.map(op => op.uuid);
      const banUuids = bans.map(ban => ban.uuid);
      const whitelistNames = whitelist.map(w => w.name.toLowerCase()); // Whitelist sometimes relies on names or uuids depending on server mode

      const enrichedPlayers = (Array.isArray(playersData) ? playersData : []).map(p => ({
        ...p,
        isOp: opUuids.includes(p.uuid),
        isBanned: banUuids.includes(p.uuid),
        isWhitelisted: whitelistNames.includes(p.name.toLowerCase())
      }));

      // Add offline players that are on the whitelist but never joined (if we just want to list them)
      // Actually, let's keep it simple and just show the ones that exist in the NBT data
      setPlayers(enrichedPlayers);
    } catch (error) {
      console.error("Error loading players:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOfflineWhitelist = async (action, playerName) => {
    try {
      setCommandError(null);
      let whitelist = [];
      try {
        const fileRes = await fsOperation(serverId, { action: "read", filePath: "whitelist.json" });
        if (fileRes && fileRes.content) whitelist = JSON.parse(fileRes.content);
      } catch (e) {}

      if (action === "remove") {
        whitelist = whitelist.filter(p => p.name.toLowerCase() !== playerName.toLowerCase());
      } else if (action === "add") {
        if (whitelist.find(p => p.name.toLowerCase() === playerName.toLowerCase())) {
          fetchPlayers();
          return;
        }
        
        if (isOnlineMode) {
          const res = await fetch(`https://api.ashcon.app/mojang/v2/user/${playerName}`);
          if (!res.ok) throw new Error(`Jugador premium '${playerName}' no encontrado.`);
          const profile = await res.json();
          whitelist.push({ uuid: profile.uuid, name: profile.username });
        } else {
          // Aternos Style: Offline mode UUID generation
          const offlineUuid = await generateOfflineUUID(playerName);
          whitelist.push({ uuid: offlineUuid, name: playerName });
        }
      }

      await fsOperation(serverId, { action: "write", filePath: "whitelist.json", content: JSON.stringify(whitelist, null, 2) });
      
      // Artificial delay to let the UI feel natural
      setTimeout(fetchPlayers, 500); 
    } catch (err) {
      setCommandError(err.message || "Error al modificar la whitelist estando offline.");
      setTimeout(() => setCommandError(null), 5000);
    }
  };

  const handleOfflineOp = async (action, playerName) => {
    try {
      const res = await fsOperation(serverId, { action: "read", filePath: "ops.json" }).catch(() => ({ content: "[]" }));
      let ops = JSON.parse(res.content || "[]");

      if (action === "remove") {
        ops = ops.filter(p => p.name.toLowerCase() !== playerName.toLowerCase());
      } else if (action === "add") {
        if (!ops.find(p => p.name.toLowerCase() === playerName.toLowerCase())) {
          let uuid = players.find(p => p.name.toLowerCase() === playerName.toLowerCase())?.uuid;
          if (!uuid) {
            if (isOnlineMode) {
              const req = await fetch(`https://api.ashcon.app/mojang/v2/user/${playerName}`);
              if (!req.ok) throw new Error(`Jugador premium '${playerName}' no encontrado.`);
              uuid = (await req.json()).uuid;
            } else {
              uuid = await generateOfflineUUID(playerName);
            }
          }
          ops.push({ uuid, name: playerName, level: 4, bypassesPlayerLimit: false });
        }
      }
      await fsOperation(serverId, { action: "write", filePath: "ops.json", content: JSON.stringify(ops, null, 2) });
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleOfflineBan = async (action, playerName) => {
    try {
      const res = await fsOperation(serverId, { action: "read", filePath: "banned-players.json" }).catch(() => ({ content: "[]" }));
      let bans = JSON.parse(res.content || "[]");

      if (action === "remove") {
        bans = bans.filter(p => p.name.toLowerCase() !== playerName.toLowerCase());
      } else if (action === "add") {
        if (!bans.find(p => p.name.toLowerCase() === playerName.toLowerCase())) {
          let uuid = players.find(p => p.name.toLowerCase() === playerName.toLowerCase())?.uuid;
          if (!uuid) {
            if (isOnlineMode) {
              const req = await fetch(`https://api.ashcon.app/mojang/v2/user/${playerName}`);
              if (!req.ok) throw new Error(`Jugador premium '${playerName}' no encontrado.`);
              uuid = (await req.json()).uuid;
            } else {
              uuid = await generateOfflineUUID(playerName);
            }
          }
          bans.push({
            uuid, name: playerName,
            created: new Date().toISOString().split('T')[0] + " 00:00:00 -0000",
            source: "Server Manager Web",
            expires: "forever",
            reason: "Banned by an operator."
          });
        }
      }
      await fsOperation(serverId, { action: "write", filePath: "banned-players.json", content: JSON.stringify(bans, null, 2) });
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleCommand = async (command) => {
    try {
      setCommandError(null);
      await sendCommand(serverId, command);
      setTimeout(() => {
        fetchPlayers();
        if (isWhitelistView) fetchWhitelistFile();
      }, 500); 
    } catch (err) {
      const parts = command.split(" ");
      try {
        if (command.startsWith("whitelist ") && parts.length >= 3) {
          await handleOfflineWhitelist(parts[1], parts[2]);
          if (isWhitelistView) setTimeout(fetchWhitelistFile, 500);
          fetchPlayers();
          return;
        } else if (command.startsWith("op ")) {
          await handleOfflineOp("add", parts[1]);
          fetchPlayers();
          return;
        } else if (command.startsWith("deop ")) {
          await handleOfflineOp("remove", parts[1]);
          fetchPlayers();
          return;
        } else if (command.startsWith("ban ")) {
          await handleOfflineBan("add", parts[1]);
          fetchPlayers();
          return;
        } else if (command.startsWith("pardon ")) {
          await handleOfflineBan("remove", parts[1]);
          fetchPlayers();
          return;
        }
      } catch (offlineErr) {
        setCommandError(offlineErr.message || "Error al modificar archivos offline.");
        setTimeout(() => setCommandError(null), 5000); 
        return;
      }
      
      setCommandError(err.message || "Error al ejecutar el comando. Asegúrate de que el servidor esté ONLINE.");
      setTimeout(() => setCommandError(null), 5000); 
    }
  };

  const handleKick = (playerName) => handleCommand(`kick ${playerName}`);
  const handleBanToggle = (player) => handleCommand(player.isBanned ? `pardon ${player.name}` : `ban ${player.name}`);
  const handleOpToggle = (player) => handleCommand(player.isOp ? `deop ${player.name}` : `op ${player.name}`);
  const handleWhitelistToggle = (player) => handleCommand(player.isWhitelisted ? `whitelist remove ${player.name}` : `whitelist add ${player.name}`);

  const handleAddWhitelist = (e) => {
    e.preventDefault();
    if (!addWhitelistName) return;
    handleCommand(`whitelist add ${addWhitelistName}`);
    setAddWhitelistName("");
  };

  const checkWhitelistStatus = async () => {
    try {
      const res = await fsOperation(serverId, { action: "read", filePath: "server.properties" });
      if (res && res.content) {
        const lines = res.content.split('\n');
        for (const line of lines) {
          if (line.startsWith('white-list=')) {
            setIsWhitelistEnabled(line.split('=')[1].trim() === 'true');
          }
          if (line.startsWith('online-mode=')) {
            setIsOnlineMode(line.split('=')[1].trim() === 'true');
          }
        }
      }
    } catch (err) {
      console.error("Error comprobando whitelist:", err);
    }
  };

  useEffect(() => {
    fetchPlayers();
    checkWhitelistStatus();
    
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
          <div className={`p-4 rounded-blocky border-2 ${isWhitelistView ? 'bg-primary/20 text-primary border-primary/40' : 'bg-primary/10 text-primary border-primary/20'}`}>
            {isWhitelistView ? <ShieldCheck className="w-10 h-10" /> : <Users className="w-10 h-10" />}
          </div>
          <div>
            <h1 className="text-3xl font-black">{isWhitelistView ? "Lista Blanca" : "Jugadores"}</h1>
            <p className="text-foreground/70 font-semibold">
              {isWhitelistView ? "Gestiona el acceso exclusivo al servidor" : selectedPlayer ? `Inspeccionando a ${selectedPlayer.name}` : "Gestiona las conexiones y el progreso del servidor"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 h-12">
          {!selectedPlayer && !isWhitelistView && (
            <>
              {isWhitelistEnabled && (
                <Button variant="outline" onClick={() => { setIsWhitelistView(true); fetchWhitelistFile(); }} className="h-full border-2 border-surface-border text-primary hover:bg-primary/10 hover:border-primary/50">
                  <ShieldCheck className="w-4 h-4 mr-2" /> Gestor de Whitelist
                </Button>
              )}
              <Button variant="outline" onClick={fetchPlayers} disabled={loading} className="h-full border-2 border-surface-border">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Actualizar
              </Button>
              <div className="h-full flex items-center justify-center gap-2 px-4 border-2 border-surface-border rounded-blocky text-sm font-bold text-foreground">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                <span>
                  {players.length} Registrados
                </span>
              </div>
            </>
          )}
          {(selectedPlayer || isWhitelistView) && (
            <Button variant="outline" onClick={() => { setSelectedPlayer(null); setIsWhitelistView(false); }} className="h-full border-2 border-surface-border">
              <ChevronLeft className="w-4 h-4 mr-2" /> Volver a la Lista
            </Button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {commandError && (
        <div className="bg-danger/10 border-2 border-danger text-danger p-4 rounded-blocky flex items-center justify-between animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3 font-bold">
            <span className="text-xl">⚠️</span>
            <span>{commandError}</span>
          </div>
          <button 
            onClick={() => setCommandError(null)} 
            className="text-danger hover:text-danger/70 transition-colors font-black text-xl px-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Players List, Whitelist View, or Selected Player */}
      {isWhitelistView ? (
        <div className="bg-surface border-2 border-surface-border rounded-blocky p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 shadow-sm relative overflow-hidden">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b-2 border-surface-border pb-6">
            <div>
              <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-primary" /> 
                Gestor de Whitelist
              </h2>
              <p className="text-foreground/60 text-sm mt-1 font-semibold">Jugadores autorizados para entrar al servidor.</p>
            </div>
            
            <form onSubmit={handleAddWhitelist} className="flex gap-2 w-full md:w-auto h-11">
              <input 
                type="text" 
                placeholder="Nombre del jugador..." 
                value={addWhitelistName}
                onChange={e => setAddWhitelistName(e.target.value)}
                className="h-full bg-background border-2 border-surface-border rounded-blocky px-4 outline-none focus:border-primary flex-1 md:w-64 font-bold text-foreground"
              />
              <Button type="submit" disabled={!addWhitelistName.trim()} className="h-full px-6 font-bold shrink-0">
                Añadir
              </Button>
            </form>
          </div>
          
          {whitelistUsers.length === 0 ? (
            <div className="text-center py-12 bg-background border-2 border-surface-border rounded-blocky border-dashed">
              <ShieldOff className="w-12 h-12 mx-auto text-foreground/30 mb-4" />
              <h3 className="font-bold text-xl text-foreground/70">La Lista Blanca está vacía</h3>
              <p className="text-foreground/50 mt-2">Nadie está en la whitelist. Añade un jugador usando el campo de arriba.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {whitelistUsers.map(user => (
                <div key={user.uuid} className="bg-background border-2 border-surface-border rounded-blocky p-4 flex items-center justify-between hover:border-primary/50 transition-colors shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={`https://mc-heads.net/avatar/${user.name}/40`} 
                      alt={user.name} 
                      className="w-10 h-10 rounded shadow-sm border-2 border-surface-border shrink-0"
                      onError={(e) => { e.target.src = 'https://mc-heads.net/avatar/MHF_Steve/40'; }}
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-base text-foreground truncate">{user.name}</h4>
                      <p className="text-[10px] text-foreground/50 font-mono truncate">{user.uuid}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => handleCommand(`whitelist remove ${user.name}`)} 
                    className="border-2 border-danger text-danger hover:bg-danger hover:text-white h-10 px-4 shrink-0 ml-2"
                  >
                    Eliminar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : selectedPlayer ? (
        <PlayerCard 
          player={players.find(p => p.uuid === selectedPlayer.uuid) || selectedPlayer} 
          handleKick={handleKick}
          handleOpToggle={handleOpToggle}
          handleBanToggle={handleBanToggle}
          handleWhitelistToggle={handleWhitelistToggle}
          handleCommand={handleCommand}
        />
      ) : players.length === 0 ? (
        <div className="text-center p-12 bg-surface border-2 border-surface-border rounded-blocky border-dashed">
          <UserX className="w-12 h-12 mx-auto text-foreground/30 mb-4" />
          <h3 className="font-bold text-xl text-foreground/70">No hay jugadores registrados</h3>
          <p className="text-foreground/50 mt-2">Los jugadores aparecerán aquí cuando entren al servidor y el mundo se guarde.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {players.map(player => (
            <div 
              key={player.uuid} 
              onClick={() => setSelectedPlayer(player)}
              className="bg-surface border-2 border-surface-border rounded-blocky overflow-hidden shadow-sm hover:border-primary/50 hover:shadow-[0_0_15px_rgba(255,74,74,0.1)] transition-all cursor-pointer group"
            >
              <div className="p-4 flex items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-primary/10 transition-colors"></div>
                <img 
                  src={`https://crafatar.com/avatars/${player.uuid}?size=48&overlay`} 
                  alt={player.name}
                  className="w-12 h-12 rounded-lg border-2 border-surface-border bg-surface-border shadow-sm z-10"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="z-10 flex-1">
                  <div className="flex items-center justify-between w-full">
                    <h3 className="font-bold text-lg truncate pr-2 group-hover:text-primary transition-colors">{player.name}</h3>
                    {player.isOnline ? (
                      <div className="w-3 h-3 rounded-full bg-green-500 border border-green-700 animate-pulse-slow shrink-0" title="Conectado Ahora"></div>
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-foreground/20 border border-surface-border shrink-0" title="Desconectado"></div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-1">
                    {player.isOp && <Shield className="w-3 h-3 text-warning fill-warning/20" title="Operador" />}
                    {player.isBanned && <Ban className="w-3 h-3 text-danger" title="Baneado" />}
                  </div>
                </div>
              </div>
              <div className="bg-background px-4 py-2 border-t-2 border-surface-border flex justify-between items-center">
                <div className="flex gap-3 text-xs font-bold text-foreground/70">
                  <span className="flex items-center gap-1 text-red-500"><Heart className="w-3 h-3 fill-current"/> {Math.round(player.health)}</span>
                  <span className="flex items-center gap-1 text-amber-500"><Activity className="w-3 h-3"/> {Math.round(player.food)}</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-foreground/50 tracking-wider">Ver Panel →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerCard({ player, handleKick, handleOpToggle, handleBanToggle, handleWhitelistToggle, handleCommand }) {
  const [tpCoords, setTpCoords] = useState({ x: "", y: "", z: "" });
  const [tpDimension, setTpDimension] = useState(player.dimension || "minecraft:overworld");
  const [isTpModalOpen, setIsTpModalOpen] = useState(false);

  const handleHeal = () => handleCommand(`effect give ${player.name} instant_health 1 100`);
  const handleKill = () => handleCommand(`kill ${player.name}`);
  const handleTp = () => {
    if (!tpCoords.x || !tpCoords.y || !tpCoords.z) return;
    handleCommand(`execute in ${tpDimension} run tp ${player.name} ${tpCoords.x} ${tpCoords.y} ${tpCoords.z}`);
    setIsTpModalOpen(false);
    setTpCoords({ x: "", y: "", z: "" });
  };

  const getSpriteUrl = (id) => {
    const cleanId = id.replace('minecraft:', '');
    return `https://assets.mcasset.cloud/1.20.4/assets/minecraft/textures/item/${cleanId}.png`;
  };
  const getBlockSpriteUrl = (id) => {
    const cleanId = id.replace('minecraft:', '');
    return `https://assets.mcasset.cloud/1.20.4/assets/minecraft/textures/block/${cleanId}.png`;
  };

  const formatTicksToTime = (ticks) => {
    const seconds = Math.floor(ticks / 20);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatCm = (cm) => {
    if (cm > 100000) return `${(cm / 100000).toFixed(2)} km`;
    return `${Math.floor(cm / 100)} m`;
  };

  const toRoman = (num) => {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    return roman[num] || num;
  };

  // Minecraft main inventory: 9-35. Hotbar: 0-8.
  const inventorySlots = [];
  for (let i = 9; i <= 35; i++) inventorySlots.push(i);
  for (let i = 0; i <= 8; i++) inventorySlots.push(i); // hotbar at the bottom

  return (
    <div className="bg-surface border-2 border-surface-border rounded-blocky overflow-hidden shadow-sm flex flex-col h-full">
      {/* HEADER */}
      <div className="p-4 border-b-2 border-surface-border flex flex-col md:flex-row md:items-center justify-between bg-surface-hover/30 gap-4">
        <div className="flex items-center gap-4">
          <img 
            src={`https://crafatar.com/avatars/${player.uuid}?size=48&overlay`} 
            alt={player.name}
            className="w-12 h-12 rounded-lg border-2 border-surface-border bg-surface-border shadow-sm"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xl">{player.name}</h3>
              {player.isOnline ? (
                <div className="w-3 h-3 rounded-full bg-green-500 border border-green-700 animate-pulse-slow" title="Conectado Ahora"></div>
              ) : (
                <div className="w-3 h-3 rounded-full bg-foreground/20 border border-surface-border" title="Desconectado"></div>
              )}
              {player.isOp && <Shield className="w-4 h-4 text-warning fill-warning/20" title="Operador" />}
              {player.isBanned && <Ban className="w-4 h-4 text-danger" title="Baneado" />}
            </div>
            <span className="text-xs text-foreground/50 font-mono">{player.uuid}</span>
          </div>
        </div>

        {/* PRIMARY ACTIONS */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="text-secondary border-secondary hover:bg-secondary hover:text-white h-8 text-xs" onClick={() => handleKick(player.name)} title="Expulsar (Kick)">
            Kick
          </Button>
          <Button variant="outline" className="text-primary border-primary hover:bg-primary hover:text-white h-8 text-xs" onClick={() => handleWhitelistToggle(player)} title={player.isWhitelisted ? "Quitar de Whitelist" : "Añadir a Whitelist"}>
            {player.isWhitelisted ? "W-ON" : "W-OFF"}
          </Button>
          <Button variant="outline" className="text-warning border-warning hover:bg-warning hover:text-white h-8 text-xs px-2" onClick={() => handleOpToggle(player)} title={player.isOp ? "Quitar OP" : "Dar OP"}>
            {player.isOp ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
          </Button>
          <Button variant="outline" className="text-danger border-danger hover:bg-danger hover:text-white h-8 text-xs px-2" onClick={() => handleBanToggle(player)} title={player.isBanned ? "Desbanear" : "Banear"}>
            <Ban className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-background">
        
        {/* LEFT COL: Inventory UI (Akira Aesthetic) */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-wider text-primary">Inventario Táctico</h4>
            <div className="flex gap-2">
              <span className="text-xs font-bold text-red-500 flex items-center gap-1"><Heart className="w-3 h-3 fill-current"/> {Math.round(player.health)}</span>
              <span className="text-xs font-bold text-amber-500 flex items-center gap-1"><Activity className="w-3 h-3"/> {Math.round(player.food)}</span>
              <span className="text-xs font-bold text-green-500 flex items-center gap-1">XP {player.xpLevel}</span>
            </div>
          </div>
          
          <div className="bg-background p-4 rounded-xl border-2 border-surface-border shadow-sm inline-flex flex-col gap-4 mx-auto lg:mx-0 w-max relative">
            
            {/* TOP SECTION: Armor, Render, Offhand */}
            <div className="flex items-center justify-center gap-6 mb-2">
              {/* Armor Slots */}
              <div className="flex flex-col gap-1">
                {[103, 102, 101, 100].map(slotId => {
                  const item = player.inventory?.find(item => item.slot === slotId);
                  return (
                    <div key={slotId} className="w-10 h-10 bg-surface border-2 border-surface-border rounded flex items-center justify-center relative group hover:border-primary transition-colors">
                      {item && (
                        <>
                          <img src={getSpriteUrl(item.id)} onError={(e) => { e.target.src = getBlockSpriteUrl(item.id); }} alt={item.id} style={{ imageRendering: 'pixelated' }} className="w-7 h-7 object-contain drop-shadow-sm" />
                          <div className="absolute hidden group-hover:flex flex-col bottom-full left-1/2 -translate-x-1/2 mb-1 w-max min-w-[120px] bg-background/95 text-foreground text-xs px-3 py-2 rounded-md border-2 border-surface-border z-50 pointer-events-none shadow-lg whitespace-nowrap">
                            <span className={`capitalize font-bold ${item.customName ? 'text-primary italic' : item.enchantments?.length > 0 ? 'text-primary' : 'text-foreground'}`}>
                              {item.customName || item.id.replace('minecraft:', '').replace(/_/g, ' ')}
                            </span>
                            {item.enchantments?.map((ench, i) => (
                              <span key={i} className="text-foreground/70">
                                {ench.id.replace(/_/g, ' ')} {toRoman(ench.lvl)}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Front-Facing Player Render */}
                <div className="relative w-24 h-48 flex justify-center items-center -mt-8">
                  <div className="absolute w-24 h-24 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
                  <img 
                    src={`https://minotar.net/armor/body/${player.name}/200.png`} 
                    alt={player.name} 
                    style={{ imageRendering: 'pixelated' }}
                    className="relative z-10 w-full h-full object-contain drop-shadow-md"
                    onError={(e) => { e.target.src = 'https://minotar.net/armor/body/MHF_Steve/200.png'; }}
                  />
                </div>

              {/* Offhand Slot */}
              <div className="flex flex-col justify-end h-full">
                <div className="w-10 h-10 bg-surface border-2 border-surface-border rounded flex items-center justify-center relative group hover:border-primary transition-colors mt-auto">
                  {(() => {
                    const item = player.inventory?.find(item => item.slot === -106 || item.slot === 106); // Sometimes -106 is parsed differently depending on nbt lib
                    return item ? (
                      <>
                        <img src={getSpriteUrl(item.id)} onError={(e) => { e.target.src = getBlockSpriteUrl(item.id); }} alt={item.id} className="w-7 h-7 object-contain pixelated drop-shadow-sm" />
                        <div className="absolute hidden group-hover:flex flex-col bottom-full left-1/2 -translate-x-1/2 mb-1 w-max min-w-[120px] bg-background/95 text-foreground text-xs px-3 py-2 rounded-md border-2 border-surface-border z-50 pointer-events-none shadow-lg">
                          <span className={`capitalize font-bold ${item.customName ? 'text-primary italic' : item.enchantments?.length > 0 ? 'text-primary' : 'text-foreground'}`}>
                            {item.customName || item.id.replace('minecraft:', '').replace(/_/g, ' ')}
                          </span>
                          {item.enchantments?.map((ench, i) => (
                            <span key={i} className="text-foreground/70">
                              {ench.id.replace(/_/g, ' ')} {toRoman(ench.lvl)}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <Shield className="w-4 h-4 text-primary/20" /> // Shield icon placeholder for offhand
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Main Inventory (Slots 9-35) */}
            <div className="grid grid-cols-9 gap-1 mb-2">
              {inventorySlots.slice(0, 27).map((slotId) => {
                const item = player.inventory?.find(item => item.slot === slotId);
                return (
                  <div key={slotId} className="w-10 h-10 bg-surface border-2 border-surface-border rounded flex items-center justify-center relative group hover:border-primary/80 transition-colors">
                    {item ? (
                      <>
                          <img 
                            src={getSpriteUrl(item.id)} 
                            onError={(e) => { e.target.src = getBlockSpriteUrl(item.id); }}
                            alt={item.id}
                            style={{ imageRendering: 'pixelated' }}
                            className="w-7 h-7 object-contain drop-shadow-sm"
                          />
                        {item.count > 1 && (
                          <span className="absolute -bottom-1 -right-1 text-white font-black text-[10px] z-10" style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>
                            {item.count}
                          </span>
                        )}
                        <div className="absolute hidden group-hover:flex flex-col bottom-full left-1/2 -translate-x-1/2 mb-1 w-max min-w-[120px] bg-background/95 text-foreground text-xs px-3 py-2 rounded-md border-2 border-surface-border z-50 pointer-events-none shadow-lg">
                          <span className={`capitalize font-bold ${item.customName ? 'text-primary italic' : item.enchantments?.length > 0 ? 'text-primary' : 'text-foreground'}`}>
                            {item.customName || item.id.replace('minecraft:', '').replace(/_/g, ' ')}
                          </span>
                          {item.enchantments?.map((ench, i) => (
                            <span key={i} className="text-foreground/70">
                              {ench.id.replace(/_/g, ' ')} {toRoman(ench.lvl)}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
            
            {/* Hotbar (Slots 0-8) */}
            <div className="grid grid-cols-9 gap-1 mt-1 pt-3 border-t-2 border-surface-border">
              {inventorySlots.slice(27).map((slotId) => {
                const item = player.inventory?.find(item => item.slot === slotId);
                return (
                  <div key={slotId} className="w-10 h-10 bg-surface border-2 border-surface-border rounded flex items-center justify-center relative group hover:border-primary/80 transition-colors">
                    {item ? (
                      <>
                        <img 
                          src={getSpriteUrl(item.id)} 
                          onError={(e) => { e.target.src = getBlockSpriteUrl(item.id); }}
                          alt={item.id}
                          style={{ imageRendering: 'pixelated' }}
                          className="w-7 h-7 object-contain drop-shadow-sm"
                        />
                        {item.count > 1 && (
                          <span className="absolute -bottom-1 -right-1 text-white font-black text-[10px] z-10" style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>
                            {item.count}
                          </span>
                        )}
                        <div className="absolute hidden group-hover:flex flex-col bottom-full left-1/2 -translate-x-1/2 mb-1 w-max min-w-[120px] bg-background/95 text-foreground text-xs px-3 py-2 rounded-md border-2 border-surface-border z-50 pointer-events-none shadow-lg">
                          <span className={`capitalize font-bold ${item.customName ? 'text-primary italic' : item.enchantments?.length > 0 ? 'text-primary' : 'text-foreground'}`}>
                            {item.customName || item.id.replace('minecraft:', '').replace(/_/g, ' ')}
                          </span>
                          {item.enchantments?.map((ench, i) => (
                            <span key={i} className="text-foreground/70">
                              {ench.id.replace(/_/g, ' ')} {toRoman(ench.lvl)}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COL: Stats & Actions */}
        <div className="flex flex-col gap-6">
          
          {/* Quick Actions */}
          <div>
            <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-wider mb-2">Acciones Rápidas</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleHeal} className="bg-red-500/10 text-red-500 border-2 border-red-500 hover:bg-red-500 hover:text-white h-9 text-xs">
                <PlusSquare className="w-4 h-4 mr-1" /> Curar
              </Button>
              <Button onClick={handleKill} className="bg-foreground/10 text-foreground border-2 border-foreground hover:bg-foreground hover:text-background h-9 text-xs">
                <Skull className="w-4 h-4 mr-1" /> Matar
              </Button>
              <Button onClick={() => setIsTpModalOpen(true)} className="col-span-2 bg-primary/10 text-primary border-2 border-primary hover:bg-primary hover:text-primary-foreground h-9 text-xs">
                <Navigation className="w-4 h-4 mr-1" /> Teletransportar (TP)
              </Button>
            </div>
          </div>

          {/* Player Stats Details */}
          <div>
            <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-wider mb-2">Estadísticas y Ubicación</h4>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-sm p-2 bg-surface rounded-blocky border-2 border-surface-border">
                <span className="text-foreground/70 flex items-center gap-2"><MapPin className="w-4 h-4" /> Dimensión</span>
                <span className="font-bold capitalize truncate max-w-[150px]">{player.dimension?.replace('minecraft:', '').replace(/_/g, ' ') || 'overworld'}</span>
              </div>
              <div className="flex justify-between items-center text-sm p-2 bg-surface rounded-blocky border-2 border-surface-border">
                <span className="text-foreground/70 flex items-center gap-2"><Navigation className="w-4 h-4" /> Coordenadas</span>
                <span className="font-bold font-mono text-primary">{player.pos ? `${player.pos[0]}, ${player.pos[1]}, ${player.pos[2]}` : '0, 0, 0'}</span>
              </div>
              <div className="flex justify-between items-center text-sm p-2 bg-surface rounded-blocky border-2 border-surface-border">
                <span className="text-foreground/70 flex items-center gap-2"><Clock className="w-4 h-4" /> Tiempo Jugado</span>
                <span className="font-bold">{formatTicksToTime(player.stats?.playTime || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm p-2 bg-surface rounded-blocky border-2 border-surface-border">
                <span className="text-foreground/70 flex items-center gap-2"><Skull className="w-4 h-4 text-red-500" /> Muertes</span>
                <span className="font-bold text-red-500">{player.stats?.deaths || 0}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
      {/* TP Modal Overlay */}
      {isTpModalOpen && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-primary rounded-xl shadow-[0_0_30px_rgba(255,74,74,0.15)] w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b-2 border-surface-border flex justify-between items-center bg-background/50">
              <h3 className="font-black text-lg text-primary flex items-center gap-2">
                <Navigation className="w-5 h-5" />
                Coordenadas Tácticas
              </h3>
              <button onClick={() => setIsTpModalOpen(false)} className="text-foreground/50 hover:text-danger transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-foreground/50 uppercase tracking-wider mb-2 block">Dimensión Destino</label>
                <select 
                  value={tpDimension} 
                  onChange={e => setTpDimension(e.target.value)}
                  className="w-full bg-background border-2 border-surface-border rounded-blocky px-3 py-2 font-bold outline-none focus:border-primary appearance-none"
                >
                  <option value="minecraft:overworld">Overworld (Mundo Normal)</option>
                  <option value="minecraft:the_nether">The Nether (Inframundo)</option>
                  <option value="minecraft:the_end">The End (El Fin)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground/50 uppercase tracking-wider mb-2 block">Vectores XYZ</label>
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" placeholder="X" value={tpCoords.x} onChange={e => setTpCoords({...tpCoords, x: e.target.value})} className="bg-background border-2 border-surface-border rounded-blocky px-3 py-2 font-bold outline-none focus:border-primary text-center w-full" />
                  <input type="number" placeholder="Y" value={tpCoords.y} onChange={e => setTpCoords({...tpCoords, y: e.target.value})} className="bg-background border-2 border-surface-border rounded-blocky px-3 py-2 font-bold outline-none focus:border-primary text-center w-full" />
                  <input type="number" placeholder="Z" value={tpCoords.z} onChange={e => setTpCoords({...tpCoords, z: e.target.value})} className="bg-background border-2 border-surface-border rounded-blocky px-3 py-2 font-bold outline-none focus:border-primary text-center w-full" />
                </div>
              </div>

              <Button onClick={handleTp} disabled={!tpCoords.x || !tpCoords.y || !tpCoords.z} className="w-full mt-2 h-10">
                Iniciar Secuencia de Salto
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
