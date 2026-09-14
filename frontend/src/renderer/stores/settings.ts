/** 设置 store：直接从 vault store 派生当前设置（设置随密码库加密存储，无独立状态） */
import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useVaultStore } from './vault'

export const useSettingsStore = defineStore('settings', () => {
  const vault = useVaultStore()
  /** 当前密码库设置（未解锁时为 undefined） */
  const settings = computed(() => vault.data?.settings)
  return { settings }
})
