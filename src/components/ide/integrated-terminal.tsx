"use client";

import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useTheme } from '@/contexts/theme-provider';

export function IntegratedTerminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (terminalRef.current && !term.current) {
      // Create a new Terminal instance
      term.current = new Terminal({
        cursorBlink: true,
        fontFamily: "'Source Code Pro', monospace",
        fontSize: 14,
        theme: {
          background: theme === 'dark' ? '#2C3E50' : '#FFFFFF',
          foreground: theme === 'dark' ? '#F8F8F2' : '#000000',
          cursor: '#F8F8F2',
          selectionBackground: '#44475A',
        },
      });

      // Load addons
      fitAddon.current = new FitAddon();
      term.current.loadAddon(fitAddon.current);

      // Open the terminal in the div
      term.current.open(terminalRef.current);

      // Fit the terminal to the container size
      fitAddon.current.fit();

      // Send keystrokes from terminal to main process
      term.current.onKey(({ key }) => {
        window.electronAPI.sendToTerminal(key);
      });

      // Handle incoming data from main process (pty)
      window.electronAPI.onTerminalData((data: string) => {
        term.current?.write(data);
      });

      // Handle resize
      const handleResize = () => {
        if (fitAddon.current && term.current) {
          fitAddon.current.fit();
          window.electronAPI.resizeTerminal({
            cols: term.current.cols,
            rows: term.current.rows,
          });
        }
      };

      const resizeObserver = new ResizeObserver(handleResize);
      if (terminalRef.current) {
        resizeObserver.observe(terminalRef.current);
      }
      
      // Initial resize
      setTimeout(() => handleResize(), 200);

      // Clean up on component unmount
      return () => {
        resizeObserver.disconnect();
        window.electronAPI.removeAllListeners('terminal.incomingData');
        term.current?.dispose();
        term.current = null;
      };
    }
  }, [theme]); // Rerun effect if theme changes

  useEffect(() => {
    // Update terminal theme when the app theme changes
    if (term.current) {
      term.current.options.theme = {
        background: theme === 'dark' ? '#2C3E50' : '#FFFFFF',
        foreground: theme === 'dark' ? '#F8F8F2' : '#000000',
        cursor: theme === 'dark' ? '#F8F8F2' : '#000000',
        selectionBackground: '#44475A',
      };
    }
  }, [theme]);


  return <div ref={terminalRef} className="h-full w-full bg-primary" />;
}
