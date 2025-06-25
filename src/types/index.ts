
export interface FileOrFolder {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileOrFolder[];
  content?: string; // For files, loaded on demand
  handle?: FileSystemFileHandle | FileSystemDirectoryHandle; // To interact with the actual file/folder
}


// --- Electron Preload API ---
// This makes TypeScript aware of the 'window.electron' object we define in preload.js
export interface IElectronAPI {
  ptySpawn: (options: { cwd?: string }) => void;
  ptyWrite: (data: string) => void;
  ptyResize: (size: { cols: number; rows: number }) => void;
  ptyKill: () => void;
  onPtyData: (callback: (data: string) => void) => () => void; // Returns a cleanup function
  onPtyExit: (callback: (reason: string) => void) => () => void; // Returns a cleanup function
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}
