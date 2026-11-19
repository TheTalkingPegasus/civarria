const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('civ', {
  desktop: true,
  save: (name, str) => ipcRenderer.invoke('save', name, str),
  load: name => ipcRenderer.invoke('load', name),
  version: () => ipcRenderer.invoke('version')
});
