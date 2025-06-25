"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

export function IntegratedTerminal() {
  const [history, setHistory] = useState<string[]>(['Bem-vindo ao terminal simulado! Digite "help" para ver os comandos.']);
  const [input, setInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCommand = (command: string) => {
    let output = '';
    const [cmd, ...args] = command.split(' ');

    switch (cmd.toLowerCase()) {
      case 'help':
        output = 'Comandos disponíveis: help, clear, echo, date, pwd';
        break;
      case 'clear':
        setHistory([]);
        return;
      case 'echo':
        output = args.join(' ');
        break;
      case 'date':
        output = new Date().toLocaleString();
        break;
      case 'pwd':
        output = '/home/project';
        break;
      case 'ls':
        output = 'package.json  src/  README.md';
        break;
      case 'cd':
        output = `Funcionalidade 'cd' não implementada neste terminal simulado.`;
        break;
      default:
        output = `Comando não encontrado: ${command}. Digite "help" para ver a lista de comandos.`;
    }
    setHistory(prev => [...prev, `$ ${command}`, output]);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim() !== '') {
      handleCommand(input.trim());
      setInput('');
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }
  }, [history]);
  
  const focusInput = () => {
    inputRef.current?.focus();
  }

  return (
    <div className="h-full w-full bg-primary text-primary-foreground font-code flex flex-col p-2" onClick={focusInput}>
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-2">
          {history.map((line, index) => (
            <div key={index} className={`whitespace-pre-wrap ${line.startsWith('$') ? 'text-accent' : ''}`}>{line}</div>
          ))}
        </div>
      </ScrollArea>
      <div className="flex items-center mt-2">
        <span className="text-accent mr-2">$</span>
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base h-6 p-0"
          autoComplete="off"
        />
      </div>
    </div>
  );
}
