"use client";

import type { FileOrFolder } from '@/types';
import { FileExplorerItem } from './file-explorer-item';
import { Button } from '@/components/ui/button';
import { FilePlus, FolderPlus, Edit3, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FileExplorerProps {
  files: FileOrFolder[];
  onSelectFile: (file: FileOrFolder) => void;
  selectedFilePath: string | null;
  onCreateFile: (parentPath: string | null) => void;
  onCreateFolder: (parentPath: string | null) => void;
  onRenameItem: (itemPath: string) => void;
  onDeleteItem: (itemPath: string) => void;
}

export function FileExplorer({
  files,
  onSelectFile,
  selectedFilePath,
  onCreateFile,
  onCreateFolder,
  onRenameItem,
  onDeleteItem
}: FileExplorerProps) {
  
  const handleCreateFile = () => {
    // For simplicity, create at root or based on selected folder if any
    const parentPath = selectedFilePath && files.find(f => f.path === selectedFilePath)?.type === 'folder' ? selectedFilePath : null;
    onCreateFile(parentPath);
  };

  const handleCreateFolder = () => {
    const parentPath = selectedFilePath && files.find(f => f.path === selectedFilePath)?.type === 'folder' ? selectedFilePath : null;
    onCreateFolder(parentPath);
  };

  return (
    <div className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border shrink-0">
      <div className="p-2 border-b border-sidebar-border">
        <h2 className="text-sm font-semibold px-2 py-1 font-headline">Explorer</h2>
        <div className="flex space-x-1 mt-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" title="New File" onClick={handleCreateFile}>
            <FilePlus size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="New Folder" onClick={handleCreateFolder}>
            <FolderPlus size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Rename" onClick={() => selectedFilePath && onRenameItem(selectedFilePath)} disabled={!selectedFilePath}>
            <Edit3 size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive" title="Delete" onClick={() => selectedFilePath && onDeleteItem(selectedFilePath)} disabled={!selectedFilePath}>
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 p-1">
        {files.map((item) => (
          <FileExplorerItem key={item.id} item={item} onSelect={onSelectFile} selectedPath={selectedFilePath} />
        ))}
      </ScrollArea>
    </div>
  );
}
