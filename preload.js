const { contextBridge } = require('electron');

// Expose a minimal, empty API to avoid errors if other parts of the app
// expect window.electronAPI to exist.
contextBridge.exposeInMainWorld('electronAPI', {});
