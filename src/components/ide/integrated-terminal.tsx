"use client";

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import type { FileOrFolder } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

interface SimulatedTerminalProps {
  files: FileOrFolder[];
  openedDirectoryName: string | null;
}

const findItemByPath = (items: FileOrFolder[], pathSegments: string[]): FileOrFolder | null => {
  if (pathSegments.length === 0) {
    // This represents the root of the opened directory
    const rootNode: FileOrFolder = { id: 'root', name: 'root', type: 'folder', path: '', children: items, handle: undefined };
    return rootNode;
  }
  let currentLevel: FileOrFolder[] | undefined = items;
  let found: FileOrFolder | null = null;
  for (const segment of pathSegments) {
    if (!currentLevel) return null;
    const nextItem = currentLevel.find(item => item.name === segment);
    if (nextItem) {
      found = nextItem;
      currentLevel = nextItem.children;
    } else {
      return null;
    }
  }
  return found;
};


export function IntegratedTerminal({ files, openedDirectoryName }: SimulatedTerminalProps) {
  const [history, setHistory] = useState<string[]>(['Bem-vindo ao terminal simulado. Digite "help" para ver os comandos.']);
  const [input, setInput] = useState('');
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const basePath = openedDirectoryName ? `~/${openedDirectoryName.split('/').pop()}` : '~';

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);
  
  useEffect(() => {
    // Reset path when directory changes
    setCurrentPath([]);
  }, [openedDirectoryName]);

  const handleCommand = (command: string) => {
    const displayPath = [basePath, ...currentPath].join('/');
    const newHistory = [...history, `${displayPath}$ ${command}`];
    const [cmd, ...args] = command.trim().split(' ');

    if (!openedDirectoryName) {
      setHistory([...newHistory, 'Erro: Nenhuma pasta aberta.']);
      return;
    }

    switch (cmd) {
      case 'help':
        newHistory.push('Comandos disponíveis: help, ls, cd, pwd, clear, echo');
        break;
      case 'ls':
        const currentDir = findItemByPath(files, currentPath);
        if (currentDir && currentDir.type === 'folder' && currentDir.children) {
          if (currentDir.children.length === 0) {
            newHistory.push(''); // No output for empty dir, just a new line
          } else {
            const listings = currentDir.children.map(item =>
              item.type === 'folder' ? `${item.name}/` : item.name
            );
            newHistory.push(listings.join('  '));
          }
        } else {
            newHistory.push(`ls: não foi possível acessar '${currentPath.join('/')}': Arquivo ou diretório não encontrado`);
        }
        break;
      case 'cd':
        const targetPath = args[0];
        if (!targetPath || targetPath === '~' || targetPath === '/') {
          setCurrentPath([]);
        } else if (targetPath === '..') {
          setCurrentPath(prev => prev.slice(0, -1));
        } else {
          // Normalize path, handling both relative and absolute-from-root scenarios
          const pathSegments = targetPath.startsWith('/')
            ? targetPath.substring(1).split('/').filter(p => p) // from root
            : [...currentPath, ...targetPath.split('/')].filter(p => p); // relative
            
          const normalizedSegments = [];
          for (const segment of pathSegments) {
            if (segment === '..') {
              normalizedSegments.pop();
            } else if (segment !== '.') {
              normalizedSegments.push(segment);
            }
          }

          const targetDir = findItemByPath(files, normalizedSegments);
          if (targetDir && targetDir.type === 'folder') {
            setCurrentPath(normalizedSegments);
          } else {
            newHistory.push(`cd: no such file or directory: ${targetPath}`);
          }
        }
        break;
      case 'pwd':
        const fullPath = [basePath, ...currentPath].join('/');
        newHistory.push(fullPath);
        break;
      case 'clear':
        setHistory([]);
        return;
      case 'echo':
        newHistory.push(args.join(' '));
        break;
      case '':
        break;
      default:
        newHistory.push(`Comando não encontrado: ${cmd}. Digite "help" para ajuda.`);
        break;
    }
    setHistory(newHistory);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim().length >= 0) {
      handleCommand(input);
      setInput('');
    }
  };
  
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="h-full w-full bg-card text-foreground flex flex-col p-2 font-code text-sm" onClick={() => inputRef.current?.focus()}>
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-2">
          {history.map((line, index) => (
            <div key={index} className="whitespace-pre-wrap break-words">{line}</div>
          ))}
        </div>
      </ScrollArea>
      <div className="flex items-center">
        <span className="text-muted-foreground mr-2">{`${[basePath, ...currentPath].join('/')}$`}</span>
        <Input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          className="w-full bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 h-8 p-0"
          autoComplete="off"
          spellCheck="false"
        />
      </div>
    </div>
  );
}
