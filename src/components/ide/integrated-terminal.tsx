"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/theme-provider';

type OutputLine = {
  id: number;
  type: 'input' | 'output' | 'error';
  content: string;
};

export function IntegratedTerminal() {
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<OutputLine[]>([
    { id: 0, type: 'output', content: 'Terminal Simulado. Digite "help" para ver os comandos disponíveis.' }
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const executeCommand = (command: string) => {
    const [cmd, ...args] = command.trim().split(' ');
    let newOutput: string = '';
    let type: 'output' | 'error' = 'output';

    switch (cmd) {
      case 'help':
        newOutput = 'Comandos disponíveis: help, clear, echo, ls, cd, pwd';
        break;
      case 'clear':
        setOutput([]);
        return; 
      case 'echo':
        newOutput = args.join(' ');
        break;
      case 'ls':
        newOutput = 'package.json  src/  README.md  .gitignore';
        break;
      case 'cd':
        newOutput = `cd: Funcionalidade não implementada neste terminal simulado.`;
        type = 'error';
        break;
      case 'pwd':
        newOutput = '/home/user/project';
        break;
      case '':
        return; // No command, do nothing
      default:
        newOutput = `Comando não encontrado: ${cmd}. Digite "help" para ajuda.`;
        type = 'error';
        break;
    }
    
    setOutput(prev => [...prev, { id: prev.length + 1, type, content: newOutput }]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim().length >= 0) {
      const command = input.trim();
      setOutput(prev => [...prev, { id: prev.length, type: 'input', content: `> ${command}` }]);
      if (command) {
        setHistory(prev => [command, ...prev].slice(0, 50));
      }
      setHistoryIndex(-1);
      executeCommand(command);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = Math.max(historyIndex - 1, -1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex] || '');
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const terminalBg = theme === 'dark' ? 'hsl(var(--primary))' : '#FFFFFF';
  const terminalFg = theme === 'dark' ? '#F8F8F2' : '#000000';
  const inputColor = theme === 'dark' ? '#FFFFFF' : '#000000';
  const promptColor = theme === 'dark' ? '#3498DB' : '#2980B9';

  return (
    <div
      className="h-full w-full p-2 font-code text-sm flex flex-col"
      style={{ backgroundColor: terminalBg, color: terminalFg }}
      onClick={() => inputRef.current?.focus()}
    >
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {output.map(line => (
          <div key={line.id} className="whitespace-pre-wrap break-words">
            {line.type === 'error' && <span className="text-red-400">{line.content}</span>}
            {line.type !== 'error' && <span>{line.content}</span>}
          </div>
        ))}
      </div>
      <div className="flex items-center">
        <span style={{ color: promptColor }}>$&nbsp;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          className="bg-transparent border-none outline-none w-full flex-1"
          style={{ color: inputColor, caretColor: inputColor }}
          autoComplete="off"
          spellCheck="false"
        />
      </div>
    </div>
  );
}
