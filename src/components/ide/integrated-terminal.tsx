
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FileOrFolder } from '@/types';

interface IntegratedTerminalProps {
  files: FileOrFolder[];
  openedDirectoryName?: string | null;
}

interface CommandHistory {
  id: number;
  type: 'input' | 'output' | 'error';
  content: string | React.ReactNode;
}

const findItemByPath = (items: FileOrFolder[], path: string): FileOrFolder | null => {
  if (!items) return null;
  for (const item of items) {
    if (item.path === path) return item;
    if (item.children) {
      const found = findItemByPath(item.children, path);
      if (found) return found;
    }
  }
  return null;
};

export function IntegratedTerminal({ files, openedDirectoryName }: IntegratedTerminalProps) {
  const [history, setHistory] = useState<CommandHistory[]>([]);
  const [currentPath, setCurrentPath] = useState(openedDirectoryName || '/');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPath(openedDirectoryName || '/');
    setHistory([
      { id: Date.now(), type: 'output', content: `Bem-vindo ao terminal simulado! Digite 'help' para ver os comandos.` },
    ]);
  }, [openedDirectoryName]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }
    }, 50);
  };
  
  const processCommand = (command: string) => {
    const [cmd, ...args] = command.trim().split(' ');
    let newHistory: CommandHistory[] = [];

    const addOutput = (content: string | React.ReactNode) => newHistory.push({ id: Date.now() + Math.random(), type: 'output', content });
    const addError = (content: string) => newHistory.push({ id: Date.now() + Math.random(), type: 'error', content });

    switch (cmd.toLowerCase()) {
      case 'help':
        addOutput(
          <div className="text-sm">
            Comandos disponíveis:
            <ul className="list-disc pl-5 mt-1">
              <li><span className="font-semibold">help</span>: Mostra esta ajuda.</li>
              <li><span className="font-semibold">clear</span>: Limpa o terminal.</li>
              <li><span className="font-semibold">echo [texto]</span>: Imprime o texto.</li>
              <li><span className="font-semibold">ls</span>: Lista arquivos no diretório atual.</li>
              <li><span className="font-semibold">cd [caminho]</span>: Muda o diretório atual.</li>
              <li><span className="font-semibold">pwd</span>: Mostra o diretório atual.</li>
            </ul>
          </div>
        );
        break;
      
      case 'clear':
        setHistory([]);
        return;
      
      case 'echo':
        addOutput(args.join(' '));
        break;

      case 'pwd':
        addOutput(currentPath);
        break;

      case 'ls':
        const currentItem = findItemByPath(files, currentPath);
        if (currentItem && currentItem.type === 'folder' && currentItem.children) {
          if (currentItem.children.length === 0) {
             addOutput("O diretório está vazio.");
          } else {
             currentItem.children.forEach(child => {
                const color = child.type === 'folder' ? 'text-blue-400' : 'text-foreground';
                addOutput(<span className={color}>{child.name}</span>);
             });
          }
        } else if (currentPath === openedDirectoryName && files) {
          if (files.length === 0) {
            addOutput("O diretório está vazio.");
          } else {
            files.forEach(child => {
               const color = child.type === 'folder' ? 'text-blue-400' : 'text-foreground';
               addOutput(<span className={color}>{child.name}</span>);
            });
          }
        } else {
          addError(`ls: cannot access '${currentPath}': No such file or directory`);
        }
        break;
        
      case 'cd':
        const targetPath = args[0] || '';
        if (!targetPath) {
          setCurrentPath(openedDirectoryName || '/');
        } else if (targetPath === '..') {
          const pathSegments = currentPath.split('/').filter(p => p);
          if (pathSegments.length > 1) { // more than just the root name
            pathSegments.pop();
            setCurrentPath(pathSegments.join('/'));
          } else {
             setCurrentPath(openedDirectoryName || '/');
          }
        } else {
            const newPath = targetPath.startsWith(openedDirectoryName || '') ? targetPath : `${currentPath}/${targetPath}`.replace(/\/+/g, '/');
            const targetItem = findItemByPath(files, newPath);
            if (targetItem && targetItem.type === 'folder') {
                setCurrentPath(newPath);
            } else {
                addError(`cd: no such file or directory: ${targetPath}`);
            }
        }
        break;

      default:
        if(cmd) {
            addError(`bash: command not found: ${cmd}`);
        }
        break;
    }

    setHistory(prev => [
      ...prev,
      { id: Date.now(), type: 'input', content: command },
      ...newHistory
    ]);
    scrollToBottom();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const command = e.currentTarget.value;
      processCommand(command);
      e.currentTarget.value = '';
    }
  };

  const prompt = `user@electron-ide:${currentPath.replace(openedDirectoryName || '', '~') || '/'} $ `;

  return (
    <div className="h-full w-full bg-[#1e1e1e] text-white/90 font-mono text-sm p-2 flex flex-col" onClick={() => inputRef.current?.focus()}>
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-2">
          {history.map((line) => (
            <div key={line.id}>
              {line.type === 'input' && (
                <div>
                  <span className="text-green-400">{`user@electron-ide:${currentPath.replace(openedDirectoryName || '', '~') || '/'} $ `}</span>
                  <span>{line.content}</span>
                </div>
              )}
              {line.type === 'output' && <div className="text-white/90">{line.content}</div>}
              {line.type === 'error' && <div className="text-red-400">{line.content}</div>}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="flex items-center pt-2">
        <span className="text-green-400 shrink-0">{prompt}</span>
        <Input
          ref={inputRef}
          type="text"
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none text-white/90 focus:ring-0 focus-visible:ring-0 h-6 p-0 pl-2 outline-none shadow-none"
          autoFocus
          spellCheck="false"
          autoComplete="off"
        />
      </div>
    </div>
  );
}
