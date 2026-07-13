"use client";
import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Laptop, Copy, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/shared/ui/ToastProvider";

export function LinkPcModal({ token, onClose }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://tu-api.onrender.com";
  const command = `node agent.js --url="${apiUrl}" --token="${token}"`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    toast("¡Comando copiado al portapapeles!", "success");
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface border-2 border-surface-border p-6 rounded-blocky shadow-2xl max-w-2xl w-full animate-in zoom-in-95">
        <div className="flex items-center gap-4 mb-6 border-b-2 border-surface-border pb-4">
          <div className="p-3 bg-primary/20 text-primary rounded-blocky">
            <Laptop className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black">Vincular una PC (Host)</h2>
            <p className="text-foreground/70">Usa tu propia computadora o la de un amigo para alojar servidores.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span> 
              Descarga el Agente
            </h3>
            <p className="text-sm text-foreground/70 mb-3">
              Descarga la versión para tu sistema. No necesitas tener nada instalado, ¡ni siquiera Node.js!
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <a href="/agent-win.exe" download>
                <Button variant="primary" className="w-full sm:w-auto">
                  Windows (.exe)
                </Button>
              </a>
              <a href="/agent-linux" download>
                <Button variant="outline" className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10">
                  Linux
                </Button>
              </a>
              <a href="https://github.com/Jhomel-Dev/Minecraft-server/tree/main/Minecraft-Server-Manager-LocalAgent" target="_blank" rel="noreferrer">
                <Button variant="outline" className="w-full sm:w-auto border-surface-border text-foreground/70">
                  <ExternalLink className="w-4 h-4 mr-2 inline-block" /> Código (GitHub)
                </Button>
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span> 
              Inicia el Agente
            </h3>
            <p className="text-sm text-foreground/70 mb-3">
              Haz doble clic en el archivo que descargaste. Se abrirá una ventana negra pidiéndote tu URL y Comando Secreto. Cópialo de aquí abajo y pégalo allí:
            </p>
            <div className="relative group">
              <pre className="bg-background border-2 border-surface-border p-4 rounded-blocky text-xs sm:text-sm font-mono overflow-x-auto text-primary/90">
                {command}
              </pre>
              <button 
                onClick={copyToClipboard}
                className="absolute top-2 right-2 p-2 bg-surface border-2 border-surface-border rounded-blocky hover:bg-surface-border transition-colors"
                title="Copiar comando"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-red-400 mt-2 font-bold">
              ⚠️ ATENCIÓN: Este comando contiene tu código secreto. No lo compartas con extraños, ya que les daría acceso a tu panel.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t-2 border-surface-border flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Entendido, cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
