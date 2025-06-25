const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // --- Terminal IPC ---
  // The terminal functionality has been temporarily removed 
  // to resolve a native dependency installation issue.
});
