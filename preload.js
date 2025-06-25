const { contextBridge, ipcRenderer } = require('electron');

// Expose a secure API to the renderer process (the Next.js app)
// This is kept minimal as the terminal is now simulated in the frontend.
contextBridge.exposeInMainWorld('electronAPI', {
  // Placeholder for any future Electron APIs you might want to expose.
});
