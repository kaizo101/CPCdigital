import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  openReplay: (handNumber: number, data: unknown) =>
    ipcRenderer.invoke('open-replay', handNumber, data),
})
