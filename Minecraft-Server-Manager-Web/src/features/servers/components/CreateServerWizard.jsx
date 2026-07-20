"use client";
import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Pickaxe, Server, Settings, ArrowRight, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/shared/ui/ToastProvider";

import { createServer, getAgentHardware } from "@/features/servers/services/serverApi";
import { getMinecraftVersions, getSoftwareBuilds } from "@/features/servers/services/versionApi";

const SOFTWARE_TYPES = [
  { id: "paper", name: "PaperMC", desc: "Optimizado para plugins", color: "text-blue-500" },
  { id: "purpur", name: "Purpur", desc: "Máximo rendimiento y personalización", color: "text-purple-500" },
  { id: "folia", name: "Folia", desc: "Multihilo (Solo servidores grandes)", color: "text-pink-500" },
  { id: "vanilla", name: "Vanilla", desc: "Minecraft base original", color: "text-green-500" },
  { id: "fabric", name: "Fabric", desc: "Mods de nueva generación", color: "text-orange-500" },
  { id: "forge", name: "Forge", desc: "El gigante de los mods clásicos", color: "text-red-500" },
  { id: "neoforge", name: "NeoForge", desc: "Sucesor moderno de Forge", color: "text-amber-500" },
];

export function CreateServerWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const [serverName, setServerName] = useState("");
  const [software, setSoftware] = useState("paper");
  
  const [availableVersions, setAvailableVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [version, setVersion] = useState("");

  const [availableBuilds, setAvailableBuilds] = useState([]);
  const [loadingBuilds, setLoadingBuilds] = useState(false);
  const [build, setBuild] = useState("LATEST");
  const [memoryGB, setMemoryGB] = useState(2);
  const [agentHardware, setAgentHardware] = useState(null);

  useEffect(() => {
    getAgentHardware().then(hw => {
      setAgentHardware(hw);
      setMemoryGB(1);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (step === 2) {
      setLoadingVersions(true);
      getMinecraftVersions(software).then(versions => {
        setAvailableVersions(versions);
        if (versions.length > 0) setVersion(versions[0]);
      }).finally(() => {
        setLoadingVersions(false);
      });
    }
  }, [software, step]);

  useEffect(() => {
    if (step === 2 && version) {
      setLoadingBuilds(true);
      getSoftwareBuilds(software, version).then(builds => {
        setAvailableBuilds(builds);
        if (builds.length > 0) setBuild(builds[0]);
      }).finally(() => {
        setLoadingBuilds(false);
      });
    }
  }, [software, version, step]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const fullVersion = build === "LATEST" ? version : `${version}-${build}`;
      const res = await createServer({
        name: serverName,
        type: software.toUpperCase(),
        version: fullVersion,
        memory: `${memoryGB}G`
      });
      if (res.id) {
        toast("¡Servidor creado exitosamente!", "success");
        router.push(`/server/${res.id}`);
      }
    } catch (err) {
      toast(err.message || "Error al crear el servidor", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border-2 border-surface-border p-8 rounded-blocky shadow-xl max-w-4xl w-full">
      <div className="flex items-center gap-4 mb-8 border-b-2 border-surface-border pb-6">
        <div className="p-3 bg-primary/20 text-primary rounded-blocky">
          <Server className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-black">Crea tu Servidor</h1>
          <p className="text-foreground/70">Paso {step} de 3</p>
        </div>
      </div>

      {}
      {step === 1 && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4">
          <div>
            <label className="font-bold block mb-2">Nombre del Servidor</label>
            <Input 
              placeholder="Ej. Mi Servidor Extremo" 
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
            />
          </div>
          <div>
            <label className="font-bold block mb-2">Software (Motor)</label>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {SOFTWARE_TYPES.map((type) => (
                <div 
                  key={type.id}
                  onClick={() => setSoftware(type.id)}
                  className={`border-2 p-4 rounded-blocky cursor-pointer transition-all ${
                    software === type.id 
                      ? "border-primary bg-primary/10" 
                      : "border-surface-border hover:border-foreground/30"
                  }`}
                >
                  <h3 className={`font-bold flex items-center justify-between ${type.color}`}>
                    {type.name}
                    {software === type.id && <Check className="w-4 h-4 text-primary" />}
                  </h3>
                  <p className="text-xs text-foreground/70 mt-1">{type.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button 
              onClick={() => setStep(2)} 
              disabled={!serverName || serverName.length < 3}
            >
              Siguiente <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {}
      {step === 2 && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4">
          <div>
            <label className="font-bold block mb-2 flex items-center gap-2">
              <Pickaxe className="w-5 h-5 text-secondary" /> Versión de Minecraft
            </label>
            <div className="relative mb-4">
              <select 
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                disabled={loadingVersions}
                className="w-full bg-surface border-2 border-surface-border text-foreground rounded-blocky px-4 py-3 outline-none focus:border-primary transition-colors appearance-none"
              >
                {loadingVersions ? (
                  <option>Obteniendo versiones desde {SOFTWARE_TYPES.find(s=>s.id===software)?.name}...</option>
                ) : availableVersions.length > 0 ? (
                  availableVersions.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))
                ) : (
                  <option>Error al cargar versiones</option>
                )}
              </select>
              {loadingVersions && (
                <Loader2 className="absolute right-4 top-3.5 w-5 h-5 animate-spin text-foreground/50" />
              )}
            </div>

            {software !== "vanilla" && (
              <div className="mb-4">
                <label className="font-bold block mb-2 flex items-center gap-2">
                  <Server className="w-5 h-5 text-secondary" /> Versión del Software (Build/Loader)
                </label>
                <div className="relative">
                  <select 
                    value={build}
                    onChange={(e) => setBuild(e.target.value)}
                    disabled={loadingBuilds}
                    className="w-full bg-surface border-2 border-surface-border text-foreground rounded-blocky px-4 py-3 outline-none focus:border-primary transition-colors appearance-none"
                  >
                    {loadingBuilds ? (
                      <option>Buscando builds compatibles...</option>
                    ) : availableBuilds.length > 0 ? (
                      availableBuilds.map(b => (
                        <option key={b} value={b}>{b === "LATEST" ? "Última Versión (Recomendada)" : b}</option>
                      ))
                    ) : (
                      <option value="LATEST">Última Versión (Recomendada)</option>
                    )}
                  </select>
                  {loadingBuilds && (
                    <Loader2 className="absolute right-4 top-3.5 w-5 h-5 animate-spin text-foreground/50" />
                  )}
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="font-bold block mb-2 flex items-center gap-2">
              <Settings className="w-5 h-5 text-secondary" /> Memoria RAM Asignada
            </label>
            {agentHardware ? (
              <div className="w-full bg-surface border-2 border-surface-border p-4 rounded-blocky">
                <div className="flex justify-between mb-4">
                  <span className="text-foreground/70 text-sm">
                    Host: {(agentHardware.freeMem / (1024*1024*1024)).toFixed(1)} GB libres de {(agentHardware.totalMem / (1024*1024*1024)).toFixed(1)} GB
                  </span>
                  <span className="font-bold text-primary text-lg">{memoryGB} GB</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max={Math.max(1, Math.floor(agentHardware.freeMem / (1024*1024*1024)))} 
                  step="1"
                  value={memoryGB}
                  onChange={(e) => setMemoryGB(e.target.value)}
                  className="w-full h-2 bg-surface-border rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            ) : (
              <Input 
                type="number" 
                placeholder="Ej. 4 (Gigabytes)" 
                value={memoryGB}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (e.target.value === "") setMemoryGB("");
                  else if (!isNaN(val)) setMemoryGB(Math.max(1, val));
                }}
                min="1"
              />
            )}
            <p className="text-xs text-foreground/60 mt-2">La memoria será asignada nativamente al motor de Java (-Xmx y -Xms).</p>
          </div>
          <div className="flex justify-between mt-4">
            <Button variant="outline" onClick={() => setStep(1)}>Atrás</Button>
            <Button onClick={() => setStep(3)} disabled={loadingVersions || !version}>Siguiente <ArrowRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {}
      {step === 3 && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4">
          <div className="bg-background border-2 border-surface-border rounded-blocky p-6">
            <h3 className="font-bold text-lg mb-4 text-primary">Resumen de Instalación</h3>
            <ul className="space-y-3 font-mono text-sm">
              <li className="flex justify-between"><span className="text-foreground/70">Nombre:</span> <span>{serverName}</span></li>
              <li className="flex justify-between"><span className="text-foreground/70">Software:</span> <span className="uppercase">{software}</span></li>
              <li className="flex justify-between"><span className="text-foreground/70">Versión:</span> <span>{version}</span></li>
              <li className="flex justify-between"><span className="text-foreground/70">RAM:</span> <span>{memoryGB} GB</span></li>
            </ul>
          </div>
          <p className="text-sm text-foreground/80 text-center">
            El servidor se instalará de forma nativa usando nuestra arquitectura Zero-Copy para máxima velocidad.
          </p>
          <div className="flex justify-between mt-4">
            <Button variant="outline" onClick={() => setStep(2)}>Atrás</Button>
            <Button 
              variant="primary" 
              onClick={handleCreate}
              disabled={loading}
              className={loading ? "animate-pulse" : ""}
            >
              {loading ? "Creando servidor..." : "Instalar y Arrancar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
