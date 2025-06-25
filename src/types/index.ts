
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
      // This is now empty as the terminal is simulated.
      // Other APIs can be added here in the future.
    };
  }
}
