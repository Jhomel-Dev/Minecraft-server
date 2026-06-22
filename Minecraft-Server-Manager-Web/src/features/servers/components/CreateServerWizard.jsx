"use client";
import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Pickaxe, Server, Settings, ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";

const SOFTWARE_TYPES = [
  { id: "paper", name: "PaperMC", desc: "Optimizado para plugins (Recomendado)", color: "text-blue-500" },
  { id: "vanilla", name: "Vanilla", desc: "Minecraft base, sin modificaciones", color: "text-green-500" },
  { id: "fabric", name: "Fabric", desc: "Ideal para mods ligeros", color: "text-orange-500" },
];

export function CreateServerWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Form State
  const [serverName, setServerName] = useState("");
  const [software, setSoftware] = useState("paper");
  const [version, setVersion] = useState("1.20.4");
  const [memory, setMemory] = useState("2048");

  const handleCreate = async () => {
    setLoading(true);
    // Simulating API call for now
    setTimeout(() => {
      setLoading(false);
      // Redirige al dashboard del servidor creado
      router.push("/dashboard/server-1"); 
    }, 2000);
  };

  return (
    <div className="bg-surface border-2 border-surface-border p-8 rounded-blocky shadow-xl max-w-2xl w-full">
      <div className="flex items-center gap-4 mb-8 border-b-2 border-surface-border pb-6">
        <div className="p-3 bg-primary/20 text-primary rounded-blocky">
          <Server className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-black">Crea tu Servidor</h1>
          <p className="text-foreground/70">Paso {step} de 3</p>
        </div>
      </div>

      {/* STEP 1: Basic Info */}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* STEP 2: Version & Hardware */}
      {step === 2 && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4">
          <div>
            <label className="font-bold block mb-2 flex items-center gap-2">
              <Pickaxe className="w-5 h-5 text-secondary" /> Versión de Minecraft
            </label>
            <select 
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full bg-surface border-2 border-surface-border text-foreground rounded-blocky px-4 py-3 outline-none focus:border-primary transition-colors appearance-none"
            >
              <option value="1.20.4">1.20.4 (Más reciente)</option>
              <option value="1.20.1">1.20.1 (Estable)</option>
              <option value="1.19.4">1.19.4</option>
              <option value="1.16.5">1.16.5 (Clásico)</option>
              <option value="1.8.8">1.8.8 (PvP Legacy)</option>
            </select>
          </div>
          <div>
            <label className="font-bold block mb-2 flex items-center gap-2">
              <Settings className="w-5 h-5 text-secondary" /> Memoria RAM (MB)
            </label>
            <Input 
              type="number"
              placeholder="Ej. 2048 para 2GB" 
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
            />
            <p className="text-xs text-foreground/60 mt-2">Recomendado: 2048 MB o más para PaperMC.</p>
          </div>
          <div className="flex justify-between mt-4">
            <Button variant="outline" onClick={() => setStep(1)}>Atrás</Button>
            <Button onClick={() => setStep(3)}>Siguiente <ArrowRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* STEP 3: Confirmation */}
      {step === 3 && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4">
          <div className="bg-background border-2 border-surface-border rounded-blocky p-6">
            <h3 className="font-bold text-lg mb-4 text-primary">Resumen de Instalación</h3>
            <ul className="space-y-3 font-mono text-sm">
              <li className="flex justify-between"><span className="text-foreground/70">Nombre:</span> <span>{serverName}</span></li>
              <li className="flex justify-between"><span className="text-foreground/70">Software:</span> <span className="uppercase">{software}</span></li>
              <li className="flex justify-between"><span className="text-foreground/70">Versión:</span> <span>{version}</span></li>
              <li className="flex justify-between"><span className="text-foreground/70">RAM:</span> <span>{memory} MB</span></li>
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
