const { contextBridge, ipcRenderer } = require('electron');

// Preload script is now much simpler as there is no terminal communication with the main process.
// We can expose other APIs here in the future if needed.
contextBridge.exposeInMainWorld('electronAPI', {
  // Empty for now, but keeping the structure.
});
