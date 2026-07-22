"use client";
import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/Button";
import { Laptop, Copy, Check, Loader2, ArrowRight } from "lucide-react";
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

export function AgentLinkingStage({ onLinked }) {
  const t = useTranslations("AgentLinkingStage");
  const [copiedId, setCopiedId] = useState(null);
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [isClaiming, setIsClaiming] = useState(false);
  const [success, setSuccess] = useState(false);
  const [downloadLinks, setDownloadLinks] = useState({
    win: "https://github.com/Jhomel-Dev/Minecraft-server/releases/latest",
    linux: "https://github.com/Jhomel-Dev/Minecraft-server/releases/latest"
  });
  const inputRefs = useRef([]);
  const { toast } = useToast();

  const getBaseUrl = () => typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    fetch("https://api.github.com/repos/Jhomel-Dev/Minecraft-server/releases/latest")
      .then(res => res.json())
      .then(data => {
        if (data && data.assets) {
          let win = data.assets.find(a => a.name.endsWith("-setup.exe"));
          let linux = data.assets.find(a => a.name.endsWith(".AppImage"));
          setDownloadLinks(prev => ({
            win: win ? win.browser_download_url : prev.win,
            linux: linux ? linux.browser_download_url : prev.linux
          }));
        }
      })
      .catch(() => {});
  }, []);

  const copyToClipboard = (textToCopy, id) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(id);
    toast(t("commandCopied"), "success");
    setTimeout(() => setCopiedId(null), 3000);
  };

  const submitPin = async (fullPin) => {
    if (fullPin.length !== 6) return;
    setIsClaiming(true);
    try {
      await claimPinApi(fullPin);
      setSuccess(true);
      toast(t("machineLinkedSuccess"), "success");
      setTimeout(() => onLinked(), 2000);
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
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/20 text-primary rounded-full mb-6 border-4 border-primary/30 shadow-[0_0_40px_rgba(var(--primary-rgb),0.3)]">
          <Laptop className="w-10 h-10" />
        </div>
        <h1 data-cy="agent-prepare-title" className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-primary to-red-400 bg-clip-text text-transparent">
          {t("title")}
        </h1>
        <p className="text-foreground/70 text-lg max-w-2xl mx-auto">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        {/* Paso 1: Instalación */}
        <div className="bg-surface border-2 border-surface-border p-8 rounded-blocky shadow-xl flex flex-col relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
          
          <h3 className="font-bold text-xl mb-6 flex items-center gap-3">
            <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shadow-lg">1</span> 
            {t("step1Title")}
          </h3>
          <p className="text-sm text-foreground/70 mb-6">
            {t("step1Desc")}
          </p>
          
          <div className="space-y-4 mt-auto">
            <a 
              href={downloadLinks.win} 
              className="flex items-center justify-between w-full p-4 bg-surface border-2 border-surface-border hover:border-primary rounded-blocky transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 text-primary rounded-blocky group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Laptop className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-foreground">{t("downloadWinTitle")}</p>
                  <p className="text-xs text-foreground/50">{t("downloadWinSub")}</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-primary/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </a>

            <a 
              href={downloadLinks.linux} 
              className="flex items-center justify-between w-full p-4 bg-surface border-2 border-surface-border hover:border-red-500 rounded-blocky transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 text-red-500 rounded-blocky group-hover:bg-red-500 group-hover:text-white transition-colors">
                  <Laptop className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-foreground">{t("downloadLinuxTitle")}</p>
                  <p className="text-xs text-foreground/50">{t("downloadLinuxSub")}</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-red-500/50 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
            </a>
          </div>
        </div>

        {/* Paso 2: PIN */}
        <div className="bg-surface border-2 border-surface-border p-8 rounded-blocky shadow-xl flex flex-col relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-red-500/5 rounded-full translate-y-20 -translate-x-20 blur-3xl"></div>
          
          <h3 className="font-bold text-xl mb-6 flex items-center gap-3">
            <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shadow-lg">2</span> 
            {t("step2Title")}
          </h3>
          <p className="text-sm text-foreground/70 mb-8">
            {t("step2Desc")}
          </p>
          
          <div className="flex-1 flex flex-col items-center justify-center mt-auto bg-background/50 rounded-blocky border-2 border-dashed border-surface-border p-8 relative">
            {success ? (
              <div className="flex flex-col items-center animate-in zoom-in text-green-500 duration-500">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                  <Check className="w-10 h-10" />
                </div>
                <h3 data-cy="agent-linked-success-msg" className="font-black text-2xl">{t("machineLinkedTitle")}</h3>
                <p className="text-sm text-green-500/70 mt-2 font-bold flex items-center gap-2">
                  {t("redirecting")} <Loader2 className="w-4 h-4 animate-spin" />
                </p>
              </div>
            ) : (
              <div className="flex gap-2 sm:gap-3" onPaste={handlePaste}>
                {pin.map((digit, i) => (
                  <input
                    key={i}
                    data-cy={`agent-pin-input-${i}`}
                    ref={el => inputRefs.current[i] = el}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={e => handlePinChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    disabled={isClaiming}
                    className="w-10 h-14 sm:w-14 sm:h-20 bg-surface border-2 border-surface-border rounded-blocky text-center text-2xl sm:text-4xl font-black text-primary focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 shadow-inner"
                  />
                ))}
              </div>
            )}
            
            {isClaiming && !success && (
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 text-primary whitespace-nowrap">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-bold text-sm">{t("connectingSecurely")}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
