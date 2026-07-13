import { useState, useEffect, useCallback, useMemo } from "react";
import { fsOperation } from "@/features/servers/services/serverApi";
import { useToast } from "@/shared/ui/ToastProvider";
import * as jsyaml from 'js-yaml';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';

export function useFileEditor(serverId, filePath) {
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const { toast } = useToast();

  const isBinary = (path) => {
    if (!path) return false;
    const ext = path.split('.').pop().toLowerCase();
    const binaryExts = ["jar", "zip", "gz", "tar", "mca", "dat", "nbt", "db", "sqlite"];
    return binaryExts.includes(ext);
  };

  const getLanguage = (path) => {
    if (!path) return "text";
    const ext = path.split('.').pop().toLowerCase();
    if (ext === "json") return "json";
    if (ext === "yml" || ext === "yaml") return "yaml";
    return "text";
  };

  const fileExt = getLanguage(filePath);
  const binary = isBinary(filePath);

  const validateSyntax = useCallback((val, lang) => {
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
      return;
    } 
    
    if (lang === "yaml") {
      try {
        jsyaml.load(val);
        setErrorMsg(null);
      } catch (e) {
        setErrorMsg(`Error de sintaxis YAML: ${e.message}`);
      }
      return;
    } 
    
    setErrorMsg(null);
  }, []);

  const fetchFile = useCallback(async () => {
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
  }, [serverId, filePath, fileExt, validateSyntax, toast]);

  useEffect(() => {
    if (binary) {
      setLoading(false);
      return;
    }
    fetchFile();
  }, [binary, fetchFile]);

  useEffect(() => {
    const timer = setTimeout(() => {
      validateSyntax(content, fileExt);
    }, 500);
    return () => clearTimeout(timer);
  }, [content, fileExt, validateSyntax]);

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

  const extensions = useMemo(() => {
    if (fileExt === "json") return [json()];
    if (fileExt === "yaml") return [yaml()];
    return [];
  }, [fileExt]);

  return {
    content,
    setContent,
    originalContent,
    loading,
    saving,
    showExitWarning,
    setShowExitWarning,
    errorMsg,
    handleSave,
    extensions,
    isBinary: binary
  };
}
