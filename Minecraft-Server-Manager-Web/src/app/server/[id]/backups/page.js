"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Save, Trash2, Download, Archive, Globe, Settings, FileJson, Clock, Loader2, RefreshCw } from "lucide-react";
import { getBackups, createBackup, deleteBackup, fsOperation, downloadBackupZip } from "@/features/servers/services/serverApi";
import { useRef } from "react";
import { UploadCloud, Play } from "lucide-react";

function Button({ children, variant = "primary", className = "", ...props }) {
  const base = "px-4 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-primary text-white hover:bg-primary/90",
    outline: "border-2 border-surface-border text-foreground hover:bg-surface-hover",
    danger: "bg-danger text-white hover:bg-danger/90",
    ghost: "bg-transparent hover:bg-surface-border"
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props}>{children}</button>;
}

export default function BackupsPage() {
  const params = useParams();
  const serverId = params?.id;
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [manualProfile, setManualProfile] = useState("full");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("03:00");
  const [scheduleProfile, setScheduleProfile] = useState("full");
  const [scheduleMax, setScheduleMax] = useState(5);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const data = await getBackups(serverId);
      setBackups(data || []);
    } catch (err) {
      setError("Error al cargar los backups: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fsOperation(serverId, { action: "read", filePath: "backup-config.json" });
      if (res && res.content) {
        const conf = JSON.parse(res.content);
        setScheduleEnabled(conf.enabled || false);
        setScheduleTime(conf.time || "03:00");
        setScheduleProfile(conf.profile || "full");
        setScheduleMax(conf.maxRetained || 5);
      }
    } catch (e) {
      
    }
  };

  useEffect(() => {
    if (serverId) {
      fetchBackups();
      loadSettings();
    }
  }, [serverId]);

  const handleCreateBackup = async (profile) => {
    try {
      setCreating(profile);
      await createBackup(serverId, profile);
      await fetchBackups();
      showToast("Backup creado exitosamente.");
    } catch (err) {
      showToast("Error al crear backup: " + err.message, "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadBackup = async (fileName) => {
    try {
      showToast("Iniciando descarga...", "success");
      await downloadBackupZip(serverId, fileName);
    } catch (err) {
      showToast("Error al descargar: " + err.message, "error");
    }
  };

  const handleDeleteBackup = async (fileName) => {
    try {
      await deleteBackup(serverId, fileName);
      setConfirmDelete(null);
      await fetchBackups();
      showToast("Backup eliminado correctamente.");
    } catch (err) {
      showToast("Error al eliminar: " + err.message, "error");
    }
  };

  const handleRestoreBackup = async (fileName) => {
    try {
      setConfirmRestore(null);
      showToast("Restaurando backup, esto puede tardar unos minutos...", "success");
      await fsOperation(serverId, {
        action: "unzip",
        filePath: `backups/${fileName}`,
        destPath: "."
      });
      showToast("Backup restaurado correctamente. ¡Reinicia el servidor!", "success");
    } catch (err) {
      showToast("Error al restaurar: " + err.message, "error");
    }
  };

  const handleUploadBackup = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      showToast("El backup debe ser un archivo .zip", "error");
      return;
    }

    setUploading(true);
    try {
      const CHUNK_SIZE = 1024 * 1024 * 5; 
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const filePath = `backups/${file.name}`;
      
      await fsOperation(serverId, {
        action: "write",
        filePath: filePath,
        content: "",
        isBase64: false
      });

      for (let i = 0; i < totalChunks; i++) {
        setUploadProgress(`Subiendo (${i+1}/${totalChunks})...`);
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        const base64Chunk = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result.split(',')[1]);
          reader.readAsDataURL(chunk);
        });

        await fsOperation(serverId, {
          action: "append",
          filePath: filePath,
          content: base64Chunk,
          isBase64: true
        });
      }

      showToast("Backup subido correctamente.");
      fetchBackups();
    } catch (err) {
      console.error("Error subiendo backup:", err);
      showToast(`Fallo al subir: ${err.message}`, "error");
    } finally {
      setUploading(false);
      setUploadProgress("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      const config = {
        enabled: scheduleEnabled,
        time: scheduleTime,
        profile: scheduleProfile,
        maxRetained: parseInt(scheduleMax)
      };
      await fsOperation(serverId, { 
        action: "write", 
        filePath: "backup-config.json", 
        content: JSON.stringify(config, null, 2) 
      });
      showToast("¡Configuración guardada correctamente!");
    } catch (e) {
      showToast("Error guardando ajustes: " + e.message, "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const formatSize = (bytes) => {
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) return (mb / 1024).toFixed(2) + " GB";
    return mb.toFixed(2) + " MB";
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('es-ES', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8 h-full overflow-y-auto relative">
      
      {}
      {toast && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-lg shadow-lg font-bold border-2 z-50 animate-in fade-in slide-in-from-bottom-5 ${
          toast.type === 'error' ? 'bg-danger text-white border-danger/50' : 'bg-primary text-white border-primary/50'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black text-foreground uppercase tracking-wider flex items-center gap-3">
          <Archive className="w-8 h-8 text-primary" />
          Gestor de Backups
        </h1>
        <p className="text-foreground/70">Protege tu mundo creando copias de seguridad de forma manual o programada.</p>
      </div>

      {error && (
        <div className="bg-danger/20 border-2 border-danger text-danger p-4 rounded-xl font-bold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Save className="w-5 h-5 text-primary" /> Backups Existentes
            </h2>
            <div className="flex gap-2">
              <input 
                type="file" 
                ref={fileInputRef}
                accept=".zip" 
                className="hidden" 
                onChange={handleUploadBackup}
                disabled={uploading}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading || loading} className="h-10 text-sm px-3 border-primary/50 text-primary hover:bg-primary/10">
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> {uploadProgress}</> : <><UploadCloud className="w-4 h-4" /> Importar</>}
              </Button>
              <Button variant="outline" onClick={fetchBackups} disabled={loading || uploading} className="h-10 text-sm px-3">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
              </Button>
            </div>
          </div>

          <div className="bg-surface border-2 border-surface-border rounded-blocky overflow-hidden shadow-sm flex flex-col min-h-[300px]">
            <div className="grid grid-cols-12 gap-4 p-4 border-b-2 border-surface-border bg-surface-hover/30 text-xs font-bold text-foreground/50 uppercase tracking-wider">
              <div className="col-span-5">Archivo</div>
              <div className="col-span-2">Tamaño</div>
              <div className="col-span-3">Fecha</div>
              <div className="col-span-2 text-center">Acciones</div>
            </div>
            
            <div className="flex-1 flex flex-col">
              {loading && backups.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-foreground/50 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Cargando backups...
                </div>
              ) : backups.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-foreground/50 gap-2 opacity-50 p-8 text-center">
                  <Archive className="w-12 h-12 mb-2" />
                  <p>No tienes ningún backup creado todavía.</p>
                  <p className="text-sm">Usa los perfiles de la derecha para crear uno nuevo.</p>
                </div>
              ) : (
                backups.map((b) => (
                  <div key={b.name} className="grid grid-cols-12 gap-4 p-4 border-b border-surface-border/30 hover:bg-surface-hover/20 items-center">
                    <div className="col-span-5 flex items-center gap-3">
                      <Archive className="w-5 h-5 text-primary opacity-70 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm text-foreground break-all">{b.name}</span>
                        <span className="text-xs text-foreground/50">{b.name.includes('world') ? 'Perfil: Mundo' : b.name.includes('configs') ? 'Perfil: Configuraciones' : 'Perfil: Completo'}</span>
                      </div>
                    </div>
                    <div className="col-span-2 text-sm font-mono">{formatSize(b.size)}</div>
                    <div className="col-span-3 text-sm text-foreground/70">{formatDate(b.date)}</div>
                    <div className="col-span-2 flex justify-center gap-2">
                      {confirmDelete === b.name ? (
                        <div className="flex items-center gap-1">
                          <Button variant="danger" className="!p-1 text-xs" onClick={() => handleDeleteBackup(b.name)}>Borrar</Button>
                          <Button variant="ghost" className="!p-1 text-xs" onClick={() => setConfirmDelete(null)}>No</Button>
                        </div>
                      ) : confirmRestore === b.name ? (
                        <div className="flex items-center gap-1">
                          <Button className="!p-1 text-xs bg-amber-500 hover:bg-amber-600 text-white" onClick={() => handleRestoreBackup(b.name)}>Restaurar</Button>
                          <Button variant="ghost" className="!p-1 text-xs" onClick={() => setConfirmRestore(null)}>No</Button>
                        </div>
                      ) : (
                        <>
                          <Button variant="ghost" className="!p-2 text-amber-500 hover:bg-amber-500/20" onClick={() => setConfirmRestore(b.name)} title="Restaurar (Aplicar)">
                            <Play className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" className="!p-2 text-primary hover:bg-primary/20" onClick={() => handleDownloadBackup(b.name)} title="Descargar">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" className="!p-2 text-danger hover:bg-danger/20" onClick={() => setConfirmDelete(b.name)} title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {}
        <div className="flex flex-col gap-6">
          
          {}
          <div className="bg-surface border-2 border-surface-border rounded-blocky p-6 shadow-sm flex flex-col gap-4">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
              <Download className="w-5 h-5 text-primary" /> Crear Backup Manual
            </h2>
            <p className="text-sm text-foreground/70 mb-2">Elige un perfil para comprimir el servidor. Se ejecutará un guardado seguro en caliente.</p>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-foreground/50 uppercase">Perfil a utilizar</label>
              <select 
                value={manualProfile}
                onChange={(e) => setManualProfile(e.target.value)}
                className="bg-background border-2 border-surface-border rounded p-2 text-sm font-bold text-foreground focus:outline-none focus:border-primary w-full"
              >
                <option value="full">Backup Completo</option>
                <option value="world">Solo Mundo</option>
                <option value="configs">Solo Plugins y Configs</option>
              </select>
            </div>

            <Button 
              onClick={() => handleCreateBackup(manualProfile)} 
              disabled={creating !== false} 
              className="w-full mt-2 h-12"
            >
              {creating !== false ? <Loader2 className="w-5 h-5 animate-spin" /> : <Archive className="w-5 h-5" />}
              {creating !== false ? 'Comprimiendo...' : 'Crear Backup Ahora'}
            </Button>
          </div>

          {}
          <div className="bg-surface border-2 border-surface-border rounded-blocky p-6 shadow-sm flex flex-col gap-4">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-2 border-b-2 border-surface-border pb-4">
              <Clock className="w-5 h-5 text-warning" /> Programación Automática
            </h2>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold cursor-pointer">Activar Backups Diarios</label>
              <div 
                onClick={() => setScheduleEnabled(!scheduleEnabled)}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${scheduleEnabled ? 'bg-green-500' : 'bg-background border-2 border-surface-border'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${scheduleEnabled ? 'translate-x-6' : 'translate-x-0 bg-foreground/50'}`}></div>
              </div>
            </div>

            <div className={`flex flex-col gap-4 transition-opacity ${!scheduleEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-foreground/50 uppercase">Hora del sistema</label>
                <input 
                  type="time" 
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="bg-background border-2 border-surface-border rounded p-2 text-sm font-bold text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-foreground/50 uppercase">Perfil a utilizar</label>
                <select 
                  value={scheduleProfile}
                  onChange={(e) => setScheduleProfile(e.target.value)}
                  className="bg-background border-2 border-surface-border rounded p-2 text-sm font-bold text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="full">Backup Completo</option>
                  <option value="world">Solo Mundo</option>
                  <option value="configs">Solo Configuraciones</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-foreground/50 uppercase">Conservar máximos (Historial)</label>
                <input 
                  type="number" 
                  min="1"
                  max="15"
                  value={scheduleMax}
                  onChange={(e) => setScheduleMax(e.target.value)}
                  className="bg-background border-2 border-surface-border rounded p-2 text-sm font-bold text-foreground focus:outline-none focus:border-primary"
                />
                <p className="text-[10px] text-foreground/50 mt-1">Borrará automáticamente los antiguos si excedes el número.</p>
              </div>
            </div>

            <Button onClick={handleSaveSettings} disabled={savingSettings} className="w-full mt-2 h-10">
              <Settings className="w-4 h-4" />
              Guardar Configuración
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
