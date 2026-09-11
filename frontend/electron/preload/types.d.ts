export {}

import type { VaultRoot, VaultUnlockResult } from '../../src/renderer/types/vault'

declare global {
  interface Window {
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
