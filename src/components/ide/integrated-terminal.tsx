
"use client";

import React, { useEffect, useRef, useLayoutEffect } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useTheme } from '@/contexts/theme-provider';

// Define the structure of the API exposed by preload.js
declare global {
  interface Window {
    electronAPI: {
      pty: {
        onData: (callback: (data: string) => void) => void;
      };
      writeToPty: (data: string) => void;
      resizePty: (size: { cols: number; rows: number }) => void;
      removeAllListeners: () => void;
    };
  }
}

const darkTheme = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#d4d4d4',
  selectionBackground: '#264f78',
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d186',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#e5e5e5',
};

const lightTheme = {
    background: '#ffffff',
    foreground: '#000000',
    cursor: '#000000',
    selectionBackground: '#aaccff',
    black: '#000000',
    red: '#c51e1e',
    green: '#13a10e',
    yellow: '#c19c00',
    blue: '#0037da',
    magenta: '#881798',
    cyan: '#3a96dd',
    white: '#cccccc',
    brightBlack: '#767676',
    brightRed: '#e74848',
    brightGreen: '#16c60c',
    brightYellow: '#f9f1a5',
    brightBlue: '#3b78ff',
    brightMagenta: '#b4009e',
    brightCyan: '#61d6d6',
    brightWhite: '#f2f2f2',
};

export function IntegratedTerminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useLayoutEffect(() => {
    if (!terminalRef.current || typeof window.electronAPI === 'undefined') {
      return;
    }

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: '"Source Code Pro", monospace',
      fontSize: 14,
      theme: theme === 'dark' ? darkTheme : lightTheme,
      allowProposedApi: true,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(terminalRef.current);
    fitAddon.fit();

    // --- IPC Communication ---
    // Handle incoming data from the main process PTY and write to terminal
    window.electronAPI.pty.onData((data) => {
      term.write(data);
    });

    // Handle user input in the terminal and send to the main process PTY
    const onDataDisposable = term.onData((data) => {
      window.electronAPI.writeToPty(data);
    });
    
    // --- Resizing Logic ---
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch (err) {
        console.error("Error fitting terminal on resize:", err);
      }
    });
    
    resizeObserver.observe(terminalRef.current);
    
    const onResizeDisposable = term.onResize(({ cols, rows }) => {
      window.electronAPI.resizePty({ cols, rows });
    });
    
    // Initial resize
    window.electronAPI.resizePty({ cols: term.cols, rows: term.rows });


    // --- Cleanup ---
    return () => {
      onDataDisposable.dispose();
      onResizeDisposable.dispose();
      term.dispose();
      fitAddon.dispose();
      resizeObserver.disconnect();
      // Important: Remove listeners to prevent memory leaks on component re-mount
      if (window.electronAPI && typeof window.electronAPI.removeAllListeners === 'function') {
         window.electronAPI.removeAllListeners();
      }
    };
  }, [theme]); // Rerun effect if theme changes

  return <div ref={terminalRef} className="h-full w-full" />;
}
