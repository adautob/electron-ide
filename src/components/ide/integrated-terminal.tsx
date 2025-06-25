
"use client";

import type { FileOrFolder } from '@/types';
import React, { useState, useEffect, useRef } from 'react';

const HELP_MESSAGE = `Simulated Shell. Available commands:
- ls [-a]: List files in the current directory. -a shows hidden files.
- cd [dir]: Change directory. Use '..' to go up.
- pwd: Print working directory.
- cat [file]: Display content of a file.
- clear: Clear the terminal screen.
- help: Show this help message.
- echo [...args]: Print arguments to the console.
`;

const findItemByPath = (items: FileOrFolder[], path: string): FileOrFolder | null => {
  for (const item of items) {
    if (item.path === path) return item;
    if (item.children) {
      const found = findItemByPath(item.children, path);
      if (found) return found;
    }
  }
  return null;
};

interface SimulatedTerminalProps {
  allFiles: FileOrFolder[];
  openedDirectoryName: string | null;
}

export function IntegratedTerminal({ allFiles, openedDirectoryName }: SimulatedTerminalProps) {
  const [history, setHistory] = useState<string[]>(['Electron IDE Simulated Terminal. Type "help" for commands.']);
  const [currentLine, setCurrentLine] = useState('');
  const [cwd, setCwd] = useState(openedDirectoryName || '/');
  const endOfTerminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCwd(openedDirectoryName || '/');
    setHistory(['Electron IDE Simulated Terminal. Type "help" for commands.']);
  }, [openedDirectoryName]);

  useEffect(() => {
    endOfTerminalRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);
  
  const focusInput = () => inputRef.current?.focus();

  const processCommand = (command: string) => {
    const [cmd, ...args] = command.trim().split(' ').filter(Boolean);
    let output = '';

    if (!openedDirectoryName) {
      return `Error: No folder is currently open.`;
    }

    const currentDirectoryNode = findItemByPath(allFiles, cwd);

    switch (cmd) {
      case 'help':
        output = HELP_MESSAGE;
        break;
      case 'pwd':
        output = cwd;
        break;
      case 'clear':
        setHistory([]);
        return;
      case 'echo':
        output = args.join(' ');
        break;
      case 'ls':
        if (!currentDirectoryNode || currentDirectoryNode.type !== 'folder') {
          output = 'Error: Current path is not a directory.';
        } else {
          const showAll = args.includes('-a');
          const children = currentDirectoryNode.children || [];
          output = children
            .filter(item => showAll || !item.name.startsWith('.'))
            .map(item => `${item.type === 'folder' ? 'd' : '-'} ${item.name}`)
            .join('\n');
        }
        break;
      case 'cd':
        const targetDir = args[0];
        if (!targetDir) {
          output = 'Usage: cd [directory]';
        } else if (targetDir === '..') {
          if (cwd === openedDirectoryName) {
            output = 'Error: Already at the root directory.';
          } else {
            const newCwd = cwd.substring(0, cwd.lastIndexOf('/'));
            setCwd(newCwd || openedDirectoryName);
          }
        } else {
          const newPath = `${cwd}/${targetDir}`;
          const targetNode = findItemByPath(allFiles, newPath);
          if (targetNode && targetNode.type === 'folder') {
            setCwd(newPath);
          } else {
            output = `Error: Directory not found: ${targetDir}`;
          }
        }
        break;
      case 'cat':
        const targetFile = args[0];
        if (!targetFile) {
            output = 'Usage: cat [file]';
        } else {
            const filePath = `${cwd}/${targetFile}`;
            const fileNode = findItemByPath(allFiles, filePath);
            if (fileNode && fileNode.type === 'file') {
                if (fileNode.content !== undefined && fileNode.content !== null) {
                    output = fileNode.content;
                } else {
                    output = `Error: File content for ${targetFile} is not loaded. Please open it in the editor first.`;
                }
            } else {
                output = `Error: File not found or is a directory: ${targetFile}`;
            }
        }
        break;
      default:
        if (cmd) output = `Command not found: ${cmd}`;
        break;
    }
    setHistory(h => [...h, `$ ${command}`, ...(output ? [output] : [])]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      processCommand(currentLine);
      setCurrentLine('');
    }
  };

  return (
    <div
      className="h-full w-full bg-[#1e1e1e] text-white font-code text-sm p-3 overflow-y-auto"
      onClick={focusInput}
    >
      {history.map((line, index) => (
        <pre key={index} className="whitespace-pre-wrap break-words">{line}</pre>
      ))}
      <div className="flex">
        <span className="shrink-0">$ </span>
        <input
          ref={inputRef}
          type="text"
          value={currentLine}
          onChange={(e) => setCurrentLine(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-transparent border-none text-white focus:outline-none w-full pl-2"
          autoFocus
        />
      </div>
      <div ref={endOfTerminalRef} />
    </div>
  );
}
