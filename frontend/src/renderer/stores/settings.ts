import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useVaultStore } from './vault'

export const useSettingsStore = defineStore('settings', () => {
  const vault = useVaultStore()
  const settings = computed(() => vault.data?.settings)
  return { settings }
})
