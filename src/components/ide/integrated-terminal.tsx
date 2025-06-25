"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { FileOrFolder } from '@/types';

// This is a self-contained simulated terminal component.
// It is used as a fallback when the real terminal fails to install.
export function IntegratedTerminal() {
  const [history, setHistory] = useState<string[]>(['Bem-vindo ao terminal simulado! Digite "help" para ver os comandos.']);
  const [currentPath, setCurrentPath] = useState<string>('/');
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // This is a fake file system for demonstration.
  // A real implementation would receive the file structure from the main page.
  const fileSystem: FileOrFolder = {
      id: '/',
      name: '~',
      type: 'folder',
      path: '/',
      children: [
          { id: 'about', name: 'about.txt', type: 'file', path: '/about.txt', content: 'This is a simulated terminal.' },
          { id: 'README.md', name: 'README.md', type: 'file', path: '/README.md', content: '# Project Readme' },
          { 
              id: 'src',
              name: 'src', 
              type: 'folder', 
              path: '/src', 
              children: [
                  { id: 'app', name: 'app', type: 'folder', path: '/src/app', children: [
                    { id: 'page.tsx', name: 'page.tsx', type: 'file', path: '/src/app/page.tsx', content: ''}
                  ] },
                   { id: 'components', name: 'components', type: 'folder', path: '/src/components', children: [] }
              ]
          }
      ]
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleCommand = (command: string) => {
    const newHistory = [...history, `$ ${currentPath === '/' ? '~' : currentPath.split('/').pop()} > ${command}`];
    const [cmd, ...args] = command.trim().split(' ');
    let output = '';

    const findNode = (path: string, root: FileOrFolder): FileOrFolder | null => {
        if (path === '/') return root;

        const segments = path.split('/').filter(p => p);
        let currentNode: FileOrFolder | undefined = root;

        for (const segment of segments) {
            currentNode = currentNode?.children?.find(c => c.name === segment);
            if (!currentNode) return null;
        }
        return currentNode || null;
    };

    const currentNode = findNode(currentPath, fileSystem);

    switch (cmd.toLowerCase()) {
      case 'help':
        output = 'Comandos disponíveis: help, ls, cd, pwd, clear, echo, cat';
        break;
      case 'ls':
        if (currentNode && currentNode.type === 'folder') {
          output = currentNode.children?.map(c => `${c.name}${c.type === 'folder' ? '/' : ''}`).join('\n') || 'Diretório vazio.';
        } else {
          output = `ls: "${currentPath}" não é um diretório.`;
        }
        break;
      case 'cd':
        const target = args[0];
        if (!target) {
            output = 'cd: argumento faltando.';
            break;
        }
        if (target === '..') {
            const newPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
            setCurrentPath(newPath);
        } else {
            const newPath = currentPath === '/' ? `/${target}` : `${currentPath}/${target}`;
            const targetNode = findNode(newPath, fileSystem);
            if (targetNode && targetNode.type === 'folder') {
                setCurrentPath(newPath);
            } else {
                output = `cd: "${target}" não é um diretório ou não existe.`;
            }
        }
        break;
      case 'pwd':
        output = currentPath;
        break;
      case 'echo':
        output = args.join(' ');
        break;
      case 'cat':
        const filePath = args[0];
        if (!filePath) {
           output = 'cat: nome do arquivo faltando.'
           break;
        }
        const fileNode = currentNode?.children?.find(c => c.name === filePath && c.type === 'file');
        if (fileNode) {
            output = fileNode.content || `O arquivo '${filePath}' está vazio.`;
        } else {
            output = `cat: arquivo '${filePath}' não encontrado.`;
        }
        break;
      case 'clear':
        setHistory([]);
        return; // Exit early
      default:
        if (command.trim() !== '') {
          output = `Comando não encontrado: ${command}. Digite "help".`;
        }
    }

    if (output) {
      newHistory.push(output);
    }
    setHistory(newHistory);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const command = e.currentTarget.value;
      e.currentTarget.value = '';
      handleCommand(command);
    }
  };
  
  const finalPath = currentPath === '/' ? '~' : currentPath.split('/').pop() || '/';

  return (
    <div className="h-full w-full bg-[#2C3E50] text-[#ECF0F1] p-2 flex flex-col font-code text-sm rounded-b-lg">
        <div className="flex-1 overflow-y-auto pr-2" onClick={() => inputRef.current?.focus()}>
            {history.map((line, index) => (
                <div key={index} className="whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: line.replace(/ /g, '&nbsp;') }}></div>
            ))}
            <div ref={terminalEndRef} />
        </div>
        <div className="flex items-center shrink-0">
            <span className="text-[#3498DB]">{finalPath} $</span>
            <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-transparent border-none outline-none pl-2 text-inherit"
                onKeyDown={onInputKeyDown}
                spellCheck="false"
                autoFocus
            />
        </div>
    </div>
  );
}
