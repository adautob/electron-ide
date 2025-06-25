const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // From Main to Renderer
  pty: {
    onData: (callback) => ipcRenderer.on('pty:data', (event, data) => callback(data)),
  },
  
  // From Renderer to Main
  writeToPty: (data) => ipcRenderer.send('pty:write', data),
  resizePty: (size) => ipcRenderer.send('pty:resize', size),
  
  // A function to remove all listeners, useful for component cleanup
  removeAllListeners: () => {
      ipcRenderer.removeAllListeners('pty:data');
  }
});
