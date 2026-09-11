import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { VaultRoot, VaultUnlockResult } from '../types/vault'

export const useAuthStore = defineStore('auth', () => {
  const bootstrapped = ref(false)
  const initialized = ref(false)
  const unlocked = ref(false)

  const bootstrap = async () => {
    const result = await window.desktopApi.vault.exists()
    initialized.value = !!result.data
    bootstrapped.value = true
  }

  const initialize = async (masterPassword: string): Promise<VaultRoot> => {
    const res = await window.desktopApi.vault.initialize(masterPassword)
    if (!res.success) throw new Error(res.error)
    if (!res.data) throw new Error('密码库没有返回数据')
    initialized.value = true
    unlocked.value = true
    return res.data
  }

  const unlock = async (masterPassword: string): Promise<VaultUnlockResult> => {
    const res = await window.desktopApi.vault.unlock(masterPassword)
    if (!res.success) throw new Error(res.error)
    if (!res.data) throw new Error('密码库没有返回数据')
    unlocked.value = true
    return res.data
  }

  const recoverBackup = async (masterPassword: string): Promise<VaultUnlockResult> => {
    const res = await window.desktopApi.vault.recoverBackup(masterPassword)
    if (!res.success) throw new Error(res.error)
    if (!res.data) throw new Error('密码库没有返回数据')
    unlocked.value = true
    return res.data
  }

  const lock = async () => {
    await window.desktopApi.vault.lock()
    unlocked.value = false
  }

  const changeMasterPassword = async (oldPwd: string, newPwd: string) => {
    const res = await window.desktopApi.vault.changeMasterPassword(oldPwd, newPwd)
    if (!res.success) throw new Error(res.error)
  }

  return { bootstrapped, initialized, unlocked, bootstrap, initialize, unlock, recoverBackup, lock, changeMasterPassword }
})
