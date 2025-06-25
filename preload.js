const { contextBridge } = require('electron');

// Keep the context bridge but remove terminal-specific APIs
// as they are not needed for the simulated terminal.
contextBridge.exposeInMainWorld('electronAPI', {
  // No-op
});
