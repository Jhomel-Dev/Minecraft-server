"use client";
import { useEffect, useState, use } from "react";
import { useTranslations } from "next-intl";
import { getMyServers, updateSettings, deleteServer, fsOperation } from "@/features/servers/services/serverApi";
import { Settings, Save, ShieldCheck, Users, HardDrive, Wifi, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { useRouter } from "next/navigation";
import { useToast } from "@/shared/ui/ToastProvider";

export default function ServerOptionsPage({ params }) {
  const t = useTranslations("ServerOptions");
  const unwrappedParams = use(params);
  const serverId = unwrappedParams.id;
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    maxPlayers: 20,
    whitelist: false,
    onlineMode: true,
    compatibilityMode: false,
    memory: "2048"
  });

  const [properties, setProperties] = useState({});
  const [rawPropertiesOrder, setRawPropertiesOrder] = useState([]);
  const [rawContent, setRawContent] = useState("");

  useEffect(() => {
    loadData();
  }, [serverId]);

  const loadData = async () => {
    try {
      const servers = await getMyServers();
      const server = servers.find(s => s.id === serverId);
      if (server) {
        setSettings({
          maxPlayers: server.maxPlayers ?? 20,
          whitelist: server.whitelist ?? false,
          onlineMode: server.onlineMode ?? true,
          compatibilityMode: server.compatibilityMode ?? false,
          memory: server.memory ?? "2G"
        });
      }

      const fileRes = await fsOperation(serverId, { action: "read", filePath: "server.properties" });
      if (fileRes && fileRes.content) {
        setRawContent(fileRes.content);
        const lines = fileRes.content.split("\n");
        const parsed = {};
        const order = [];
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#")) {
            const idx = trimmed.indexOf('=');
            if (idx > -1) {
              const key = trimmed.substring(0, idx).trim();
              const val = trimmed.substring(idx + 1).trim();
              parsed[key] = val;
              order.push(key);
            }
          }
        }
        setProperties(parsed);
        setRawPropertiesOrder(order);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(serverId, settings);
      
      
      const mergedProps = {
        ...properties,
        "max-players": settings.maxPlayers.toString(),
        "white-list": settings.whitelist.toString(),
        "online-mode": settings.onlineMode.toString()
      };
      
      const lines = rawContent.split('\n');
      const newLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;
        const idx = trimmed.indexOf('=');
        if (idx > -1) {
          const key = trimmed.substring(0, idx).trim();
          if (mergedProps.hasOwnProperty(key)) {
            return `${key}=${mergedProps[key]}`;
          }
        }
        return line;
      });

      
      Object.keys(mergedProps).forEach(key => {
        if (!lines.some(l => l.split('=')[0].trim() === key && !l.trim().startsWith('#'))) {
          newLines.push(`${key}=${mergedProps[key]}`);
        }
      });
      
      const propsString = newLines.join("\n");
      
      await fsOperation(serverId, {
        action: "write",
        filePath: "server.properties",
        content: propsString
      });
      setRawContent(propsString);
      toast(t("saveSuccessToast"), "success");
    } catch (error) {
      console.error(error);
      toast(t("saveErrorToast") + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [keepFiles, setKeepFiles] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteServer(serverId, keepFiles);
      router.push("/servers");
    } catch (error) {
      toast(t("errorPrefix") + error.message, "error");
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateProperty = (key, value) => {
    setProperties(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="p-8 text-center font-bold text-foreground/50">{t("loadingOptions")}</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col gap-6 h-full animate-in fade-in pb-24">
      <div className="flex items-center justify-between bg-surface p-6 rounded-blocky border-2 border-surface-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-blocky">
            <Settings className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black">{t("title")}</h1>
            <p className="text-foreground/70 font-semibold">{t("subtitle")}</p>
          </div>
        </div>
        
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          <Save className="w-5 h-5 mr-2 inline-block" /> 
          {saving ? t("saving") : t("saveChanges")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {}
        <div className="bg-surface border-2 border-surface-border p-6 rounded-blocky shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b-2 border-surface-border pb-4">
            <Users className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">{t("playersCategory")}</h2>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="font-bold text-sm text-foreground/80">{t("playerLimitLabel")}</label>
            <Input 
              type="number" 
              min="1" 
              max="10000"
              value={settings.maxPlayers}
              onChange={(e) => setSettings({ ...settings, maxPlayers: e.target.value })}
              onBlur={() => {
                let val = parseInt(settings.maxPlayers);
                if (isNaN(val) || val < 1) val = 1;
                if (val > 100000) val = 100000;
                setSettings({ ...settings, maxPlayers: val });
              }}
            />
          </div>
        </div>

        {}
        <div className="bg-surface border-2 border-surface-border p-6 rounded-blocky shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b-2 border-surface-border pb-4">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">{t("securityCategory")}</h2>
          </div>
          
          <ToggleOption 
            title={t("onlineModeTitle")} 
            description={t("onlineModeDesc")}
            checked={settings.onlineMode}
            onToggle={() => toggleSetting('onlineMode')}
            icon={<Wifi className="w-5 h-5" />}
          />
          
          <ToggleOption 
            title={t("whitelistTitle")} 
            description={t("whitelistDesc")}
            checked={settings.whitelist}
            onToggle={() => toggleSetting('whitelist')}
            icon={<ShieldCheck className="w-5 h-5" />}
          />
        </div>

        {}
        <div className="bg-surface border-2 border-surface-border p-6 rounded-blocky shadow-sm flex flex-col gap-4 md:col-span-2">
          <div className="flex items-center gap-3 border-b-2 border-surface-border pb-4">
            <HardDrive className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">{t("hardwareCategory")}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="font-bold text-sm text-foreground/80">{t("ramAllocatedLabel")}</label>
              <select 
                value={settings.memory}
                onChange={(e) => setSettings({ ...settings, memory: e.target.value })}
                className="bg-background border-2 border-surface-border rounded-blocky px-4 py-2 font-semibold text-foreground focus:outline-none focus:border-primary transition-colors appearance-none"
              >
                <option value="1G">1 GB ({t("ram1g")})</option>
                <option value="2G">2 GB ({t("ram2g")})</option>
                <option value="4G">4 GB ({t("ram4g")})</option>
                <option value="6G">6 GB ({t("ram6g")})</option>
                <option value="8G">8 GB ({t("ram8g")})</option>
              </select>
            </div>

            <ToggleOption 
              title={t("compatibilityModeTitle")} 
              description={t("compatibilityModeDesc")}
              checked={settings.compatibilityMode}
              onToggle={() => toggleSetting('compatibilityMode')}
              icon={<ShieldAlert className="w-5 h-5" />}
              danger
            />
          </div>
        </div>

        {}
        <div className="bg-surface border-2 border-surface-border p-6 rounded-blocky shadow-sm flex flex-col gap-4 md:col-span-2 mt-4">
          <div className="flex items-center gap-3 border-b-2 border-surface-border pb-4">
            <Settings className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold">{t("advancedOptionsCategory")}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {}
              
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="font-bold text-sm text-foreground/80">{t("motdLabel")}</label>
                <Input 
                  value={properties["motd"] ?? ""}
                  onChange={(e) => updateProperty("motd", e.target.value)}
                  placeholder="A Minecraft Server"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-bold text-sm text-foreground/80">{t("difficultyLabel")}</label>
                <select 
                  value={properties["difficulty"] ?? "easy"}
                  onChange={(e) => updateProperty("difficulty", e.target.value)}
                  className="bg-background border-2 border-surface-border rounded-blocky px-4 py-2 font-semibold text-foreground focus:outline-none focus:border-primary transition-colors appearance-none"
                >
                  <option value="peaceful">{t("difficultyPeaceful")}</option>
                  <option value="easy">{t("difficultyEasy")}</option>
                  <option value="normal">{t("difficultyNormal")}</option>
                  <option value="hard">{t("difficultyHard")}</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-bold text-sm text-foreground/80">{t("gamemodeLabel")}</label>
                <select 
                  value={properties["gamemode"] ?? "survival"}
                  onChange={(e) => updateProperty("gamemode", e.target.value)}
                  className="bg-background border-2 border-surface-border rounded-blocky px-4 py-2 font-semibold text-foreground focus:outline-none focus:border-primary transition-colors appearance-none"
                >
                  <option value="survival">{t("gamemodeSurvival")}</option>
                  <option value="creative">{t("gamemodeCreative")}</option>
                  <option value="adventure">{t("gamemodeAdventure")}</option>
                  <option value="spectator">{t("gamemodeSpectator")}</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-bold text-sm text-foreground/80">{t("viewDistanceLabel")}</label>
                <Input 
                  type="number" 
                  min="2" 
                  max="32"
                  value={properties["view-distance"] ?? "10"}
                  onChange={(e) => updateProperty("view-distance", e.target.value)}
                  onBlur={(e) => {
                    let val = parseInt(e.target.value);
                    if (isNaN(val) || val < 2) val = 2;
                    if (val > 32) val = 32;
                    updateProperty("view-distance", val.toString());
                  }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-bold text-sm text-foreground/80">{t("spawnProtectionLabel")}</label>
                <Input 
                  type="number" 
                  min="0" 
                  max="1000"
                  value={properties["spawn-protection"] ?? "16"}
                  onChange={(e) => updateProperty("spawn-protection", e.target.value)}
                  onBlur={(e) => {
                    let val = parseInt(e.target.value);
                    if (isNaN(val) || val < 0) val = 0;
                    if (val > 10000) val = 10000;
                    updateProperty("spawn-protection", val.toString());
                  }}
                />
              </div>

              <ToggleOption 
                title={t("pvpTitle")} 
                description={t("pvpDesc")}
                checked={properties["pvp"] === "true"}
                onToggle={() => updateProperty("pvp", properties["pvp"] === "true" ? "false" : "true")}
                icon={<ShieldAlert className="w-5 h-5" />}
              />

              <ToggleOption 
                title={t("allowFlightTitle")} 
                description={t("allowFlightDesc")}
                checked={properties["allow-flight"] === "true"}
                onToggle={() => updateProperty("allow-flight", properties["allow-flight"] === "true" ? "false" : "true")}
                icon={<Wifi className="w-5 h-5" />}
              />

              <ToggleOption 
                title={t("hardcoreTitle")} 
                description={t("hardcoreDesc")}
                checked={properties["hardcore"] === "true"}
                onToggle={() => updateProperty("hardcore", properties["hardcore"] === "true" ? "false" : "true")}
                icon={<ShieldAlert className="w-5 h-5" />}
                danger
              />

              <ToggleOption 
                title={t("enableCommandBlockTitle")} 
                description={t("enableCommandBlockDesc")}
                checked={properties["enable-command-block"] === "true"}
                onToggle={() => updateProperty("enable-command-block", properties["enable-command-block"] === "true" ? "false" : "true")}
                icon={<Settings className="w-5 h-5" />}
              />
            </div>
          </div>

        {}
        <div className="bg-red-500/10 border-2 border-red-500/30 p-6 rounded-blocky shadow-sm flex flex-col gap-4 md:col-span-2 mt-4">
          <div className="flex items-center gap-3 border-b-2 border-red-500/20 pb-4">
            <Trash2 className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-bold text-red-500">{t("dangerZone")}</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-foreground">{t("deleteServerTitle")}</h3>
              <p className="text-sm text-foreground/70">{t("deleteServerDesc")}</p>
            </div>
            <Button data-cy="options-delete-server-btn" variant="outline" className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors" onClick={() => setShowDeleteModal(true)}>
              {t("deleteServerBtn")}
            </Button>
          </div>
        </div>

      </div>

      {}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in">
          <div className="bg-surface border-2 border-red-500/30 p-8 rounded-blocky shadow-2xl max-w-md w-full animate-in zoom-in-95 slide-in-from-bottom-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-black text-red-500">{t("deleteServerTitle")}</h2>
            </div>
            <p className="text-foreground/80 mb-6">
              {t("deleteWarningText")} 
              <br /><br />
              <b>Nota:</b> {t("deleteGlobalNoteText")}
            </p>

            <div className="bg-background border-2 border-surface-border rounded-blocky p-4 mb-6 cursor-pointer hover:border-primary transition-colors" onClick={() => setKeepFiles(!keepFiles)}>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={keepFiles} 
                  onChange={(e) => setKeepFiles(e.target.checked)}
                  className="w-5 h-5 accent-primary cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
                <div>
                  <h4 className="font-bold">{t("keepFilesTitle")}</h4>
                  <p className="text-xs text-foreground/60 leading-tight mt-1">
                    {t("keepFilesDesc")}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                {t("cancel")}
              </Button>
              <Button data-cy="options-confirm-delete-btn" className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleDelete} disabled={deleting}>
                {deleting ? t("deleting") : t("confirmDelete")}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function ToggleOption({ title, description, checked, onToggle, icon, danger }) {
  return (
    <div className="flex items-center justify-between p-4 bg-background rounded-blocky border-2 border-surface-border">
      <div className="flex gap-3">
        <div className={`mt-1 ${danger ? 'text-danger' : 'text-primary'}`}>
          {icon}
        </div>
        <div>
          <h3 className="font-bold">{title}</h3>
          <p className="text-xs text-foreground/60 leading-tight mt-1 max-w-[200px]">{description}</p>
        </div>
      </div>
      <button 
        onClick={onToggle}
        className={`relative w-14 h-8 rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
          checked 
            ? 'bg-primary border-primary' 
            : 'bg-surface border-surface-border'
        }`}
      >
        <span 
          className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-200 ease-in-out ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`} 
        />
      </button>
    </div>
  );
}
