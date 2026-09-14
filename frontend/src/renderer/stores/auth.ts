/**
 * 认证状态store
 *
 * 管理密码库的解锁状态机：bootstrapped（是否已探测）→
 * initialized（是否已初始化）→ unlocked（当前是否解锁）。
 * 所有方法都是对 window.desktopApi.vault 的薄封装，
 * 统一把 IPC 失败转成异常抛给调用方。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { VaultRoot, VaultUnlockResult } from '../types/vault'

export const useAuthStore = defineStore('auth', () => {
  /** 是否已完成首次探测（区分首次启动与已有密码库） */
  const bootstrapped = ref(false)
  /** 密码库是否已初始化（决定进 /initialize 还是 /unlock） */
  const initialized = ref(false)
  /** 当前是否处于解锁状态 */
  const unlocked = ref(false)

  /** 应用启动时探测密码库是否存在（配合路由守卫做首次引导） */
  const bootstrap = async () => {
    const result = await window.desktopApi.vault.exists()
    initialized.value = !!result.data
    bootstrapped.value = true
  }

  /** 首次初始化密码库，成功后进入解锁状态 */
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

  /** 主文件损坏时从备份恢复解锁 */
  const recoverBackup = async (masterPassword: string): Promise<VaultUnlockResult> => {
    const res = await window.desktopApi.vault.recoverBackup(masterPassword)
    if (!res.success) throw new Error(res.error)
    if (!res.data) throw new Error('密码库没有返回数据')
    unlocked.value = true
    return res.data
  }

  /** 锁定密码库：通知主进程清空内存明文 */
  const lock = async () => {
    await window.desktopApi.vault.lock()
    unlocked.value = false
  }

  /** 修改主密码（旧密码校验在主进程完成） */
  const changeMasterPassword = async (oldPwd: string, newPwd: string) => {
    const res = await window.desktopApi.vault.changeMasterPassword(oldPwd, newPwd)
    if (!res.success) throw new Error(res.error)
  }

  return { bootstrapped, initialized, unlocked, bootstrap, initialize, unlock, recoverBackup, lock, changeMasterPassword }
})
