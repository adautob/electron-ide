
"use client";

import React, { useState, useEffect, useRef } from 'react';

export function IntegratedTerminal() {
  const [lines, setLines] = useState<string[]>(['Bem-vindo ao terminal simulado!', '> ']);
  const [input, setInput] = useState('');
  const endOfTerminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const command = input.trim();
      const newLines = [...lines.slice(0, -1), `> ${command}`]; // Overwrite the last prompt line with the command
      
      if (command) {
        // Simulate some basic commands
        if (command.toLowerCase() === 'clear') {
          setLines(['> ']);
        } else if (command.toLowerCase() === 'help') {
          newLines.push("Comandos simulados: 'clear', 'help', 'echo [texto]'");
          newLines.push('> ');
          setLines(newLines);
        } else if (command.toLowerCase().startsWith('echo ')) {
          newLines.push(command.substring(5));
          newLines.push('> ');
          setLines(newLines);
        } else {
          newLines.push(`bash: comando não encontrado: ${command}`);
          newLines.push('> ');
          setLines(newLines);
        }
      } else {
        newLines.push('> ');
        setLines(newLines);
      }
      setInput('');
    }
  };
  
  useEffect(() => {
    endOfTerminalRef.current?.scrollIntoView();
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
