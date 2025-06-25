
"use client";

import React, { useEffect, useRef } from 'react';
import { XTerm } from 'xterm-react';
import { FitAddon } from 'xterm-addon-fit';
import { ITerminalOptions } from 'xterm';

const terminalOptions: ITerminalOptions = {
  cursorBlink: true,
  fontFamily: '"Source Code Pro", monospace',
  fontSize: 14,
  theme: {
    background: '#000000',
    foreground: '#d4d4d4',
    cursor: '#d4d4d4',
  },
  convertEol: true,
};

export function IntegratedTerminal() {
  const xtermRef = useRef<XTerm>(null);
  const terminalWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This effect handles the entire lifecycle of the terminal and its addons.
    if (typeof window !== 'undefined' && window.electron && xtermRef.current) {
      const term = xtermRef.current.terminal;
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      // Start the pseudo-terminal process in the Electron main process
      window.electron.ptySpawn({});

      // Handle data coming from the pty
      const ptyDataCleanup = window.electron.onPtyData((data) => {
        term.write(data);
      });

      // Handle user input
      const onDataDisposable = term.onData((data) => {
        window.electron.ptyWrite(data);
      });

      // Handle terminal exit
      const ptyExitCleanup = window.electron.onPtyExit((reason) => {
        term.writeln(`\r\n\n[Terminal session closed: ${reason}]`);
      });
      
      // Fit the terminal to its container
      fitAddon.fit();

      // Handle resize events
      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
      });

      if (terminalWrapperRef.current) {
        resizeObserver.observe(terminalWrapperRef.current);
      }
      
      // Update pty size on fit
      const onResizeDisposable = term.onResize(({ cols, rows }) => {
        window.electron.ptyResize({ cols, rows });
      });

      // Focus on the terminal when it's ready
      term.focus();

      // Cleanup on component unmount
      return () => {
        onDataDisposable.dispose();
        onResizeDisposable.dispose();
        ptyDataCleanup();
        ptyExitCleanup();
        window.electron.ptyKill();
        if (terminalWrapperRef.current) {
            resizeObserver.unobserve(terminalWrapperRef.current);
        }
        resizeObserver.disconnect();
      };
    }
  }, []);

  return (
    <div ref={terminalWrapperRef} className="h-full w-full bg-black p-1">
      <XTerm
        ref={xtermRef}
        options={terminalOptions}
      />
    </div>
  );
}
