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
  onCreateFile: (parentPath: string | null) => void;
  onCreateFolder: (parentPath: string | null) => void;
  onRenameItem: (itemPath: string) => void;
  onDeleteItem: (itemPath: string) => void;
  openedDirectoryName?: string | null; // Para exibir o nome da pasta raiz
}

export function FileExplorer({
  files,
  onSelectFile,
  selectedFilePath,
  onCreateFile,
  onCreateFolder,
  onRenameItem,
  onDeleteItem,
  openedDirectoryName
}: FileExplorerProps) {
  
  const handleCreateFile = () => {
    const parentPath = selectedFilePath && files.find(f => f.path === selectedFilePath)?.type === 'folder' ? selectedFilePath : (openedDirectoryName ? '' : null);
    onCreateFile(parentPath);
  };

  const handleCreateFolder = () => {
    const parentPath = selectedFilePath && files.find(f => f.path === selectedFilePath)?.type === 'folder' ? selectedFilePath : (openedDirectoryName ? '' : null);
    onCreateFolder(parentPath);
  };

  return (
    <div className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border shrink-0">
      <div className="p-2 border-b border-sidebar-border">
        <div className="flex items-center justify-between px-2 py-1">
          <h2 className="text-sm font-semibold font-headline">
            {openedDirectoryName ? openedDirectoryName.toUpperCase() : "EXPLORER"}
          </h2>
        </div>
        { openedDirectoryName && (
          <div className="flex space-x-1 mt-1 px-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Novo Arquivo (Demo)" onClick={handleCreateFile}>
              <FilePlus size={16} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Nova Pasta (Demo)" onClick={handleCreateFolder}>
              <FolderPlus size={16} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Renomear (Demo)" onClick={() => selectedFilePath && onRenameItem(selectedFilePath)} disabled={!selectedFilePath}>
              <Edit3 size={16} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive" title="Deletar (Demo)" onClick={() => selectedFilePath && onDeleteItem(selectedFilePath)} disabled={!selectedFilePath}>
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
