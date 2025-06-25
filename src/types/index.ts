
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
      // The terminal API is removed as it's now simulated in the frontend
      // to avoid native dependency installation issues.
    };
  }
}
