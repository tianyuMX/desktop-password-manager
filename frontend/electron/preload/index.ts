import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('desktopApi', {
  vault: {
    exists: () => ipcRenderer.invoke('vault:exists'),
    initialize: (masterPassword: string) => ipcRenderer.invoke('vault:initialize', masterPassword),
    unlock: (masterPassword: string) => ipcRenderer.invoke('vault:unlock', masterPassword),
    recoverBackup: (masterPassword: string) => ipcRenderer.invoke('vault:recover-backup', masterPassword),
    lock: () => ipcRenderer.invoke('vault:lock'),
    getData: () => ipcRenderer.invoke('vault:get-data'),
    saveData: (data: unknown) => ipcRenderer.invoke('vault:save-data', data),
    changeMasterPassword: (oldPwd: string, newPwd: string) => ipcRenderer.invoke('vault:change-master-password', oldPwd, newPwd)
  },
  app: {
    openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url),
    onAutoLock: (callback: () => void) => ipcRenderer.on('app:auto-lock', callback)
  },
  clipboard: {
    copyText: (text: string) => ipcRenderer.invoke('clipboard:copy-text', text),
    clear: () => ipcRenderer.invoke('clipboard:clear')
  }
})
