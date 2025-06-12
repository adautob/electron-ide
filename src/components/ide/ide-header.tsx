"use client";

import { IdeLogoIcon } from '@/components/icons/ide-logo-icon';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

interface IdeHeaderProps {
  onOpenPreferences: () => void;
}

export function IdeHeader({ onOpenPreferences }: IdeHeaderProps) {
  return (
    <header className="flex items-center justify-between p-3 border-b border-border h-14 shrink-0 bg-primary text-primary-foreground">
      <div className="flex items-center gap-2">
        <IdeLogoIcon className="h-6 w-6 text-accent" />
        <h1 className="text-lg font-semibold font-headline">Electron IDE</h1>
      </div>
      <Button variant="ghost" size="icon" onClick={onOpenPreferences} className="text-primary-foreground hover:bg-primary/80 hover:text-accent">
        <Settings size={20} />
        <span className="sr-only">Preferences</span>
      </Button>
    </header>
  );
}
