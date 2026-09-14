export {}

/**
 * 渲染进程全局类型声明
 *
 * 让渲染进程的 TS 代码能对 window.desktopApi（由 preload 注入）
 * 进行类型提示与检查。所有 invoke 的返回值都是主进程统一的 ApiResult 结构。
 */
import type { VaultRoot, VaultUnlockResult } from '../../src/renderer/types/vault'

declare global {
  interface Window {
    /** preload 注入的桌面 API（唯一与主进程通信的入口） */
    desktopApi: {
      vault: {
        exists: () => Promise<{ success: boolean; data?: boolean; error?: string }>
        initialize: (masterPassword: string) => Promise<{ success: boolean; data?: VaultRoot; error?: string }>
        unlock: (masterPassword: string) => Promise<{ success: boolean; data?: VaultUnlockResult; error?: string }>
        recoverBackup: (masterPassword: string) => Promise<{ success: boolean; data?: VaultUnlockResult; error?: string }>
        lock: () => Promise<any>
        getData: () => Promise<any>
        saveData: (data: unknown) => Promise<any>
        changeMasterPassword: (oldPwd: string, newPwd: string) => Promise<any>
      }
      app: {
        openExternal: (url: string) => Promise<any>
        onAutoLock: (callback: () => void) => void
      }
      clipboard: {
        copyText: (text: string) => Promise<any>
        clear: () => Promise<any>
      }
    }
  }
}
