"use client";

import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useTheme } from '@/contexts/theme-provider';

// This is the real, integrated terminal component.
// It relies on Electron's IPC to communicate with a node-pty process.
export function IntegratedTerminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (terminalRef.current && !xtermRef.current) {
      const term = new Terminal({
        cursorBlink: true,
        fontFamily: "'Source Code Pro', monospace",
        fontSize: 14,
        theme: theme === 'dark' ? {
          background: '#2C3E50',
          foreground: '#ECF0F1',
          cursor: '#ECF0F1',
          selectionBackground: '#3498DB',
          selectionForeground: '#FFFFFF',
        } : {
          background: '#FFFFFF',
          foreground: '#2C3E50',
          cursor: '#2C3E50',
          selectionBackground: '#3498DB',
          selectionForeground: '#FFFFFF',
        }
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      
      term.open(terminalRef.current);
      fitAddon.fit();
      
      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      // Handle data coming from the main process
      window.electronAPI.onTerminalData((data: string) => {
        term.write(data);
      });

      // Handle user input
      term.onData((data) => {
        window.electronAPI.sendToTerminal(data);
      });
      
      // Set up resize observer
      const resizeObserver = new ResizeObserver(() => {
        if (fitAddonRef.current) {
          fitAddonRef.current.fit();
        }
      });
      resizeObserver.observe(terminalRef.current);

      // Fit on window resize too
      window.addEventListener('resize', () => fitAddon.fit());

      // Initial resize signal to backend
      setTimeout(() => {
        if (xtermRef.current) {
          window.electronAPI.resizeTerminal({ cols: xtermRef.current.cols, rows: xtermRef.current.rows });
        }
      }, 200);

      // Cleanup
      return () => {
        resizeObserver.disconnect();
        window.electronAPI.removeAllListeners('terminal.incomingData');
        term.dispose();
        xtermRef.current = null;
      };
    }
  }, []); // Run only once on mount
  
  // Effect to update theme
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = theme === 'dark' ? {
        background: '#2C3E50',
        foreground: '#ECF0F1',
        cursor: '#ECF0F1',
        selectionBackground: '#3498DB',
        selectionForeground: '#FFFFFF'
      } : {
        background: '#FFFFFF',
        foreground: '#2C3E50',
        cursor: '#2C3E50',
        selectionBackground: '#3498DB',
        selectionForeground: '#FFFFFF'
      };
    }
  }, [theme]);
  
  // Effect for resizing the pty on the backend
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        window.electronAPI.resizeTerminal({ cols: xtermRef.current.cols, rows: xtermRef.current.rows });
      }
    };
    
    if (xtermRef.current) {
        const resizeListener = xtermRef.current.onResize(() => handleResize());
        window.addEventListener('resize', handleResize);

        return () => {
            resizeListener.dispose();
            window.removeEventListener('resize', handleResize);
        };
    }
  }, []);

  return <div ref={terminalRef} className="h-full w-full" />;
}
