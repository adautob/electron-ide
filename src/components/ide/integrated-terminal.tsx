"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/contexts/theme-provider';
import type { FileOrFolder } from '@/types';

// This is a simulated terminal component.
// It does not connect to a real shell but mimics one for interacting
// with the virtual file system within the app.
export function IntegratedTerminal() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>(['Bem-vindo ao terminal simulado! Digite "help" para ver os comandos.']);
  const [currentPath, setCurrentPath] = useState('/');
  const terminalBodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();

  // Mock file system - In a real app, this would come from the main state
  const getMockFileSystem = (): FileOrFolder => ({
    id: '/',
    name: 'root',
    type: 'folder',
    path: '/',
    children: [
      { id: 'readme', name: 'README.md', type: 'file', path: '/README.md' },
      { id: 'src', name: 'src', type: 'folder', path: '/src', children: [
        { id: 'app', name: 'app', type: 'folder', path: '/src/app', children: [
           { id: 'page', name: 'page.tsx', type: 'file', path: '/src/app/page.tsx' }
        ]},
        { id: 'components', name: 'components', type: 'folder', path: '/src/components', children: [] },
      ]},
    ],
  });
  
  const [fileSystem] = useState<FileOrFolder>(getMockFileSystem);

  const scrollToBottom = useCallback(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [history, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const findItemByPath = (path: string, fs: FileOrFolder): FileOrFolder | null => {
    const segments = path.split('/').filter(p => p);
    let current: FileOrFolder | null = fs;
    for (const segment of segments) {
      if (current?.type !== 'folder' || !current.children) return null;
      const next = current.children.find(c => c.name === segment);
      if (!next) return null;
      current = next;
    }
    return current;
  };
  
  const resolvePath = (newPath: string): string => {
    if (newPath.startsWith('/')) {
        return newPath;
    }
    const segments = (currentPath + '/' + newPath).split('/').filter(p => p);
    const resolved: string[] = [];
    for (const segment of segments) {
        if (segment === '..') {
            resolved.pop();
        } else if (segment !== '.') {
            resolved.push(segment);
        }
    }
    return '/' + resolved.join('/');
  };

  const handleCommand = (cmd: string) => {
    const [command, ...args] = cmd.trim().split(' ');
    let output = '';

    switch (command.toLowerCase()) {
      case 'help':
        output = 'Comandos disponíveis:\n  help    - Mostra esta ajuda\n  ls      - Lista arquivos e pastas\n  cd [..|path] - Navega entre pastas\n  pwd     - Mostra a pasta atual\n  echo    - Imprime texto\n  clear   - Limpa o terminal';
        break;

      case 'ls':
        const item = findItemByPath(currentPath, fileSystem);
        if (item?.type === 'folder' && item.children) {
          output = item.children.map(c => `${c.type === 'folder' ? 'd' : '-'} ${c.name}`).join('\n');
        } else {
          output = 'ls: Não é uma pasta';
        }
        break;
        
      case 'cd':
        const newPathRaw = args[0] || '/';
        const newResolvedPath = resolvePath(newPathRaw);
        const target = findItemByPath(newResolvedPath, fileSystem);
        if (target && target.type === 'folder') {
            setCurrentPath(newResolvedPath);
        } else {
            output = `cd: pasta não encontrada: ${newPathRaw}`;
        }
        break;

      case 'pwd':
        output = currentPath;
        break;

      case 'echo':
        output = args.join(' ');
        break;

      case 'clear':
        setHistory([]);
        return;

      case '':
        break;

      default:
        output = `bash: comando não encontrado: ${command}`;
    }

    setHistory(prev => [...prev, `$ ${cmd}`, ...output.split('\n')]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      handleCommand(input);
    } else {
       setHistory(prev => [...prev, `$ `]);
    }
    setInput('');
  };

  const terminalTheme = theme === 'dark' ? {
    background: '#2C3E50',
    foreground: '#ECF0F1',
    cursor: '#ECF0F1',
  } : {
    background: '#FFFFFF',
    foreground: '#2C3E50',
    cursor: '#2C3E50',
  };

  return (
    <div
      className="h-full w-full flex flex-col font-code text-sm p-2"
      style={{ backgroundColor: terminalTheme.background, color: terminalTheme.foreground }}
      onClick={() => inputRef.current?.focus()}
    >
      <div ref={terminalBodyRef} className="flex-1 overflow-y-auto pr-2">
        {history.map((line, index) => (
          <div key={index} className="whitespace-pre-wrap break-words">
            {line}
          </div>
        ))}
        <form onSubmit={handleFormSubmit} className="flex">
          <label htmlFor="terminal-input" className="shrink-0">
            <span className="text-green-400">~{currentPath}</span> <span className="text-blue-400">$</span>
          </label>
          <input
            ref={inputRef}
            id="terminal-input"
            type="text"
            value={input}
            onChange={handleInputChange}
            autoComplete="off"
            className="flex-1 bg-transparent border-none outline-none pl-2"
            style={{ color: terminalTheme.foreground, caretColor: terminalTheme.cursor }}
          />
        </form>
      </div>
    </div>
  );
}