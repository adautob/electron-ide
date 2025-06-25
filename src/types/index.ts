
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
    // electronAPI is now much simpler, or could be empty
    electronAPI: {
      // No terminal methods needed for the simulated terminal.
      // Keeping the object for potential future use.
    };
  }
}
