"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/shared/ui/Button";
import { Download, Trash2, Loader2, PackageOpen, Search, Check, AlertTriangle, Upload } from "lucide-react";
import { fsOperation, getMyServers } from "@/features/servers/services/serverApi";
import { searchModrinth, getProjectVersions, getProject } from "@/features/servers/services/modrinthApi";
import { Input } from "@/shared/ui/Input";
import { useToast } from "@/shared/ui/ToastProvider";
const CHUNK_SIZE = 1024 * 1024 * 5; 

export function ModList({ serverId, mode = "mods" }) {
  const [mods, setMods] = useState([]);
  const [loading, setLoading] = useState(true);
  const defaultFolder = mode === "plugins" ? "/plugins" : "/mods";
  const [targetFolder, setTargetFolder] = useState(defaultFolder);
  const [activeTab, setActiveTab] = useState("installed");
  const { toast } = useToast();
  
  const [serverInfo, setServerInfo] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [storeResults, setStoreResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [installedProjects, setInstalledProjects] = useState(new Set());
  const [needsRestart, setNeedsRestart] = useState(false);
  const [modMetadata, setModMetadata] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadingText, setUploadingText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [deletingMod, setDeletingMod] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    getMyServers().then(servers => {
      const srv = servers.find(s => s.id === serverId);
      if (srv) setServerInfo(srv);
    });
  }, [serverId]);

  useEffect(() => {
    if (activeTab === "installed") {
      loadMods();
    }
  }, [activeTab, serverId, mode]);

  const loadMods = async () => {
    setLoading(true);
    try {
      try {
        const metaRes = await fsOperation(serverId, { action: "read", filePath: "/mods-metadata.json" });
        if (metaRes && metaRes.content) {
          const parsed = JSON.parse(metaRes.content);
          setModMetadata(parsed);
          
          const ids = new Set();
          Object.values(parsed).forEach(m => {
            if (m.project_id) ids.add(m.project_id);
          });
          setInstalledProjects(ids);
        }
      } catch (e) {
      }

      let data = [];
      try {
        data = await fsOperation(serverId, { action: "list", filePath: defaultFolder });
        if (Array.isArray(data)) {
          setTargetFolder(defaultFolder);
          setMods(data.filter(f => !f.isDir));
        }
      } catch(e) {
        setTargetFolder(defaultFolder);
        setMods([]);
      }
    } catch (err) {
      console.error("No se pudo cargar la lista de mods:", err);
      setMods([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (uploading) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload({ target: { files: e.dataTransfer.files } });
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    
    const validFiles = files.filter(f => f.name.endsWith('.jar') || f.name.endsWith('.zip'));
    
    if (validFiles.length === 0) {
      toast("Por favor, sube archivos válidos con extensión .jar o .zip", "warning");
      return;
    }

    setUploading(true);
    let successCount = 0;
    const isModpack = activeTab === "modpacks";

    try {
      for (let f = 0; f < validFiles.length; f++) {
        const file = validFiles[f];
        setUploadingText(`Subiendo ${f + 1} de ${validFiles.length}...`);
        
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const filePath = isModpack ? `/${file.name}` : `${targetFolder}/${file.name}`;
        
        await fsOperation(serverId, {
          action: "write",
          filePath: filePath,
          content: "",
          isBase64: false
        });

        for (let i = 0; i < totalChunks; i++) {
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

        if (isModpack) {
          setUploadingText("Descomprimiendo...");
          await fsOperation(serverId, {
            action: "unzip",
            filePath: filePath,
            destPath: "/"
          });
          
          await fsOperation(serverId, {
            action: "delete",
            filePath: filePath
          });
        }
        
        successCount++;
      }

      if (successCount > 0) {
        if (isModpack) {
          toast("Modpack(s) instalado(s) correctamente.", "success");
        } else {
          toast(`${successCount} archivo(s) subido(s) correctamente.`, "success");
        }
        if (serverInfo && (serverInfo.status === "ONLINE" || serverInfo.status === "STARTING")) {
          setNeedsRestart(true);
        }
        loadMods();
      }
    } catch (err) {
      console.error("Error subiendo archivos:", err);
      toast(`Fallo al subir: ${err.message}`, "error");
    } finally {
      setUploading(false);
      setUploadingText("");
      // Clear the input so the same files can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (filename) => {
    try {
      await fsOperation(serverId, { action: "delete", filePath: `${targetFolder}/${filename}` });
      
      try {
        let meta = {};
        const metaRes = await fsOperation(serverId, { action: "read", filePath: "/mods-metadata.json" });
        if (metaRes && metaRes.content) {
          meta = JSON.parse(metaRes.content);
          if (meta[filename]) {
            delete meta[filename];
            await fsOperation(serverId, { 
              action: "write", 
              filePath: "/mods-metadata.json",
              content: JSON.stringify(meta, null, 2)
            });
          }
        }
      } catch (e) {}

      loadMods();
      if (serverInfo && (serverInfo.status === "ONLINE" || serverInfo.status === "STARTING")) {
        setNeedsRestart(true);
      }
    } catch (err) {
      console.error("Error eliminando archivo");
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
      const data = await searchModrinth(query, serverInfo.type, serverInfo.version, mode);
      setStoreResults(data.hits || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const installProjectWithDependencies = async (projectOrId) => {
    if (!serverInfo) return;
    
    let projectId = typeof projectOrId === 'string' ? projectOrId : projectOrId.project_id;
    let project = typeof projectOrId === 'string' ? null : projectOrId;
    
    if (installedProjects.has(projectId)) return;
    
    try {
      if (!project) {
        project = await getProject(projectId);
        if (!project) return;
      }
      
      const versions = await getProjectVersions(projectId, serverInfo.type, serverInfo.version, mode);
      if (versions.length === 0) return;
      
      const version = versions[0];
      const file = version.files.find(f => f.primary) || version.files[0];
      const folder = mode === "plugins" ? "/plugins" : "/mods";
      
      await fsOperation(serverId, { 
        action: "download", 
        filePath: `${folder}/${file.filename}`,
        url: file.url
      });
      
      try {
        let meta = {};
        try {
          const metaRes = await fsOperation(serverId, { action: "read", filePath: "/mods-metadata.json" });
          if (metaRes && metaRes.content) meta = JSON.parse(metaRes.content);
        } catch (e) {}
        
        meta[file.filename] = {
          title: project.title,
          icon_url: project.icon_url,
          project_id: project.id || projectId
        };
        
        await fsOperation(serverId, { 
          action: "write", 
          filePath: "/mods-metadata.json",
          content: JSON.stringify(meta, null, 2)
        });
      } catch (e) {}

      setInstalledProjects(prev => {
        const next = new Set(prev);
        next.add(projectId);
        return next;
      });
      
      if (version.dependencies && version.dependencies.length > 0) {
        for (const dep of version.dependencies) {
          if (dep.dependency_type === "required" && dep.project_id) {
            await installProjectWithDependencies(dep.project_id);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInstall = async (project) => {
    if (!serverInfo) return;
    setDownloadingId(project.project_id);
    
    await installProjectWithDependencies(project);
    
    if (serverInfo && (serverInfo.status === "ONLINE" || serverInfo.status === "STARTING")) {
      setNeedsRestart(true);
    }
    
    setDownloadingId(null);
  };

  return (
    <div 
      className="flex flex-col gap-6 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
    >
      {isDragging && (
        <div 
          className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm border-4 border-dashed border-primary rounded-blocky flex flex-col items-center justify-center animate-in fade-in"
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <Upload className="w-16 h-16 text-primary mb-4 animate-bounce" />
          <h2 className="text-3xl font-black text-primary mb-2">Suelta el archivo aquí</h2>
          <p className="text-foreground/70 font-bold">Sube tus .jar o .zip directamente</p>
        </div>
      )}

      {needsRestart && (
        <div className="bg-amber-500/10 border-2 border-amber-500/50 p-4 rounded-blocky flex items-center gap-3 text-amber-500 animate-in fade-in slide-in-from-top-4">
          <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          <p className="font-bold">Hay cambios pendientes. Reinicia el servidor para que los mods se apliquen correctamente.</p>
        </div>
      )}

      <div className="flex gap-4 border-b-2 border-surface-border pb-4 items-center justify-between">
        <div className="flex gap-4">
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
          {mode === "mods" && (
            <button 
              onClick={() => setActiveTab("modpacks")}
              className={`font-bold px-4 py-2 rounded-blocky transition-colors flex items-center gap-2 ${activeTab === "modpacks" ? "bg-primary text-white" : "hover:bg-surface"}`}
            >
              <PackageOpen className="w-5 h-5" /> Modpacks
            </button>
          )}
        </div>
        
        <div>
          <input 
            type="file" 
            ref={fileInputRef}
            accept={activeTab === "modpacks" ? ".zip" : ".jar"} 
            className="hidden" 
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <Button 
            variant="outline" 
            className="cursor-pointer border-2 border-primary text-primary hover:bg-primary hover:text-white" 
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {uploadingText || "Subiendo..."}</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Subir {activeTab === "modpacks" ? "Modpack (.zip)" : (mode === "plugins" ? "Plugin(s)" : "Mod(s)")} {activeTab !== "modpacks" && "(.jar)"}</>
            )}
          </Button>
        </div>
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
              <h3 className="font-bold text-xl text-foreground/70">No hay {mode === "plugins" ? "plugins" : "mods"} instalados</h3>
              <p className="text-foreground/50 mt-2">Ve a la Store para descargar o sube tus propios archivos .jar</p>
            </div>
          ) : (
            mods.map((mod) => {
              const meta = modMetadata[mod.name];
              const isDeleting = deletingMod === mod.name;

              if (isDeleting) {
                return (
                  <div key={mod.name} className="bg-danger/10 border-2 border-danger p-4 rounded-blocky flex items-center justify-between shadow-sm animate-in fade-in">
                    <div>
                      <p className="font-bold text-danger text-lg">¿Eliminar {meta?.title || mod.name}?</p>
                      <p className="text-sm text-danger/80 font-semibold">Esta acción no se puede deshacer.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="border-danger/20 hover:bg-danger/10 bg-transparent text-danger" onClick={() => setDeletingMod(null)}>
                        Cancelar
                      </Button>
                      <Button className="bg-danger hover:bg-danger/80 text-white" onClick={() => {
                        setDeletingMod(null);
                        handleDelete(mod.name);
                      }}>
                        Sí, eliminar
                      </Button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={mod.name} className="bg-surface border-2 border-surface-border p-4 rounded-blocky flex items-center justify-between shadow-sm hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-4">
                    {meta?.icon_url ? (
                      <img src={meta.icon_url} alt={meta.title || mod.name} className="w-10 h-10 rounded-blocky object-cover border border-surface-border" />
                    ) : (
                      <div className="p-2 bg-surface-border rounded-blocky text-foreground/70">
                        <PackageOpen className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-lg text-foreground truncate max-w-[300px] md:max-w-[500px]" title={mod.name}>
                        {meta?.title || mod.name}
                      </h3>
                      <p className="text-sm text-foreground/70 font-mono">
                        {(mod.size / 1024 / 1024).toFixed(2)} MB {meta?.title && `(${mod.name})`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="p-3 text-red-500 hover:bg-red-500 hover:text-white" onClick={() => setDeletingMod(mod.name)}>
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              );
            })
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
                
                {installedProjects.has(project.project_id) ? (
                  <Button disabled variant="outline" className="w-32 border-green-500 text-green-500 bg-green-500/10">
                    <Check className="w-4 h-4 mr-2" /> Instalado
                  </Button>
                ) : (
                  <Button 
                    onClick={() => handleInstall(project)}
                    disabled={downloadingId === project.project_id}
                    className="w-32"
                  >
                    {downloadingId === project.project_id ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Instalando...</>
                    ) : (
                      <><Download className="w-4 h-4 mr-2" /> Instalar</>
                    )}
                  </Button>
                )}
              </div>
            ))}
            
            {storeResults.length === 0 && !searching && searchQuery && (
              <div className="text-center p-8 text-foreground/50 font-bold">
                No se encontraron resultados para &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "modpacks" && (
        <div className="bg-surface border-2 border-surface-border p-8 rounded-blocky shadow-sm flex flex-col items-center text-center animate-in fade-in">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
            <PackageOpen className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black mb-4">Instalación de Modpacks</h2>
          <p className="text-foreground/70 font-semibold max-w-2xl mb-8 leading-relaxed">
            Sube un archivo <strong>.zip</strong> de un modpack (por ejemplo, exportado desde CurseForge o Modrinth). 
            Se descomprimirá directamente en la raíz de tu servidor. 
            <br/><br/>
            <strong className="text-warning">Precaución:</strong> Esto sobrescribirá carpetas críticas como <code className="bg-background px-1 rounded">/mods</code> y <code className="bg-background px-1 rounded">/config</code>. Si ya tienes mods instalados, te recomendamos borrarlos o crear un backup primero.
          </p>
          
          <Button 
            className="text-lg px-8 py-4 font-black"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <><Loader2 className="w-6 h-6 mr-3 animate-spin" /> {uploadingText || "Instalando Modpack..."}</>
            ) : (
              <><Upload className="w-6 h-6 mr-3" /> Subir archivo(s) .zip</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
