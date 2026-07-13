"use client";
import { ArrowLeft, Save, FileText, Loader2, ShieldAlert, AlertTriangle } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import CodeMirror from '@uiw/react-codemirror';
import { useFileEditor } from "../hooks/useFileEditor";

export function FileEditor({ serverId, filePath, onBack }) {
  const {
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
    isBinary
  } = useFileEditor(serverId, filePath);

  if (isBinary) {
    return <BinaryWarning onBack={onBack} />;
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="flex flex-col h-[70vh] sm:h-full bg-surface border-2 border-surface-border rounded-blocky shadow-sm overflow-hidden animate-in fade-in max-w-full w-full">
      <EditorHeader 
        filePath={filePath} 
        content={content} 
        originalContent={originalContent} 
        saving={saving} 
        errorMsg={errorMsg} 
        onSave={handleSave} 
        onBack={() => {
          if (content !== originalContent) {
            setShowExitWarning(true);
          } else {
            onBack();
          }
        }} 
      />

      <ExitWarning 
        show={showExitWarning} 
        filePath={filePath} 
        onCancel={() => setShowExitWarning(false)} 
        onConfirm={onBack} 
      />

      <ErrorBanner errorMsg={errorMsg} />

      <div className="flex-1 bg-background relative min-h-[300px] sm:min-h-[500px] w-full overflow-x-hidden">
        <CodeMirror
          value={content}
          height="100%"
          theme="dark"
          extensions={extensions}
          onChange={(val) => setContent(val)}
          className="h-full absolute inset-0 text-xs sm:text-sm overflow-hidden cm-editor-wrapper"
        />
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .cm-editor-wrapper .cm-editor { height: 100%; outline: none !important; width: 100%; }
        .cm-editor-wrapper .cm-scroller { font-family: inherit; overflow-x: auto; }
        .cm-editor-wrapper .cm-gutters { background-color: transparent; border-right: 1px solid var(--surface-border, #333); color: #666; }
      `}} />
    </div>
  );
}

function EditorHeader({ filePath, content, originalContent, saving, errorMsg, onSave, onBack }) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 sm:p-4 border-b-2 border-surface-border bg-background/50 gap-3 sm:gap-4 w-full">
      <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto overflow-hidden">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onBack} 
          className="px-2 sm:px-3 shrink-0"
        >
          <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Volver</span>
        </Button>
        <div className="h-6 w-px bg-surface-border mx-1 sm:mx-2 hidden sm:block shrink-0"></div>
        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
        <span className="font-mono text-xs sm:text-sm font-bold truncate">
          {filePath} {content !== originalContent && <span className="text-warning ml-1">*</span>}
        </span>
      </div>
      
      <Button 
        onClick={onSave} 
        disabled={saving || errorMsg !== null || content === originalContent} 
        className="font-bold w-full md:w-auto shrink-0"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Guardar
      </Button>
    </div>
  );
}

function ExitWarning({ show, filePath, onCancel, onConfirm }) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in">
      <div className="bg-surface border-2 border-surface-border p-4 sm:p-6 rounded-blocky shadow-lg max-w-sm w-full text-center">
        <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-warning mx-auto mb-4" />
        <h3 className="text-lg sm:text-xl font-bold mb-2">¿Salir sin guardar?</h3>
        <p className="text-foreground/70 text-xs sm:text-sm font-semibold mb-6">
          Tienes cambios pendientes en <span className="font-mono text-foreground truncate block max-w-full">{filePath}</span> que se perderán.
        </p>
        <div className="flex flex-col gap-2 sm:gap-3">
          <Button onClick={onCancel} className="w-full font-bold">
            Seguir Editando
          </Button>
          <Button variant="outline" onClick={onConfirm} className="w-full border-danger/20 text-danger hover:bg-danger/10 font-bold">
            Salir y Perder Cambios
          </Button>
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ errorMsg }) {
  if (!errorMsg) return null;

  return (
    <div className="bg-danger/10 border-b-2 border-danger p-2 sm:p-3 flex items-start gap-2 sm:gap-3 animate-in slide-in-from-top-1 w-full overflow-hidden">
      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-danger shrink-0 mt-0.5" />
      <div className="flex-1 overflow-hidden min-w-0">
        <p className="text-danger font-bold text-xs sm:text-sm truncate">Error de Sintaxis Detectado</p>
        <p className="text-danger/80 text-[10px] sm:text-xs font-mono truncate">{errorMsg}</p>
      </div>
    </div>
  );
}

function BinaryWarning({ onBack }) {
  return (
    <div className="flex flex-col h-[70vh] sm:h-full bg-surface border-2 border-surface-border rounded-blocky shadow-sm overflow-hidden animate-in fade-in w-full">
      <div className="flex items-center justify-between p-3 sm:p-4 border-b-2 border-surface-border bg-background/50">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver
        </Button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center w-full">
        <ShieldAlert className="w-16 h-16 sm:w-20 sm:h-20 text-danger mb-4 opacity-80" />
        <h2 className="text-2xl sm:text-3xl font-black mb-2">Acceso Denegado</h2>
        <p className="text-foreground/70 text-sm sm:text-base font-semibold max-w-md mx-auto">
          Los archivos binarios (.jar, .dat, .mca) y los ejecutables no pueden ser modificados manualmente por seguridad.
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 h-48 sm:h-64 bg-surface border-2 border-surface-border rounded-blocky shadow-sm w-full">
      <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-primary mb-4" />
      <p className="text-foreground/70 font-bold text-sm sm:text-base">Leyendo archivo...</p>
    </div>
  );
}
