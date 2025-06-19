
"use client";

import type { FileOrFolder } from '@/types';
import { FileExplorerItem } from './file-explorer-item';
import { Button } from '@/components/ui/button';
import { FilePlus, FolderPlus, Edit3, Trash2, FolderSymlink } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FileExplorerProps {
  files: FileOrFolder[];
  onSelectFile: (file: FileOrFolder) => void;
  selectedFilePath: string | null;
  onCreateFile: (targetDirectoryPath: string | null) => void;
  onCreateFolder: (targetDirectoryPath: string | null) => void;
  onRenameItem: (itemPath: string) => void;
  onDeleteItem: (itemPath: string) => void;
  openedDirectoryName?: string | null;
  allFiles: FileOrFolder[];
}

const findItemByPath = (items: FileOrFolder[], path: string): FileOrFolder | null => {
  for (const item of items) {
    if (item.path === path) {
      return item;
    }
    if (item.children) {
      const found = findItemByPath(item.children, path);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

const getParentPath = (itemPath: string): string | null => {
  if (!itemPath.includes('/')) {
    return null;
  }
  return itemPath.substring(0, itemPath.lastIndexOf('/'));
};


export function FileExplorer({
  files,
  onSelectFile,
  selectedFilePath,
  onCreateFile,
  onCreateFolder,
  onRenameItem,
  onDeleteItem,
  openedDirectoryName,
  allFiles
}: FileExplorerProps) {

  const determineTargetDirectoryPath = (): string | null => {
    if (selectedFilePath) {
      const selectedItem = findItemByPath(allFiles, selectedFilePath);
      if (selectedItem) {
        if (selectedItem.type === 'folder') {
          return selectedItem.path;
        } else {
          return getParentPath(selectedItem.path);
        }
      }
    }
    return openedDirectoryName ? null : null;
  };

  const handleCreateFileClick = () => {
    const targetPath = determineTargetDirectoryPath();
    onCreateFile(targetPath);
  };

  const handleCreateFolderClick = () => {
    const targetPath = determineTargetDirectoryPath();
    onCreateFolder(targetPath);
  };

  const handleRenameClick = () => {
    if (selectedFilePath) {
      onRenameItem(selectedFilePath);
    }
  };

  const handleDeleteClick = () => {
    if (selectedFilePath) {
      onDeleteItem(selectedFilePath);
    }
  };

  const canPerformFileActions = !!openedDirectoryName;
  const explorerTitle = openedDirectoryName ? (openedDirectoryName.split('/').pop()?.toUpperCase() || "EXPLORER") : "EXPLORER";

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-sidebar-border">
        <div className="flex items-center justify-between px-2 py-1">
          <h2 className="text-sm font-semibold font-headline">
            {explorerTitle}
          </h2>
        </div>
        { openedDirectoryName && (
          <div className="flex space-x-1 mt-1 px-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Novo Arquivo" onClick={handleCreateFileClick} disabled={!canPerformFileActions}>
              <FilePlus size={16} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Nova Pasta" onClick={handleCreateFolderClick} disabled={!canPerformFileActions}>
              <FolderPlus size={16} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Renomear" onClick={handleRenameClick} disabled={!selectedFilePath || !canPerformFileActions || selectedFilePath === openedDirectoryName}>
              <Edit3 size={16} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive" title="Deletar" onClick={handleDeleteClick} disabled={!selectedFilePath || !canPerformFileActions || selectedFilePath === openedDirectoryName}>
              <Trash2 size={16} />
            </Button>
          </div>
        )}
      </div>
      <ScrollArea className="flex-1 p-1">
        {files.length > 0 ? (
          files.map((item) => (
            <FileExplorerItem key={item.id} item={item} onSelect={onSelectFile} selectedPath={selectedFilePath} />
          ))
        ) : (
          <div className="p-4 text-center text-xs text-sidebar-foreground/70">
            <FolderSymlink size={32} className="mx-auto mb-2" />
            Nenhuma pasta aberta.
            <br />
            Use o ícone de pasta no cabeçalho.
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
