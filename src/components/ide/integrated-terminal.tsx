
"use client";

import type { FileOrFolder } from '@/types';
import React, { useState, useEffect, useRef } from 'react';

interface IntegratedTerminalProps {
  files?: FileOrFolder[];
  openedDirectoryName?: string | null;
}

export function IntegratedTerminal({ files = [], openedDirectoryName }: IntegratedTerminalProps) {
  const [lines, setLines] = useState<string[]>(['Bem-vindo ao terminal simulado!', 'Digite `help` para ver os comandos disponíveis.', '> ']);
  const [input, setInput] = useState('');
  const endOfTerminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const command = input.trim();
      const newLines = [...lines.slice(0, -1), `> ${command}`];

      if (command) {
        const [cmd, ...args] = command.toLowerCase().split(' ');
        
        switch (cmd) {
          case 'clear':
            setLines(['> ']);
            setInput('');
            return;
          case 'help':
            newLines.push("Comandos simulados: 'clear', 'help', 'echo [texto]', 'ls', 'pwd', 'whoami', 'date'");
            break;
          case 'echo':
            newLines.push(input.substring(5));
            break;
          case 'ls':
            if (files.length > 0) {
                const fileList = files.map(item => `${item.name}${item.type === 'folder' ? '/' : ''}`);
                newLines.push(...fileList);
            } else {
                newLines.push('Nenhuma pasta aberta para listar arquivos.');
            }
            break;
          case 'pwd':
            newLines.push(openedDirectoryName ? `/${openedDirectoryName}` : '/');
            break;
          case 'whoami':
            newLines.push('developer');
            break;
          case 'date':
            newLines.push(new Date().toString());
            break;
          default:
            newLines.push(`bash: comando não encontrado: ${command}`);
            break;
        }
      }
      
      newLines.push('> ');
      setLines(newLines);
      setInput('');
    }
  };
  
  useEffect(() => {
    endOfTerminalRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div 
      className="h-full w-full bg-black text-white font-code text-sm p-2 overflow-y-auto focus:outline-none"
      onClick={() => inputRef.current?.focus()}
      tabIndex={0}
    >
      {lines.slice(0, -1).map((line, index) => (
        <div key={index} className="whitespace-pre-wrap">{line}</div>
      ))}
      <div className="flex">
        <span className="whitespace-pre-wrap">{lines[lines.length - 1]}</span>
        <input
          ref={inputRef}
          id="terminal-input"
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          className="bg-transparent border-none outline-none text-white font-code flex-1 p-0 m-0 w-full"
          autoComplete="off"
          spellCheck="false"
        />
      </div>
      <div ref={endOfTerminalRef} />
    </div>
  );
}
