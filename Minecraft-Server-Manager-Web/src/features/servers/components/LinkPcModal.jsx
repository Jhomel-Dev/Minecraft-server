"use client";
import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Laptop, Copy, Check, ExternalLink } from "lucide-react";
import { useToast } from "@/shared/ui/ToastProvider";

export function LinkPcModal({ token, onClose }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://tu-api.onrender.com";

  const copyToClipboard = (textToCopy) => {
    navigator.clipboard.writeText(textToCopy);
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
              Selecciona tu sistema operativo, copia el comando y pégalo en una terminal. Este comando descargará e instalará todo lo necesario automáticamente (sin requerir que tengas Node.js instalado).
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground/60 uppercase">Para Windows (PowerShell)</label>
                <div className="relative group mt-1">
                  <pre className="bg-background border-2 border-surface-border p-3 pr-12 rounded-blocky text-xs font-mono overflow-x-auto text-primary/90 whitespace-pre-wrap break-all">
                    {`Invoke-RestMethod -Uri "${apiUrl.replace('/api', '')}/install-windows.ps1" -OutFile "install.ps1"; .\\install.ps1 "${apiUrl.replace('/api', '')}"`}
                  </pre>
                  <button 
                    onClick={() => copyToClipboard(`Invoke-RestMethod -Uri "${apiUrl.replace('/api', '')}/install-windows.ps1" -OutFile "install.ps1"; .\\install.ps1 "${apiUrl.replace('/api', '')}"`)}
                    className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 bg-surface border-2 border-surface-border rounded-blocky hover:bg-surface-border transition-colors"
                    title="Copiar Comando Windows"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground/60 uppercase">Para Linux / Mac (Bash)</label>
                <div className="relative group mt-1">
                  <pre className="bg-background border-2 border-surface-border p-3 pr-12 rounded-blocky text-xs font-mono overflow-x-auto text-primary/90 whitespace-pre-wrap break-all">
                    {`curl -sL ${apiUrl.replace('/api', '')}/install-linux.sh | bash -s ${apiUrl.replace('/api', '')}`}
                  </pre>
                  <button 
                    onClick={() => copyToClipboard(`curl -sL ${apiUrl.replace('/api', '')}/install-linux.sh | bash -s ${apiUrl.replace('/api', '')}`)}
                    className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 bg-surface border-2 border-surface-border rounded-blocky hover:bg-surface-border transition-colors"
                    title="Copiar Comando Linux"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span> 
              Conecta tu Cuenta
            </h3>
            <p className="text-sm text-foreground/70 mb-3">
              Cuando la terminal termine de instalar, se abrirá una ventana negra interactiva. Copia este Token Secreto cuando te lo pida:
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-foreground/60 uppercase">Comando Secreto / Token</label>
                <div className="relative group mt-1">
                  <pre className="bg-background border-2 border-surface-border p-3 pr-12 rounded-blocky text-sm font-mono overflow-x-auto text-red-400">
                    {token}
                  </pre>
                  <button 
                    onClick={() => copyToClipboard(token)}
                    className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 bg-surface border-2 border-surface-border rounded-blocky hover:bg-surface-border transition-colors"
                    title="Copiar Token"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-red-400 mt-3 font-bold">
              ⚠️ ATENCIÓN: El Token es tu código secreto. No lo compartas con extraños, ya que les daría acceso a tu panel.
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
