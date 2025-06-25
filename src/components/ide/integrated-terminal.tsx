
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

export function IntegratedTerminal() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>(['Bem-vindo ao terminal simulado.']);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const newHistory = [...history, `> ${input}`];
      if (input.trim().toLowerCase() === 'clear') {
        setHistory([]);
      } else if (input.trim().toLowerCase() === 'help') {
        newHistory.push("Comandos disponíveis: 'clear', 'help', 'echo [texto]'");
        setHistory(newHistory);
      } else if (input.startsWith('echo ')) {
         newHistory.push(input.substring(5));
         setHistory(newHistory);
      } else if (input.trim() !== '') {
        newHistory.push(`Comando não reconhecido: ${input}`);
        setHistory(newHistory);
      } else {
        setHistory(newHistory);
      }
      setInput('');
    }
  };
  
  const handleClick = () => {
      inputRef.current?.focus();
  }

  return (
    <div 
        className="h-full w-full bg-primary p-2 font-code text-sm text-foreground overflow-y-auto"
        onClick={handleClick}
        ref={scrollRef}
    >
      {history.map((line, index) => (
        <div key={index}>{line}</div>
      ))}
      <div className="flex items-center">
        <ChevronRight size={16} className="mr-1" />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-transparent border-none outline-none w-full text-foreground font-code"
          autoFocus
        />
      </div>
    </div>
  );
}
