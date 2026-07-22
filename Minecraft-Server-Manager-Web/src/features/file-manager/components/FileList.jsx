"use client";
import { useTranslations } from "next-intl";
import { File, Folder, Edit, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/Button";

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function isEditable(filename) {
  const editableExtensions = [
    ".txt", ".json", ".yml", ".yaml", ".properties", 
    ".xml", ".csv", ".log", ".toml", ".ini", ".conf", ".md"
  ];
  const lower = filename.toLowerCase();
  return editableExtensions.some(ext => lower.endsWith(ext));
}

export function FileList({ files, onNavigate, onEdit, onDeleteRequest, deletingFile, onConfirmDelete, onCancelDelete, isDeleting }) {
  const t = useTranslations("FileList");

  if (files.length === 0) {
    return (
      <div className="text-center p-8 bg-surface border-2 border-surface-border rounded-blocky shadow-sm">
        <p className="text-foreground/60 font-semibold">{t('emptyFolder')}</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border-2 border-surface-border rounded-blocky overflow-hidden shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-border/30 text-foreground">
            <th className="p-4 font-bold border-b-2 border-surface-border w-12"></th>
            <th className="p-4 font-bold border-b-2 border-surface-border">{t('nameHeader')}</th>
            <th className="p-4 font-bold border-b-2 border-surface-border">{t('sizeHeader')}</th>
            <th className="p-4 font-bold border-b-2 border-surface-border text-right">{t('actionsHeader')}</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => {
            const isThisDeleting = deletingFile === file.name;
            
            if (isThisDeleting) {
              return (
                <tr key={file.name} className="bg-danger/10 border-b-2 border-danger animate-in fade-in">
                  <td colSpan={4} className="p-4">
                    <div className="flex items-center justify-between text-danger">
                      <div>
                        <p className="font-bold text-lg">{t('deleteConfirmTitle', { name: file.name })}</p>
                        <p className="text-sm font-semibold opacity-80">{t('cannotBeUndone')}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="border-danger/20 hover:bg-danger/10 bg-transparent text-danger" onClick={onCancelDelete} disabled={isDeleting}>
                          {t('cancel')}
                        </Button>
                        <Button className="bg-danger hover:bg-danger/80 text-white" onClick={() => onConfirmDelete(file.name)} disabled={isDeleting}>
                          {isDeleting ? t('deleting') : t('confirmDelete')}
                        </Button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            }

            return (
              <tr data-cy={`file-row-${file.name}`} key={file.name} className="hover:bg-surface-hover/50 transition-colors">
                <td className="p-4 border-b border-surface-border/50 text-center">
                  {file.isDir ? (
                    <Folder className="w-5 h-5 text-secondary inline-block fill-secondary" />
                  ) : (
                    <File className="w-5 h-5 text-foreground/50 inline-block" />
                  )}
                </td>
                <td className="p-4 border-b border-surface-border/50">
                  {file.isDir ? (
                    <button 
                      onClick={() => onNavigate(file.name)}
                      className="font-bold text-primary hover:underline"
                    >
                      {file.name}
                    </button>
                  ) : (
                    <span className="font-mono text-sm text-foreground/80">{file.name}</span>
                  )}
                </td>
                <td className="p-4 border-b border-surface-border/50 text-foreground/60 font-mono text-sm">
                  {file.isDir ? "--" : formatBytes(file.size)}
                </td>
                <td className="p-4 border-b border-surface-border/50 flex justify-end gap-2">
                  {!file.isDir && isEditable(file.name) && (
                    <Button data-cy={`file-edit-btn-${file.name}`} variant="outline" className="p-2 h-10" title={t('edit')} onClick={() => onEdit(file)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="outline" className="p-2 h-10 hover:bg-danger/10" title={t('delete')} onClick={() => onDeleteRequest(file.name)}>
                    <Trash2 className="w-4 h-4 text-danger" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
