import { useState, useEffect } from "react";
import { getMinecraftVersions, getSoftwareBuilds } from "@/features/servers/services/versionApi";
import { Button } from "@/shared/ui/Button";

const SOFTWARE_TYPES = [
  { id: 'vanilla', name: 'Vanilla', desc: 'Versión oficial sin modificaciones' },
  { id: 'paper', name: 'PaperMC', desc: 'Alto rendimiento, soporta plugins' },
  { id: 'purpur', name: 'Purpur', desc: 'Basado en Paper, optimizado' },
  { id: 'folia', name: 'Folia', desc: 'Multi-hilo para servidores masivos' },
  { id: 'forge', name: 'Forge', desc: 'Soporte clásico para mods' },
  { id: 'fabric', name: 'Fabric', desc: 'Mods ligeros y rápidos' },
];

export function ReinstallModal({ server, onClose, onConfirm }) {
  const [software, setSoftware] = useState(server?.type?.toLowerCase() || 'paper');
  const [version, setVersion] = useState(server?.version?.split('-')[0] || '');
  const [build, setBuild] = useState("LATEST");
  
  const [availableVersions, setAvailableVersions] = useState([]);
  const [availableBuilds, setAvailableBuilds] = useState([]);
  
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [loadingBuilds, setLoadingBuilds] = useState(false);
  
  useEffect(() => {
    if (software) {
      setLoadingVersions(true);
      getMinecraftVersions(software).then(versions => {
        setAvailableVersions(versions || []);
        if (versions && versions.length > 0 && !versions.includes(version)) {
          setVersion(versions[0]);
        }
      }).finally(() => {
        setLoadingVersions(false);
      });
    }
  }, [software]);
  
  useEffect(() => {
    if (software && version) {
      setLoadingBuilds(true);
      getSoftwareBuilds(software, version).then(builds => {
        setAvailableBuilds(builds || []);
        setBuild("LATEST");
      }).finally(() => {
        setLoadingBuilds(false);
      });
    }
  }, [software, version]);

  const handleSubmit = () => {
    const fullVersion = build === "LATEST" ? version : `${version}-${build}`;
    onConfirm(software.toUpperCase(), fullVersion);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background border-2 border-surface-border rounded-blocky w-full max-w-lg overflow-hidden animate-in zoom-in-95">
        <div className="p-6 border-b-2 border-surface-border bg-surface">
          <h2 className="text-2xl font-black">Cambiar Software/Versión</h2>
          <p className="text-foreground/70">Selecciona el nuevo motor y versión para el servidor. Esto requerirá un reinicio.</p>
        </div>
        
        <div className="p-6 flex flex-col gap-6">
          <div>
            <label className="font-bold block mb-2">Motor de Java (Software)</label>
            <select 
              value={software} 
              onChange={(e) => setSoftware(e.target.value)}
              className="w-full bg-surface border-2 border-surface-border text-foreground rounded-blocky px-4 py-3 outline-none focus:border-primary appearance-none font-semibold"
            >
              {SOFTWARE_TYPES.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold block mb-2">Versión de Minecraft</label>
            <select 
              value={version} 
              onChange={(e) => setVersion(e.target.value)}
              disabled={loadingVersions}
              className="w-full bg-surface border-2 border-surface-border text-foreground rounded-blocky px-4 py-3 outline-none focus:border-primary appearance-none font-semibold"
            >
              {loadingVersions ? (
                <option>Cargando versiones...</option>
              ) : availableVersions.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          
          {(software !== 'vanilla' && availableBuilds.length > 0) && (
            <div>
              <label className="font-bold block mb-2">Build Específico (Opcional)</label>
              <select 
                value={build} 
                onChange={(e) => setBuild(e.target.value)}
                disabled={loadingBuilds}
                className="w-full bg-surface border-2 border-surface-border text-foreground rounded-blocky px-4 py-3 outline-none focus:border-primary appearance-none font-semibold"
              >
                <option value="LATEST">Última versión (Recomendado)</option>
                {availableBuilds.map(b => (
                  <option key={b} value={b}>Build #{b}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t-2 border-surface-border bg-surface flex justify-end gap-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} className="bg-primary text-primary-foreground">Aplicar Cambios</Button>
        </div>
      </div>
    </div>
  );
}
