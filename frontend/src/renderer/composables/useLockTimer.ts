/**
 * 空闲自动锁定计时器
 *
 * 监听用户交互事件（鼠标/键盘/滚动/点击），每次交互都重置倒计时；
 * 连续 minutes 分钟无操作则触发锁定回调。minutes <= 0 时禁用。
 */
import { onBeforeUnmount, onMounted } from 'vue'

export const useLockTimer = (minutes: number, lock: () => void) => {
  if (minutes <= 0) return
  let timer: ReturnType<typeof setTimeout> | null = null
  /** 重置倒计时：先清掉旧定时器再重新计时 */
  const reset = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => lock(), minutes * 60 * 1000)
  }
  // 视为"用户活跃"的事件
  const events = ['mousemove', 'keydown', 'scroll', 'click'] as const
  onMounted(() => { events.forEach((e) => window.addEventListener(e, reset)); reset() })
  onBeforeUnmount(() => { if (timer) clearTimeout(timer); events.forEach((e) => window.removeEventListener(e, reset)) })
}
