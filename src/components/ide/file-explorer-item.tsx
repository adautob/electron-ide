"use client";

import type { FileOrFolder } from '@/types';
import { Folder, FileText, ChevronRight, ChevronDown, FolderOpen } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileExplorerItemProps {
  item: FileOrFolder;
  onSelect: (item: FileOrFolder) => void;
  selectedPath: string | null;
  level?: number;
}

export function FileExplorerItem({ item, onSelect, selectedPath, level = 0 }: FileExplorerItemProps) {
  const [isOpen, setIsOpen] = useState(item.type === 'folder' ? true : false); // Folders open by default

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === 'folder') {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(item);
  };

  const isSelected = selectedPath === item.path;

  return (
    <div>
      <div
        className={cn(
          "flex items-center py-1 px-2 rounded-md hover:bg-sidebar-accent cursor-pointer group",
          isSelected && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
        )}
        style={{ paddingLeft: `${level * 1.25 + 0.5}rem` }}
        onClick={handleSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(e); }}
      >
        {item.type === 'folder' && (
          <Button variant="ghost" size="icon" onClick={handleToggle} className="h-6 w-6 p-0 mr-1 shrink-0 hover:bg-transparent">
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </Button>
        )}
        {item.type === 'folder' ? (
           isOpen ? <FolderOpen size={16} className="mr-2 shrink-0" /> : <Folder size={16} className="mr-2 shrink-0" />
        ) : (
          <FileText size={16} className="mr-2 shrink-0" style={{ marginLeft: item.type === 'file' && level > 0 ? '1.25rem' : '0' }} />
        )}
        <span className="truncate text-sm">{item.name}</span>
      </div>
      {isOpen && item.children && (
        <div>
          {item.children.map((child) => (
            <FileExplorerItem key={child.id} item={child} onSelect={onSelect} selectedPath={selectedPath} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
