"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { FileOrFolder } from '@/types';

interface TerminalOutput {
  type: 'input' | 'output' | 'error';
  content: string;
}

interface IntegratedTerminalProps {
  files: FileOrFolder[];
  openedDirectoryName: string | null;
}

export function IntegratedTerminal({ files, openedDirectoryName }: IntegratedTerminalProps) {
  const [output, setOutput] = useState<TerminalOutput[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentDir, setCurrentDir] = useState<string>('/');

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const getPrompt = () => `user@electron-ide:${currentDir}$`;
  const welcomeMessage = "Simulated Terminal. Type 'help' for available commands.";

  // Function to add a new line to output and scroll down
  const addOutput = useCallback((newOutput: TerminalOutput) => {
    setOutput(prev => [...prev, newOutput]);
  }, []);

  useEffect(() => {
    if (openedDirectoryName) {
      setCurrentDir(`/${openedDirectoryName}`);
    } else {
      setCurrentDir('/');
    }
    // Clear terminal on folder change
    setOutput([{ type: 'output', content: welcomeMessage }]);
  }, [openedDirectoryName]);


  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const findItemByPath = (path: string, searchRoot: FileOrFolder[]): FileOrFolder | null => {
    const segments = path.split('/').filter(Boolean);
    if (openedDirectoryName) {
      // If path starts with the root dir name, remove it
      if (segments[0] === openedDirectoryName) {
        segments.shift();
      }
    }

    let currentLevel = searchRoot;
    let foundItem: FileOrFolder | null = null;
    
    for (const segment of segments) {
        const item = currentLevel.find(i => i.name === segment);
        if (item) {
            foundItem = item;
            if (item.type === 'folder' && item.children) {
                currentLevel = item.children;
            } else if (segments.indexOf(segment) < segments.length - 1) {
                // It's a file but there are more path segments
                return null; 
            }
        } else {
            return null; // Segment not found
        }
    }
    return foundItem;
};


  const processCommand = (command: string) => {
    const [cmd, ...args] = command.trim().split(' ');
    addOutput({ type: 'input', content: `${getPrompt()} ${command}` });

    if (command.trim() === '') return;

    switch (cmd) {
      case 'help':
        addOutput({ type: 'output', content: 'Available commands: help, clear, ls, cd, pwd, echo' });
        break;
      case 'clear':
        setOutput([]);
        break;
      case 'pwd':
        addOutput({ type: 'output', content: currentDir });
        break;
      case 'echo':
        addOutput({ type: 'output', content: args.join(' ') });
        break;
      case 'ls':
        if (!openedDirectoryName) {
            addOutput({ type: 'error', content: 'No directory opened.' });
            return;
        }

        let targetPath = currentDir.substring(1); // remove leading '/'
        if (targetPath === openedDirectoryName) targetPath = '';

        const currentFolder = targetPath === '' ? { children: files } : findItemByPath(targetPath, files);
        if (currentFolder && currentFolder.children) {
            const list = currentFolder.children.map(item => `${item.name}${item.type === 'folder' ? '/' : ''}`).join('\n');
            addOutput({ type: 'output', content: list || 'Empty directory' });
        } else {
            addOutput({ type: 'error', content: `ls: cannot access '${args[0] || '.'}': No such file or directory` });
        }
        break;
      case 'cd':
        const target = args[0] || '';
        if (!openedDirectoryName) {
            addOutput({ type: 'error', content: 'No directory opened.' });
            return;
        }

        if (target === '' || target === '/') {
            setCurrentDir(`/${openedDirectoryName}`);
            return;
        }

        if (target === '..') {
            const parts = currentDir.split('/').filter(Boolean);
            if (parts.length > 1) { // Can't go above root
                parts.pop();
                setCurrentDir(`/${parts.join('/')}`);
            }
            return;
        }

        const newPath = (currentDir === '/' ? '' : currentDir) + '/' + target;
        const normalizedNewPath = newPath.replace(/\/+/g, '/');

        const destination = findItemByPath(normalizedNewPath.substring(1), files);
        
        if (destination && destination.type === 'folder') {
            setCurrentDir(normalizedNewPath);
        } else {
            addOutput({ type: 'error', content: `cd: no such file or directory: ${target}` });
        }
        break;
      default:
        addOutput({ type: 'error', content: `${cmd}: command not found` });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (input.trim()) {
        setHistory(prev => [input, ...prev]);
      }
      setHistoryIndex(-1);
      processCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = Math.max(historyIndex - 1, -1);
        setHistoryIndex(newIndex);
        setInput(newIndex === -1 ? '' : history[newIndex]);
      }
    } else if (e.key === 'Tab') {
        e.preventDefault();
        // Basic autocomplete logic
    }
  };

  const handleClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      className="h-full w-full bg-[#1e1e1e] text-[#d4d4d4] font-code text-sm p-2 overflow-y-auto"
      onClick={handleClick}
      ref={scrollRef}
    >
      <div>{welcomeMessage}</div>
      {output.map((line, index) => (
        <div key={index} className={line.type === 'error' ? 'text-red-500' : ''}>
          <pre className="whitespace-pre-wrap">{line.content}</pre>
        </div>
      ))}
      <div className="flex">
        <span className="text-green-400">{getPrompt()}&nbsp;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          className="bg-transparent border-none outline-none text-inherit flex-1 p-0"
          autoFocus
          spellCheck="false"
        />
      </div>
    </div>
  );
}
