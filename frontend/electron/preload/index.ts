/**
 * Preload 桥接层
 *
 * 在开启 contextIsolation 的前提下，通过 contextBridge 向渲染进程
 * 暴露一个受控的 desktopApi 对象。渲染进程无法直接访问 ipcRenderer
 * 或任何 Node API，只能调用这里显式列出的方法。
 */
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('desktopApi', {
  // 密码库相关：初始化 / 解锁 / 恢复 / 读写 / 锁定 / 改主密码
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
  // 应用相关：打开外部链接、监听主进程推送的自动锁定事件
  app: {
    openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url),
    onAutoLock: (callback: () => void) => ipcRenderer.on('app:auto-lock', callback)
  },
  // 剪贴板相关：复制文本、清空剪贴板
  clipboard: {
    copyText: (text: string) => ipcRenderer.invoke('clipboard:copy-text', text),
    clear: () => ipcRenderer.invoke('clipboard:clear')
  }
})
