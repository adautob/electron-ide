const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // No terminal-specific methods are exposed for the simulated terminal.
  // This can be extended for other Electron main-process features if needed.
});
