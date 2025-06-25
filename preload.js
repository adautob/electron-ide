
const { contextBridge } = require('electron');

// We are not exposing any Node.js or Electron APIs to the renderer process.
// The 'electron' object is kept for consistency in case other non-PTY
// functionalities are added later.
contextBridge.exposeInMainWorld('electron', {});
