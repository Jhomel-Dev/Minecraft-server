"use client";
import { useState, use } from "react";
import { FolderOpen } from "lucide-react";
import { FileBreadcrumbs } from "@/features/servers/components/FileBreadcrumbs";
import { FileList } from "@/features/servers/components/FileList";
import { fsOperation } from "@/features/servers/services/serverApi";
import { useEffect } from "react";

export default function FilesPage({ params }) {
  const unwrappedParams = use(params);
  const serverId = unwrappedParams.id;
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState([]);

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
  };

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in h-full">
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
      </div>

      <FileBreadcrumbs path={currentPath} onNavigate={handleBreadcrumbNavigate} />
      
      <FileList 
        files={files} 
        onNavigate={handleNavigate}
        onEdit={(f) => console.log(f)}
        onDelete={(f) => console.log(f)}
      />
    </div>
  );
}
