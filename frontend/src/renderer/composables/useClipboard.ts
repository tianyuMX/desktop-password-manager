import { useAppStore } from '../stores/app'
import { useVaultStore } from '../stores/vault'

export const useClipboard = () => {
  const app = useAppStore()
  const vault = useVaultStore()
  const copy = async (text: string, label = '已复制') => {
    await window.desktopApi.clipboard.copyText(text)
    app.showToast(label)
    const settings = vault.data?.settings
    if (settings?.clearClipboard) setTimeout(() => { void window.desktopApi.clipboard.clear() }, settings.clearClipboardSeconds * 1000)
  }
  return { copy }
}
