/** 全局 UI store：目前只承载轻提示（Toast）文案 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  /** 当前展示的 Toast 文案，空串表示隐藏 */
  const toast = ref('')
  /** 显示 Toast，1.6 秒后自动消失 */
  const showToast = (text: string) => { toast.value = text; setTimeout(() => { toast.value = '' }, 1600) }
  return { toast, showToast }
})
