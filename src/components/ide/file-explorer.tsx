
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
  allFiles: FileOrFolder[]; // To find selected item details
}

// Helper function to find an item by path in a nested structure
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

// Helper function to get the parent path of a file/folder path
const getParentPath = (itemPath: string): string | null => {
  if (!itemPath.includes('/')) {
    return null; // Item is at root
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
  allFiles // Use this prop
}: FileExplorerProps) {
  
  const determineTargetDirectoryPath = (): string | null => {
    if (selectedFilePath) {
      const selectedItem = findItemByPath(allFiles, selectedFilePath);
      if (selectedItem) {
        if (selectedItem.type === 'folder') {
          return selectedItem.path;
        } else { // It's a file
          return getParentPath(selectedItem.path);
        }
      }
    }
    // If no selection or selected item not found, and a folder is open, target the root.
    // openedDirectoryName implies root is available. If it's null, it means root of the opened folder.
    return openedDirectoryName ? null : null; // null indicates root of the currently opened folder
  };

  const handleCreateFileClick = () => {
    const targetPath = determineTargetDirectoryPath();
    onCreateFile(targetPath);
  };

  const handleCreateFolderClick = () => {
    const targetPath = determineTargetDirectoryPath();
    onCreateFolder(targetPath);
  };
  
  const canPerformFileActions = !!openedDirectoryName;

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
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Novo Arquivo" onClick={handleCreateFileClick} disabled={!canPerformFileActions}>
              <FilePlus size={16} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Nova Pasta" onClick={handleCreateFolderClick} disabled={!canPerformFileActions}>
              <FolderPlus size={16} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Renomear (Demo)" onClick={() => selectedFilePath && onRenameItem(selectedFilePath)} disabled={!selectedFilePath || !canPerformFileActions}>
              <Edit3 size={16} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive" title="Deletar (Demo)" onClick={() => selectedFilePath && onDeleteItem(selectedFilePath)} disabled={!selectedFilePath || !canPerformFileActions}>
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
