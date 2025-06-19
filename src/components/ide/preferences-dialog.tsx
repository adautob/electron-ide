"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from '@/contexts/theme-provider';

interface PreferencesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function PreferencesDialog({ isOpen, onOpenChange }: PreferencesDialogProps) {
  const { theme, setTheme } = useTheme();
  
  // Local state for non-theme preferences (demonstration only)
  const [fontSize, setFontSize] = useState("14");
  const [autoSave, setAutoSave] = useState(true);
  const [terminalFont, setTerminalFont] = useState("source-code-pro");

  // Sync local state if theme changes externally (e.g. from localStorage on initial load)
  // This is mostly for the Theme select to show the correct initial value.
  // The actual theme application is handled by ThemeProvider.

  const handleThemeChange = (value: string) => {
    if (value === 'light' || value === 'dark') {
      setTheme(value);
    }
  };

  const handleSaveChanges = () => {
    // For now, "Save Changes" just closes the dialog.
    // Theme changes are applied instantly.
    // Other preferences are just in local state.
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle className="font-headline">Preferences</DialogTitle>
          <DialogDescription>
            Customize your IDE settings. Theme changes are applied instantly. Other changes are for demonstration.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="editor-theme" className="text-right col-span-1">
              Theme
            </Label>
            <Select value={theme} onValueChange={handleThemeChange}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark Theme</SelectItem>
                <SelectItem value="light">Light Theme</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="editor-font-size" className="text-right col-span-1">
              Font Size
            </Label>
            <Input 
              id="editor-font-size" 
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              type="number" 
              className="col-span-3" 
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="autosave" className="text-right col-span-1">
              Auto Save
            </Label>
            <Switch 
              id="autosave" 
              checked={autoSave}
              onCheckedChange={setAutoSave}
              className="col-span-3 justify-self-start" 
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="terminal-font" className="text-right col-span-1">
              Terminal Font
            </Label>
             <Select value={terminalFont} onValueChange={setTerminalFont} disabled>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="source-code-pro">Source Code Pro</SelectItem>
                <SelectItem value="monospace" disabled>Monospace (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSaveChanges}>Save Changes</Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
