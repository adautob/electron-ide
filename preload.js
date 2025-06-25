const { contextBridge } = require('electron');

// We are exposing an empty object for now.
// This can be used to add other Electron APIs in the future
// without breaking the frontend code that expects `window.electronAPI` to exist.
contextBridge.exposeInMainWorld('electronAPI', {});
