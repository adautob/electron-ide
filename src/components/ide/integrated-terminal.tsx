
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight } from 'lucide-react';

interface IntegratedTerminalProps {
  output: string[];
  onCommandSubmit: (command: string) => void;
  currentPromptGetter?: () => string; // Optional: to get dynamic prompt
}

export function IntegratedTerminal({ output, onCommandSubmit, currentPromptGetter }: IntegratedTerminalProps) {
  const [command, setCommand] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const displayPrompt = currentPromptGetter ? currentPromptGetter() : '$';

  return (
    <div className="h-full flex flex-col bg-card text-sm font-code">
      <ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
        {output.map((line, index) => (
          <div key={index} className="whitespace-pre-wrap break-all">
            {/* Heurística simples para não prefixar a própria linha de comando com prompt */}
            {line.startsWith(displayPrompt) || line.startsWith("$ ") || line.startsWith("C:\\>") ? line : `  ${line}`}
          </div>
        ))}
      </ScrollArea>
      <form onSubmit={handleSubmit} className="flex items-center p-2 border-t border-border shrink-0">
        <span className="text-muted-foreground mr-1 shrink-0">{displayPrompt}</span>
        <Input
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Digite seu comando aqui..."
          className="flex-1 bg-transparent border-0 h-8 p-0 focus-visible:ring-0 text-sm"
          spellCheck="false"
          autoFocus
        />
      </form>
    </div>
  );
}

