"use client";
import { useState, use } from "react";
import { FolderOpen, AlertTriangle, Upload, Loader2 } from "lucide-react";
import { FileBreadcrumbs } from "@/features/servers/components/FileBreadcrumbs";
import { FileList } from "@/features/servers/components/FileList";
import { FileEditor } from "@/features/servers/components/FileEditor";
import { fsOperation } from "@/features/servers/services/serverApi";
import { useToast } from "@/shared/ui/ToastProvider";
import { Button } from "@/shared/ui/Button";
import { useEffect, useRef } from "react";

const CHUNK_SIZE = 1024 * 1024 * 5; // 5MB

export default function FilesPage({ params }) {
  const unwrappedParams = use(params);
  const serverId = unwrappedParams.id;
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState([]);
  const [editingFile, setEditingFile] = useState(null);
  const [deletingFile, setDeletingFile] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreateFile, setShowCreateFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingText, setUploadingText] = useState("");
  const fileInputRef = useRef(null);
  
  const { toast } = useToast();

  useEffect(() => {
    loadFiles();
  }, [currentPath, serverId]);

  const loadFiles = async () => {
    try {
      const data = await fsOperation(serverId, { action: "list", filePath: currentPath || "/" });
      if (Array.isArray(data)) setFiles(data);
      else if (data.files) setFiles(data.files);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNavigate = (pathOrDir) => {
    if (pathOrDir === "") {
      setCurrentPath("");
      return;
    }
    const newPath = currentPath ? `${currentPath}/${pathOrDir}` : pathOrDir;
    setCurrentPath(newPath);
  };

  const handleBreadcrumbNavigate = (absolutePath) => {
    setCurrentPath(absolutePath);
    setEditingFile(null);
  };

  const handleEdit = (file) => {
    const fullPath = currentPath ? `${currentPath}/${file.name}` : file.name;
    setEditingFile(fullPath);
  };

  const confirmDelete = async (fileName) => {
    try {
      setIsDeleting(true);
      const targetPath = currentPath ? `${currentPath}/${fileName}` : fileName;
      await fsOperation(serverId, { action: "delete", filePath: targetPath });
      toast(`Archivo eliminado: ${fileName}`, "success");
      setDeletingFile(null);
      loadFiles();
    } catch (err) {
      toast(`Error al eliminar: ${err.message}`, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateFileSubmit = () => {
    if (!newFileName.trim()) return;
    const fullPath = currentPath ? `${currentPath}/${newFileName.trim()}` : newFileName.trim();
    setEditingFile(fullPath);
    setShowCreateFile(false);
    setNewFileName("");
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading && !editingFile) setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading && !editingFile) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (uploading || editingFile) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload({ target: { files: e.dataTransfer.files } });
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    let successCount = 0;

    try {
      for (let f = 0; f < files.length; f++) {
        const file = files[f];
        setUploadingText(`Subiendo ${f + 1} de ${files.length}...`);
        
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
        
        await fsOperation(serverId, {
          action: "write",
          filePath: filePath,
          content: "",
          isBase64: false
        });

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);
          
          const base64Chunk = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result.split(',')[1]);
            reader.readAsDataURL(chunk);
          });

          await fsOperation(serverId, {
            action: "append",
            filePath: filePath,
            content: base64Chunk,
            isBase64: true
          });
        }
        successCount++;
      }

      if (successCount > 0) {
        toast(`${successCount} archivo(s) subido(s) correctamente.`, "success");
        loadFiles();
      }
    } catch (err) {
      console.error("Error subiendo archivos:", err);
      toast(`Fallo al subir: ${err.message}`, "error");
    } finally {
      setUploading(false);
      setUploadingText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div 
      className="p-8 max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in h-full relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
    >
      {isDragging && (
        <div 
          className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm border-4 border-dashed border-primary rounded-blocky flex flex-col items-center justify-center animate-in fade-in"
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <Upload className="w-16 h-16 text-primary mb-4 animate-bounce" />
          <h2 className="text-3xl font-black text-primary mb-2">Suelta tus archivos aquí</h2>
          <p className="text-foreground/70 font-bold text-lg">Se subirán a <span className="text-foreground font-mono bg-surface-border px-2 py-1 rounded">{currentPath || "/"}</span></p>
        </div>
      )}
      <div className="flex items-center justify-between bg-surface p-6 rounded-blocky border-2 border-surface-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-blocky">
            <FolderOpen className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black">Explorador de Archivos</h1>
            <p className="text-foreground/70 font-semibold">{serverId}</p>
          </div>
        </div>
        {!editingFile && (
          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {uploading ? uploadingText || "Subiendo..." : "Subir Archivo"}
            </Button>
            <Button onClick={() => setShowCreateFile(true)} disabled={uploading}>
              Nuevo Archivo
            </Button>
          </div>
        )}
      </div>

      {!editingFile && (
        <div className="bg-warning/10 border-2 border-warning/20 p-4 rounded-blocky flex items-start gap-4 animate-in slide-in-from-top-2">
          <AlertTriangle className="w-6 h-6 text-warning shrink-0 mt-0.5" />
          <div>
            <h2 className="text-warning font-bold text-lg mb-1">Precaución al modificar archivos</h2>
            <p className="text-foreground/80 font-semibold text-sm leading-relaxed max-w-4xl">
              Estás accediendo a la estructura raíz del servidor. Modificar, renombrar o eliminar archivos críticos de forma incorrecta puede <strong>corromper los mundos</strong>, desconfigurar plugins, o impedir que el servidor inicie. Si no estás seguro de lo que hace un archivo, es mejor no tocarlo.
            </p>
          </div>
        </div>
      )}

      {showCreateFile && (
        <div className="bg-surface p-4 border-2 border-surface-border rounded-blocky shadow-sm animate-in fade-in flex gap-2">
          <input 
            type="text"
            placeholder="ej. config.yml"
            className="flex-1 bg-background border-2 border-surface-border rounded-blocky px-4 py-2 font-bold focus:outline-none focus:border-primary transition-colors"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFileSubmit()}
            autoFocus
          />
          <Button onClick={handleCreateFileSubmit} disabled={!newFileName.trim()}>Crear</Button>
          <Button variant="outline" onClick={() => { setShowCreateFile(false); setNewFileName(""); }}>Cancelar</Button>
        </div>
      )}

      <FileBreadcrumbs path={currentPath} onNavigate={handleBreadcrumbNavigate} />
      
      {editingFile ? (
        <FileEditor 
          serverId={serverId} 
          filePath={editingFile} 
          onBack={() => {
            setEditingFile(null);
            loadFiles();
          }} 
        />
      ) : (
        <FileList 
          files={files} 
          onNavigate={handleNavigate}
          onEdit={handleEdit}
          onDeleteRequest={(fileName) => setDeletingFile(fileName)}
          deletingFile={deletingFile}
          onConfirmDelete={confirmDelete}
          onCancelDelete={() => setDeletingFile(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
