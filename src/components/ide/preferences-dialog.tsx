"use client";

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

interface PreferencesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function PreferencesDialog({ isOpen, onOpenChange }: PreferencesDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle className="font-headline">Preferences</DialogTitle>
          <DialogDescription>
            Customize your IDE settings. Changes are for demonstration and not saved.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="editor-font-size" className="text-right col-span-1">
              Font Size
            </Label>
            <Input id="editor-font-size" defaultValue="14" type="number" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="editor-theme" className="text-right col-span-1">
              Theme
            </Label>
            <Select defaultValue="dark-theme" disabled>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark-theme">Dark Theme (Default)</SelectItem>
                <SelectItem value="light-theme" disabled>Light Theme (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="autosave" className="text-right col-span-1">
              Auto Save
            </Label>
            <Switch id="autosave" defaultChecked className="col-span-3 justify-self-start" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="terminal-font" className="text-right col-span-1">
              Terminal Font
            </Label>
             <Select defaultValue="source-code-pro" disabled>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="source-code-pro">Source Code Pro</SelectItem>
                <SelectItem value="monospace" disabled>Monospace</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>Save Changes</Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
