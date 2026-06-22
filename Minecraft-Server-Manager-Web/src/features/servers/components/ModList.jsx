"use client";
import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/Button";
import { Download, Trash2, Loader2, PackageOpen, Search } from "lucide-react";
import { fsOperation, getMyServers } from "@/features/servers/services/serverApi";
import { searchModrinth, getProjectVersions } from "@/features/servers/services/modrinthApi";
import { Input } from "@/shared/ui/Input";

export function ModList({ serverId }) {
  const [mods, setMods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("installed"); // installed, store
  const [targetFolder, setTargetFolder] = useState("/plugins");
  
  const [serverInfo, setServerInfo] = useState(null);
  
  // Store state
  const [searchQuery, setSearchQuery] = useState("");
  const [storeResults, setStoreResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    // Obtener info del servidor para saber su versión y software
    getMyServers().then(servers => {
      const srv = servers.find(s => s.id === serverId);
      if (srv) setServerInfo(srv);
    });
  }, [serverId]);

  useEffect(() => {
    if (activeTab === "installed") {
      loadMods();
    }
  }, [activeTab, serverId]);

  const loadMods = async () => {
    setLoading(true);
    try {
      let data = await fsOperation(serverId, { action: "list", path: "/plugins" });
      if (Array.isArray(data) && data.length > 0) {
        setTargetFolder("/plugins");
        setMods(data.filter(f => !f.isDirectory));
      } else {
        data = await fsOperation(serverId, { action: "list", path: "/mods" });
        if (Array.isArray(data)) {
          setTargetFolder("/mods");
          setMods(data.filter(f => !f.isDirectory));
        }
      }
    } catch (err) {
      console.error("No se pudo cargar la lista de mods:", err);
      setMods([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (filename) => {
    if (!confirm(`¿Eliminar permanentemente ${filename}?`)) return;
    try {
      await fsOperation(serverId, { action: "delete", path: `${targetFolder}/${filename}` });
      loadMods();
    } catch (err) {
      alert("Error eliminando archivo");
    }
  };

  useEffect(() => {
    if (activeTab === "store" && serverInfo) {
      if (searchQuery === "") {
        performSearch("");
      }
    }
  }, [activeTab, serverInfo, searchQuery]);

  const handleSearch = (e) => {
    e?.preventDefault();
    performSearch(searchQuery);
  };

  const performSearch = async (query) => {
    if (!serverInfo) return;
    setSearching(true);
    try {
      const data = await searchModrinth(query, serverInfo.type, serverInfo.version);
      setStoreResults(data.hits || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleInstall = async (projectId) => {
    if (!serverInfo) return;
    setDownloadingId(projectId);
    try {
      const versions = await getProjectVersions(projectId, serverInfo.type, serverInfo.version);
      if (versions.length === 0) {
        alert("No se encontró una versión compatible para tu servidor.");
        setDownloadingId(null);
        return;
      }
      
      // Obtener el primer archivo de la versión más reciente
      const file = versions[0].files.find(f => f.primary) || versions[0].files[0];
      const downloadUrl = file.url;
      const filename = file.filename;
      
      const folder = ["PAPER", "PURPUR", "FOLIA"].includes(serverInfo.type) ? "/plugins" : "/mods";
      
      await fsOperation(serverId, { 
        action: "download", 
        path: `${folder}/${filename}`,
        url: downloadUrl
      });
      
      alert(`¡${filename} instalado con éxito!`);
    } catch (err) {
      console.error(err);
      alert("Error al descargar el mod.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4 border-b-2 border-surface-border pb-4">
        <button 
          onClick={() => setActiveTab("installed")}
          className={`font-bold px-4 py-2 rounded-blocky transition-colors ${activeTab === "installed" ? "bg-primary text-white" : "hover:bg-surface"}`}
        >
          Instalados ({mods.length})
        </button>
        <button 
          onClick={() => setActiveTab("store")}
          className={`font-bold px-4 py-2 rounded-blocky transition-colors flex items-center gap-2 ${activeTab === "store" ? "bg-primary text-white" : "hover:bg-surface"}`}
        >
          Explorar Store
        </button>
      </div>

      {activeTab === "installed" && (
        <div className="flex flex-col gap-4 animate-in fade-in">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : mods.length === 0 ? (
            <div className="text-center p-12 bg-surface border-2 border-surface-border rounded-blocky border-dashed">
              <PackageOpen className="w-12 h-12 mx-auto text-foreground/30 mb-4" />
              <h3 className="font-bold text-xl text-foreground/70">No hay mods ni plugins instalados</h3>
              <p className="text-foreground/50 mt-2">Ve a la Store para descargar o usa el Explorador de Archivos para subir tus propios .jar</p>
            </div>
          ) : (
            mods.map((mod) => (
              <div key={mod.name} className="bg-surface border-2 border-surface-border p-4 rounded-blocky flex items-center justify-between shadow-sm hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-surface-border rounded-blocky text-foreground/70">
                    <PackageOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground truncate max-w-[300px] md:max-w-[500px]" title={mod.name}>
                      {mod.name}
                    </h3>
                    <p className="text-sm text-foreground/70 font-mono">
                      {(mod.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="p-3 text-red-500 hover:bg-red-500 hover:text-white" onClick={() => handleDelete(mod.name)}>
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "store" && (
        <div className="flex flex-col gap-4 animate-in fade-in">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input 
              placeholder="Buscar mods o plugins..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={searching || !serverInfo}>
              {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </Button>
          </form>

          {!serverInfo && (
            <p className="text-yellow-500 font-bold text-sm">Cargando compatibilidad del servidor...</p>
          )}

          <div className="flex flex-col gap-4 mt-4">
            {storeResults.map((project) => (
              <div key={project.project_id} className="bg-surface border-2 border-surface-border p-4 rounded-blocky flex items-start gap-4 shadow-sm">
                {project.icon_url ? (
                  <img src={project.icon_url} alt={project.title} className="w-16 h-16 rounded-blocky object-cover border-2 border-surface-border" />
                ) : (
                  <div className="w-16 h-16 rounded-blocky bg-surface-border flex items-center justify-center">
                    <PackageOpen className="w-8 h-8 text-foreground/30" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{project.title}</h3>
                  <p className="text-sm text-foreground/70 line-clamp-2">{project.description}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-surface-border px-2 py-1 rounded-full font-mono">Descargas: {project.downloads}</span>
                    <span className="text-xs bg-surface-border px-2 py-1 rounded-full font-mono">{project.author}</span>
                  </div>
                </div>
                <Button 
                  onClick={() => handleInstall(project.project_id)}
                  disabled={downloadingId === project.project_id}
                  className="w-32"
                >
                  {downloadingId === project.project_id ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Instalando...</>
                  ) : (
                    <><Download className="w-4 h-4 mr-2" /> Instalar</>
                  )}
                </Button>
              </div>
            ))}
            
            {storeResults.length === 0 && !searching && searchQuery && (
              <div className="text-center p-8 text-foreground/50 font-bold">
                No se encontraron resultados para "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
