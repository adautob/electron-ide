"use client";

import { IdeLogoIcon } from '@/components/icons/ide-logo-icon';
import { Button } from '@/components/ui/button';
import { Settings, FolderOpen } from 'lucide-react';

interface IdeHeaderProps {
  onOpenPreferences: () => void;
  onOpenFolder?: () => void; // Adicionado para abrir pasta
}

export function IdeHeader({ onOpenPreferences, onOpenFolder }: IdeHeaderProps) {
  return (
    <header className="flex items-center justify-between p-3 border-b border-border h-14 shrink-0 bg-primary text-primary-foreground">
      <div className="flex items-center gap-2">
        <IdeLogoIcon className="h-6 w-6 text-accent" />
        <h1 className="text-lg font-semibold font-headline">Electron IDE</h1>
      </div>
      <div className="flex items-center gap-2">
        {onOpenFolder && (
          <Button variant="ghost" size="icon" onClick={onOpenFolder} className="text-primary-foreground hover:bg-primary/80 hover:text-accent" title="Abrir Pasta">
            <FolderOpen size={20} />
            <span className="sr-only">Abrir Pasta</span>
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onOpenPreferences} className="text-primary-foreground hover:bg-primary/80 hover:text-accent" title="Preferências">
          <Settings size={20} />
          <span className="sr-only">Preferências</span>
        </Button>
      </div>
    </header>
  );
}
