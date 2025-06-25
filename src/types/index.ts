
export interface FileOrFolder {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileOrFolder[];
  content?: string; // For files, loaded on demand
  handle?: FileSystemFileHandle | FileSystemDirectoryHandle; // To interact with the actual file/folder
}

// Extend the window object
declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    electronAPI: {
      onTerminalData: (callback: (data: string) => void) => void;
      sendToTerminal: (data: string) => void;
      resizeTerminal: (size: { cols: number; rows: number }) => void;
      removeAllListeners: (channel: 'terminal.incomingData') => void;
    };
  }
}
