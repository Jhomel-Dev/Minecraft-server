"use client";
import { useState, useRef } from "react";
import { Button } from "@/shared/ui/Button";
import { Laptop, Copy, Check, Loader2 } from "lucide-react";
import { useToast } from "@/shared/ui/ToastProvider";
import { API_URL, refreshAccessToken } from "@/features/auth/services/api";

const claimPinApi = async (pin) => {
  let res = await fetch(`${API_URL}/api/agent/pairing/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
    credentials: "include"
  });

  if (res.status === 401) {
    await refreshAccessToken();
    res = await fetch(`${API_URL}/api/agent/pairing/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
      credentials: "include"
    });
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error al vincular PIN");
  }
  return res.json();
};

export function LinkPcModal({ onClose }) {
  const [copiedId, setCopiedId] = useState(null);
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [isClaiming, setIsClaiming] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef([]);
  const { toast } = useToast();

  const getBaseUrl = () => typeof window !== 'undefined' ? window.location.origin : '';

  const copyToClipboard = (textToCopy, id) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(id);
    toast("¡Comando copiado!", "success");
    setTimeout(() => setCopiedId(null), 3000);
  };

  const submitPin = async (fullPin) => {
    if (fullPin.length !== 6) return;
    setIsClaiming(true);
    try {
      await claimPinApi(fullPin);
      setSuccess(true);
      toast("¡Máquina vinculada exitosamente!", "success");
      setTimeout(() => onClose(), 3000);
    } catch (error) {
      toast(error.message, "error");
      setPin(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsClaiming(false);
    }
  };

  const handlePinChange = (index, value) => {
    const cleanValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanValue && value !== "") return;

    const newPin = [...pin];
    newPin[index] = cleanValue;
    setPin(newPin);

    if (cleanValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullPin = newPin.join('');
    if (fullPin.length === 6) {
      submitPin(fullPin);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (!pastedData) return;
    
    const newPin = [...pin];
    for (let i = 0; i < pastedData.length; i++) {
      newPin[i] = pastedData[i];
    }
    setPin(newPin);
    
    if (pastedData.length === 6) {
      submitPin(pastedData);
    } else {
      inputRefs.current[pastedData.length]?.focus();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface border-2 border-surface-border p-6 rounded-blocky shadow-2xl max-w-2xl w-full animate-in zoom-in-95">
        
        <div className="flex items-center justify-between mb-6 border-b-2 border-surface-border pb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 text-primary rounded-blocky">
              <Laptop className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black">Vincular una PC</h2>
              <p className="text-foreground/70">Añade un nodo para alojar servidores</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span> 
              Instala el Agente en tu máquina
            </h3>
            <p className="text-sm text-foreground/70 mb-4">
              Ejecuta este comando en la terminal de la máquina que alojará los servidores:
            </p>
            <div className="space-y-4">
              <a 
                href="https://github.com/Jhomel-Dev/Minecraft-server/releases/download/release/v2.0.0/CraftControl-Agent_2.0.0_x64_en-US.msi" 
                className="flex items-center justify-between w-full p-4 bg-surface border-2 border-surface-border hover:border-primary rounded-blocky transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 text-primary rounded-blocky group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-foreground">Descargar para Windows</p>
                    <p className="text-xs text-foreground/50">Instalador Gráfico (.msi)</p>
                  </div>
                </div>
              </a>

              <a 
                href="https://github.com/Jhomel-Dev/Minecraft-server/releases/download/release/v2.0.0/CraftControl-Agent_2.0.0_amd64.AppImage" 
                className="flex items-center justify-between w-full p-4 bg-surface border-2 border-surface-border hover:border-red-500 rounded-blocky transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 text-red-500 rounded-blocky group-hover:bg-red-500 group-hover:text-white transition-colors">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-foreground">Descargar para Linux</p>
                    <p className="text-xs text-foreground/50">AppImage (Escritorio)</p>
                  </div>
                </div>
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span> 
              Ingresa el PIN de seguridad
            </h3>
            <p className="text-sm text-foreground/70 mb-4">
              Al finalizar la instalación, la terminal te mostrará un código de 6 dígitos. Escríbelo aquí:
            </p>
            
            <div className="flex flex-col items-center justify-center py-6 bg-background/50 rounded-blocky border-2 border-dashed border-surface-border">
              {success ? (
                <div className="flex flex-col items-center animate-in zoom-in text-green-500">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-3">
                    <Check className="w-8 h-8" />
                  </div>
                  <h3 className="font-black text-xl">¡Máquina Vinculada!</h3>
                  <p className="text-sm opacity-80 mt-1">Cerrando ventana...</p>
                </div>
              ) : (
                <div className="flex gap-2 sm:gap-4" onPaste={handlePaste}>
                  {pin.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => inputRefs.current[i] = el}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={e => handlePinChange(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      disabled={isClaiming}
                      className="w-12 h-16 sm:w-16 sm:h-20 bg-surface border-2 border-surface-border rounded-blocky text-center text-2xl sm:text-3xl font-black text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50"
                    />
                  ))}
                </div>
              )}
              {isClaiming && (
                <div className="flex items-center gap-2 text-primary mt-6 animate-pulse">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-bold">Verificando en la nube...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t-2 border-surface-border flex justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isClaiming || success}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
