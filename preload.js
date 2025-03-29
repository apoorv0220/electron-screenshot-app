const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    onTimerUpdate: (callback) => ipcRenderer.on('timer-update', callback),
    onScreenshotCountUpdate: (callback) => ipcRenderer.on('screenshot-count-update', callback)
});