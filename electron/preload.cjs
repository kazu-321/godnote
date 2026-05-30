const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('godnote', {
  isElectron: true,
  pickWorkspaceDirectory: () => ipcRenderer.invoke('godnote:pick-workspace-directory'),
  getLastWorkspace: () => ipcRenderer.invoke('godnote:get-last-workspace'),
  getRecentWorkspaces: () => ipcRenderer.invoke('godnote:get-recent-workspaces'),
  saveRecentWorkspace: (record) => ipcRenderer.invoke('godnote:save-recent-workspace', record),
});
