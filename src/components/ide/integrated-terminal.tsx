"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight } from 'lucide-react';

interface IntegratedTerminalProps {
  output: string[];
  onCommandSubmit: (command: string) => void;
}

export function IntegratedTerminal({ output, onCommandSubmit }: IntegratedTerminalProps) {
  const [command, setCommand] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim()) {
      onCommandSubmit(command.trim());
      setCommand('');
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [output]);

  return (
    <div className="h-full flex flex-col bg-card text-sm font-code">
      <ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
        {output.map((line, index) => (
          <div key={index} className="whitespace-pre-wrap break-all">
            {line.startsWith("C:\\>") || line.startsWith("$") ? line : `  ${line}`}
          </div>
        ))}
      </ScrollArea>
      <form onSubmit={handleSubmit} className="flex items-center p-2 border-t border-border shrink-0">
        <ChevronRight size={16} className="text-muted-foreground mr-2" />
        <Input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Type your command here..."
          className="flex-1 bg-transparent border-0 h-8 p-0 focus-visible:ring-0 text-sm"
          spellCheck="false"
        />
      </form>
    </div>
  );
}
