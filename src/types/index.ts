import type { IpcRenderer } from 'electron';

export interface FileOrFolder {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileOrFolder[];
  content?: string; // For files, loaded on demand
  handle?: FileSystemFileHandle | FileSystemDirectoryHandle; // To interact with the actual file/folder
}

// This interface must match the API exposed in preload.js
export interface ElectronAPI {
  pty: {
    onData: (callback: (data: string) => void) => IpcRenderer;
  };
  writeToPty: (data: string) => void;
  resizePty: (size: { cols: number, rows: number }) => void;
  removeAllListeners: () => void;
}

// Extend the window object
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
