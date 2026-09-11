import { onBeforeUnmount, onMounted } from 'vue'

export const useLockTimer = (minutes: number, lock: () => void) => {
  if (minutes <= 0) return
  let timer: ReturnType<typeof setTimeout> | null = null
  const reset = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => lock(), minutes * 60 * 1000)
  }
  const events = ['mousemove', 'keydown', 'scroll', 'click'] as const
  onMounted(() => { events.forEach((e) => window.addEventListener(e, reset)); reset() })
  onBeforeUnmount(() => { if (timer) clearTimeout(timer); events.forEach((e) => window.removeEventListener(e, reset)) })
}
