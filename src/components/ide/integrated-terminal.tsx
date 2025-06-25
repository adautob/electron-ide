"use client";

import React, { useState, useRef, useEffect, type KeyboardEvent } from 'react';

// A very basic simulated terminal for demonstration purposes
export function IntegratedTerminal() {
  const [history, setHistory] = useState<string[]>(['Bem-vindo ao terminal simulado! Digite "help" para ver os comandos disponíveis.']);
  const [input, setInput] = useState('');
  const endOfHistoryRef = useRef<HTMLDivElement>(null);

  const executeCommand = (command: string) => {
    let output = '';
    const [cmd, ...args] = command.trim().split(' ');
    switch (cmd) {
      case 'help':
        output = 'Comandos disponíveis: help, clear, echo, date';
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
      case '':
        break;
      default:
        output = `Comando não encontrado: ${cmd}`;
        break;
    }
    setHistory(prev => [...prev, `$ ${command}`, output].filter(Boolean));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(input);
      setInput('');
    }
  };

  useEffect(() => {
    endOfHistoryRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  return (
    <div className="h-full w-full bg-primary text-primary-foreground font-code p-2 flex flex-col">
      <div className="flex-1 overflow-y-auto text-sm">
        {history.map((line, index) => (
          <div key={index}>{line}</div>
        ))}
        <div ref={endOfHistoryRef} />
      </div>
      <div className="flex items-center">
        <span className="text-accent mr-2">$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-transparent border-none outline-none w-full text-primary-foreground"
          autoFocus
        />
      </div>
    </div>
  );
}
