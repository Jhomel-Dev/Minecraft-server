"use client";
import { useEffect, useState, use } from "react";
import { getMyServers, updateSettings, deleteServer, fsOperation } from "@/features/servers/services/serverApi";
import { Settings, Save, ShieldCheck, Users, HardDrive, Wifi, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { useRouter } from "next/navigation";
import { useToast } from "@/shared/ui/ToastProvider";

export default function ServerOptionsPage({ params }) {
  const unwrappedParams = use(params);
  const serverId = unwrappedParams.id;
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    maxPlayers: 20,
    whitelist: false,
    onlineMode: true,
    compatibilityMode: false,
    memory: "2048"
  });

  const [properties, setProperties] = useState({});
  const [rawPropertiesOrder, setRawPropertiesOrder] = useState([]);
  const [rawContent, setRawContent] = useState("");

  useEffect(() => {
    loadData();
  }, [serverId]);

  const loadData = async () => {
    try {
      const servers = await getMyServers();
      const server = servers.find(s => s.id === serverId);
      if (server) {
        setSettings({
          maxPlayers: server.maxPlayers ?? 20,
          whitelist: server.whitelist ?? false,
          onlineMode: server.onlineMode ?? true,
          compatibilityMode: server.compatibilityMode ?? false,
          memory: server.memory ?? "2048"
        });
      }

      const fileRes = await fsOperation(serverId, { action: "read", filePath: "server.properties" });
      if (fileRes && fileRes.content) {
        setRawContent(fileRes.content);
        const lines = fileRes.content.split("\n");
        const parsed = {};
        const order = [];
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#")) {
            const idx = trimmed.indexOf('=');
            if (idx > -1) {
              const key = trimmed.substring(0, idx).trim();
              const val = trimmed.substring(idx + 1).trim();
              parsed[key] = val;
              order.push(key);
            }
          }
        }
        setProperties(parsed);
        setRawPropertiesOrder(order);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(serverId, settings);
      
      // Sync DB settings to properties
      const mergedProps = {
        ...properties,
        "max-players": settings.maxPlayers.toString(),
        "white-list": settings.whitelist.toString(),
        "online-mode": settings.onlineMode.toString()
      };
      
      const lines = rawContent.split('\n');
      const newLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;
        const idx = trimmed.indexOf('=');
        if (idx > -1) {
          const key = trimmed.substring(0, idx).trim();
          if (mergedProps.hasOwnProperty(key)) {
            return `${key}=${mergedProps[key]}`;
          }
        }
        return line;
      });

      // Add missing keys
      Object.keys(mergedProps).forEach(key => {
        if (!lines.some(l => l.split('=')[0].trim() === key && !l.trim().startsWith('#'))) {
          newLines.push(`${key}=${mergedProps[key]}`);
        }
      });
      
      const propsString = newLines.join("\n");
      
      await fsOperation(serverId, {
        action: "write",
        filePath: "server.properties",
        content: propsString
      });
      setRawContent(propsString);
      toast("Opciones guardadas correctamente. Reinicia el servidor para aplicar los cambios.", "success");
    } catch (error) {
      console.error(error);
      toast("Error al guardar: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [keepFiles, setKeepFiles] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteServer(serverId, keepFiles);
      router.push("/servers");
    } catch (error) {
      toast("Error: " + error.message, "error");
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateProperty = (key, value) => {
    setProperties(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="p-8 text-center font-bold text-foreground/50">Cargando opciones...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col gap-6 h-full animate-in fade-in pb-24">
      <div className="flex items-center justify-between bg-surface p-6 rounded-blocky border-2 border-surface-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-blocky">
            <Settings className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black">Opciones del Servidor</h1>
            <p className="text-foreground/70 font-semibold">Configura las reglas y parámetros de tu mundo</p>
          </div>
        </div>
        
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          <Save className="w-5 h-5 mr-2 inline-block" /> 
          {saving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Jugadores */}
        <div className="bg-surface border-2 border-surface-border p-6 rounded-blocky shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b-2 border-surface-border pb-4">
            <Users className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">Jugadores</h2>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="font-bold text-sm text-foreground/80">Límite de Jugadores (Slots)</label>
            <Input 
              type="number" 
              min="1" 
              max="10000"
              value={settings.maxPlayers}
              onChange={(e) => setSettings({ ...settings, maxPlayers: e.target.value })}
              onBlur={() => {
                let val = parseInt(settings.maxPlayers);
                if (isNaN(val) || val < 1) val = 1;
                if (val > 100000) val = 100000;
                setSettings({ ...settings, maxPlayers: val });
              }}
            />
          </div>
        </div>

        {/* Seguridad */}
        <div className="bg-surface border-2 border-surface-border p-6 rounded-blocky shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b-2 border-surface-border pb-4">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">Seguridad</h2>
          </div>
          
          <ToggleOption 
            title="Online Mode (Premium)" 
            description="Si se desactiva, podrán entrar jugadores 'No Premium' (Craqueado)."
            checked={settings.onlineMode}
            onToggle={() => toggleSetting('onlineMode')}
            icon={<Wifi className="w-5 h-5" />}
          />
          
          <ToggleOption 
            title="Lista Blanca (Whitelist)" 
            description="Solo los jugadores en la lista blanca podrán entrar al servidor."
            checked={settings.whitelist}
            onToggle={() => toggleSetting('whitelist')}
            icon={<ShieldCheck className="w-5 h-5" />}
          />
        </div>

        {/* Rendimiento & Hardware */}
        <div className="bg-surface border-2 border-surface-border p-6 rounded-blocky shadow-sm flex flex-col gap-4 md:col-span-2">
          <div className="flex items-center gap-3 border-b-2 border-surface-border pb-4">
            <HardDrive className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">Rendimiento y Hardware</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="font-bold text-sm text-foreground/80">Memoria RAM Asignada</label>
              <select 
                value={settings.memory}
                onChange={(e) => setSettings({ ...settings, memory: e.target.value })}
                className="bg-background border-2 border-surface-border rounded-blocky px-4 py-2 font-semibold text-foreground focus:outline-none focus:border-primary transition-colors appearance-none"
              >
                <option value="1024">1 GB (Básico, Vanilla)</option>
                <option value="2048">2 GB (Recomendado, pocos plugins)</option>
                <option value="4096">4 GB (Avanzado, muchos plugins)</option>
                <option value="6144">6 GB (Extremo, servidores grandes)</option>
                <option value="8192">8 GB (Máximo rendimiento)</option>
              </select>
            </div>

            <ToggleOption 
              title="Modo de Compatibilidad" 
              description="Desactiva 'Zero-Copy' y clona el JAR localmente. Útil si tienes problemas al arrancar mods."
              checked={settings.compatibilityMode}
              onToggle={() => toggleSetting('compatibilityMode')}
              icon={<ShieldAlert className="w-5 h-5" />}
              danger
            />
          </div>
        </div>

        {/* server.properties Avanzado */}
        <div className="bg-surface border-2 border-surface-border p-6 rounded-blocky shadow-sm flex flex-col gap-4 md:col-span-2 mt-4">
          <div className="flex items-center gap-3 border-b-2 border-surface-border pb-4">
            <Settings className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">Opciones Avanzadas (server.properties)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Campos visuales dedicados para propiedades comunes */}
              
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="font-bold text-sm text-foreground/80">Mensaje del Día (MOTD)</label>
                <Input 
                  value={properties["motd"] ?? ""}
                  onChange={(e) => updateProperty("motd", e.target.value)}
                  placeholder="A Minecraft Server"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-bold text-sm text-foreground/80">Dificultad</label>
                <select 
                  value={properties["difficulty"] ?? "easy"}
                  onChange={(e) => updateProperty("difficulty", e.target.value)}
                  className="bg-background border-2 border-surface-border rounded-blocky px-4 py-2 font-semibold text-foreground focus:outline-none focus:border-primary transition-colors appearance-none"
                >
                  <option value="peaceful">Pacífico</option>
                  <option value="easy">Fácil</option>
                  <option value="normal">Normal</option>
                  <option value="hard">Difícil</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-bold text-sm text-foreground/80">Modo de Juego</label>
                <select 
                  value={properties["gamemode"] ?? "survival"}
                  onChange={(e) => updateProperty("gamemode", e.target.value)}
                  className="bg-background border-2 border-surface-border rounded-blocky px-4 py-2 font-semibold text-foreground focus:outline-none focus:border-primary transition-colors appearance-none"
                >
                  <option value="survival">Supervivencia</option>
                  <option value="creative">Creativo</option>
                  <option value="adventure">Aventura</option>
                  <option value="spectator">Espectador</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-bold text-sm text-foreground/80">Distancia de Visión (Chunks)</label>
                <Input 
                  type="number" 
                  min="2" 
                  max="32"
                  value={properties["view-distance"] ?? "10"}
                  onChange={(e) => updateProperty("view-distance", e.target.value)}
                  onBlur={(e) => {
                    let val = parseInt(e.target.value);
                    if (isNaN(val) || val < 2) val = 2;
                    if (val > 32) val = 32;
                    updateProperty("view-distance", val.toString());
                  }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-bold text-sm text-foreground/80">Protección del Spawn (Bloques)</label>
                <Input 
                  type="number" 
                  min="0" 
                  max="1000"
                  value={properties["spawn-protection"] ?? "16"}
                  onChange={(e) => updateProperty("spawn-protection", e.target.value)}
                  onBlur={(e) => {
                    let val = parseInt(e.target.value);
                    if (isNaN(val) || val < 0) val = 0;
                    if (val > 10000) val = 10000;
                    updateProperty("spawn-protection", val.toString());
                  }}
                />
              </div>

              <ToggleOption 
                title="PVP" 
                description="Permitir daño entre jugadores."
                checked={properties["pvp"] === "true"}
                onToggle={() => updateProperty("pvp", properties["pvp"] === "true" ? "false" : "true")}
                icon={<ShieldAlert className="w-5 h-5" />}
              />

              <ToggleOption 
                title="Permitir Vuelo" 
                description="Evita que el servidor expulse a jugadores en el aire (útil para mods)."
                checked={properties["allow-flight"] === "true"}
                onToggle={() => updateProperty("allow-flight", properties["allow-flight"] === "true" ? "false" : "true")}
                icon={<Wifi className="w-5 h-5" />}
              />

              <ToggleOption 
                title="Modo Extremo (Hardcore)" 
                description="Muerte permanente (baneo o modo espectador al morir)."
                checked={properties["hardcore"] === "true"}
                onToggle={() => updateProperty("hardcore", properties["hardcore"] === "true" ? "false" : "true")}
                icon={<ShieldAlert className="w-5 h-5" />}
                danger
              />

              <ToggleOption 
                title="Bloques de Comandos" 
                description="Permite usar y ejecutar bloques de comandos en el mundo."
                checked={properties["enable-command-block"] === "true"}
                onToggle={() => updateProperty("enable-command-block", properties["enable-command-block"] === "true" ? "false" : "true")}
                icon={<Settings className="w-5 h-5" />}
              />
            </div>
          </div>

        {/* Zona de Peligro */}
        <div className="bg-red-500/10 border-2 border-red-500/30 p-6 rounded-blocky shadow-sm flex flex-col gap-4 md:col-span-2 mt-4">
          <div className="flex items-center gap-3 border-b-2 border-red-500/20 pb-4">
            <Trash2 className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-bold text-red-500">Zona de Peligro</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-foreground">Eliminar Servidor</h3>
              <p className="text-sm text-foreground/70">Esta acción borrará el servidor de tu panel. Podrás elegir si mantener o borrar los archivos del disco duro.</p>
            </div>
            <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors" onClick={() => setShowDeleteModal(true)}>
              Eliminar Servidor...
            </Button>
          </div>
        </div>

      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in">
          <div className="bg-surface border-2 border-red-500/30 p-8 rounded-blocky shadow-2xl max-w-md w-full animate-in zoom-in-95 slide-in-from-bottom-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-black text-red-500">Eliminar Servidor</h2>
            </div>
            <p className="text-foreground/80 mb-6">
              Estás a punto de eliminar el servidor de tu panel de control. 
              <br /><br />
              <b>Nota:</b> Los archivos globales (como versiones de Java y liberías en el Vault) <b>siempre</b> se conservan automáticamente para ahorrar ancho de banda en el futuro.
            </p>

            <div className="bg-background border-2 border-surface-border rounded-blocky p-4 mb-6 cursor-pointer hover:border-primary transition-colors" onClick={() => setKeepFiles(!keepFiles)}>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={keepFiles} 
                  onChange={(e) => setKeepFiles(e.target.checked)}
                  className="w-5 h-5 accent-primary cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
                <div>
                  <h4 className="font-bold">Conservar archivos del servidor</h4>
                  <p className="text-xs text-foreground/60 leading-tight mt-1">
                    No borraremos la carpeta del servidor (mundos, plugins). Útil si quieres volver a crearlo luego.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Eliminando..." : "Sí, Eliminar"}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function ToggleOption({ title, description, checked, onToggle, icon, danger }) {
  return (
    <div className="flex items-center justify-between p-4 bg-background rounded-blocky border-2 border-surface-border">
      <div className="flex gap-3">
        <div className={`mt-1 ${danger ? 'text-danger' : 'text-primary'}`}>
          {icon}
        </div>
        <div>
          <h3 className="font-bold">{title}</h3>
          <p className="text-xs text-foreground/60 leading-tight mt-1 max-w-[200px]">{description}</p>
        </div>
      </div>
      <button 
        onClick={onToggle}
        className={`relative w-14 h-8 rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
          checked 
            ? 'bg-primary border-primary' 
            : 'bg-surface border-surface-border'
        }`}
      >
        <span 
          className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-200 ease-in-out ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`} 
        />
      </button>
    </div>
  );
}
