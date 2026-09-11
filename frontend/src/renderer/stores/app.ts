import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const toast = ref('')
  const showToast = (text: string) => { toast.value = text; setTimeout(() => { toast.value = '' }, 1600) }
  return { toast, showToast }
})
