"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, Save, FileText, Loader2, ShieldAlert, AlertTriangle } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { fsOperation } from "@/features/servers/services/serverApi";
import { useToast } from "@/shared/ui/ToastProvider";

// CodeMirror imports
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import * as jsyaml from 'js-yaml';

export function FileEditor({ serverId, filePath, onBack }) {
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  
  // Validation state
  const [errorMsg, setErrorMsg] = useState(null);
  
  const { toast } = useToast();

  const isBinary = (path) => {
    const ext = path.split('.').pop().toLowerCase();
    const binaryExts = ["jar", "zip", "gz", "tar", "mca", "dat", "nbt", "db", "sqlite"];
    return binaryExts.includes(ext);
  };

  const getLanguage = (path) => {
    const ext = path.split('.').pop().toLowerCase();
    if (ext === "json") return "json";
    if (ext === "yml" || ext === "yaml") return "yaml";
    return "text";
  };

  const fileExt = getLanguage(filePath);

  useEffect(() => {
    if (isBinary(filePath)) {
      setLoading(false);
      return;
    }

    const fetchFile = async () => {
      try {
        setLoading(true);
        const res = await fsOperation(serverId, { action: "read", filePath });
        if (res && res.content !== undefined) {
          setContent(res.content);
          setOriginalContent(res.content);
          validateSyntax(res.content, fileExt);
        } else {
          toast("El archivo está vacío o no se pudo leer", "warning");
        }
      } catch (err) {
        toast(`Error al leer archivo, asumiendo nuevo archivo: ${err.message}`, "warning");
        setContent("");
        setOriginalContent("");
      } finally {
        setLoading(false);
      }
    };
    fetchFile();
  }, [serverId, filePath]);

  const validateSyntax = (val, lang) => {
    if (!val.trim()) {
      setErrorMsg(null);
      return;
    }

    if (lang === "json") {
      try {
        JSON.parse(val);
        setErrorMsg(null);
      } catch (e) {
        setErrorMsg(`Error de sintaxis JSON: ${e.message}`);
      }
    } else if (lang === "yaml") {
      try {
        jsyaml.load(val);
        setErrorMsg(null);
      } catch (e) {
        setErrorMsg(`Error de sintaxis YAML: ${e.message}`);
      }
    } else {
      setErrorMsg(null);
    }
  };

  // Debounce for onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      validateSyntax(content, fileExt);
    }, 500);
    return () => clearTimeout(timer);
  }, [content, fileExt]);

  const handleSave = async () => {
    if (errorMsg) return;
    
    try {
      setSaving(true);
      await fsOperation(serverId, { 
        action: "write", 
        filePath, 
        content 
      });
      setOriginalContent(content);
      toast("Archivo guardado correctamente", "success");
    } catch (err) {
      toast(`Error al guardar: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // CodeMirror Extensions
  const extensions = useMemo(() => {
    if (fileExt === "json") return [json()];
    if (fileExt === "yaml") return [yaml()];
    return [];
  }, [fileExt]);

  if (isBinary(filePath)) {
    return (
      <div className="flex flex-col h-full bg-surface border-2 border-surface-border rounded-blocky shadow-sm overflow-hidden animate-in fade-in">
        <div className="flex items-center justify-between p-4 border-b-2 border-surface-border bg-background/50">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <ShieldAlert className="w-20 h-20 text-danger mb-4 opacity-80" />
          <h2 className="text-3xl font-black mb-2">Acceso Denegado</h2>
          <p className="text-foreground/70 font-semibold max-w-md">
            Los archivos binarios (.jar, .dat, .mca) y los ejecutables del servidor no pueden ser modificados manualmente por seguridad.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-64 bg-surface border-2 border-surface-border rounded-blocky shadow-sm">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-foreground/70 font-bold">Leyendo archivo...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface border-2 border-surface-border rounded-blocky shadow-sm overflow-hidden animate-in fade-in">
      {/* Editor Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border-b-2 border-surface-border bg-background/50 gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              if (content !== originalContent) {
                setShowExitWarning(true);
              } else {
                onBack();
              }
            }} 
            className="px-3 shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div className="h-6 w-px bg-surface-border mx-2 hidden md:block"></div>
          <FileText className="w-5 h-5 text-primary shrink-0" />
          <span className="font-mono text-sm font-bold truncate">
            {filePath} {content !== originalContent && <span className="text-warning ml-1">*</span>}
          </span>
        </div>
        
        <Button 
          onClick={handleSave} 
          disabled={saving || errorMsg !== null || content === originalContent} 
          className="font-bold w-full md:w-auto"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar
        </Button>
      </div>

      {/* Exit Warning Overlay */}
      {showExitWarning && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in">
          <div className="bg-surface border-2 border-surface-border p-6 rounded-blocky shadow-lg max-w-sm w-full text-center">
            <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">¿Salir sin guardar?</h3>
            <p className="text-foreground/70 text-sm font-semibold mb-6">
              Tienes cambios pendientes en <span className="font-mono text-foreground">{filePath}</span> que se perderán si sales ahora.
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => setShowExitWarning(false)} className="w-full font-bold">
                Seguir Editando
              </Button>
              <Button variant="outline" onClick={onBack} className="w-full border-danger/20 text-danger hover:bg-danger/10 font-bold">
                Salir y Perder Cambios
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Box */}
      {errorMsg && (
        <div className="bg-danger/10 border-b-2 border-danger p-3 flex items-start gap-3 animate-in slide-in-from-top-1">
          <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div className="flex-1 overflow-hidden">
            <p className="text-danger font-bold text-sm">Error de Sintaxis Detectado</p>
            <p className="text-danger/80 text-xs font-mono truncate">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* CodeMirror */}
      <div className="flex-1 bg-background relative min-h-[500px]">
        <CodeMirror
          value={content}
          height="100%"
          theme="dark"
          extensions={extensions}
          onChange={(val) => setContent(val)}
          className="h-full absolute inset-0 text-sm overflow-hidden cm-editor-wrapper"
        />
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .cm-editor-wrapper .cm-editor { height: 100%; outline: none !important; }
        .cm-editor-wrapper .cm-scroller { font-family: inherit; }
        .cm-editor-wrapper .cm-gutters { background-color: transparent; border-right: 1px solid var(--surface-border, #333); color: #666; }
      `}} />
    </div>
  );
}
