/**
 * 剪贴板复用逻辑
 *
 * 统一封装"复制 + Toast 提示 + 按设置延时清空剪贴板"。
 * 复制密码等敏感内容后，若设置开启自动清空，会在指定秒数后
 * 通过主进程清空系统剪贴板，降低密码残留泄露风险。
 */
import { useAppStore } from '../stores/app'
import { useVaultStore } from '../stores/vault'

export const useClipboard = () => {
  const app = useAppStore()
  const vault = useVaultStore()

  /**
   * 复制文本到剪贴板并给出提示。
   * @param text 要复制的文本
   * @param label Toast 提示文案（默认"已复制"）
   */
  const copy = async (text: string, label = '已复制') => {
    await window.desktopApi.clipboard.copyText(text)
    app.showToast(label)
    const settings = vault.data?.settings
    // 开启自动清空时，到点后清空剪贴板（不覆盖期间用户手动复制的新内容除外——此处为简单实现）
    if (settings?.clearClipboard) setTimeout(() => { void window.desktopApi.clipboard.clear() }, settings.clearClipboardSeconds * 1000)
  }
  return { copy }
}
