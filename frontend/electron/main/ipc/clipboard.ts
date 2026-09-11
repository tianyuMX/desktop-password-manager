import { clipboard, ipcMain } from 'electron'
import { ok } from '../utils/result'

export const registerClipboardIpc = () => {
  ipcMain.handle('clipboard:copy-text', (_e, text: string) => { clipboard.writeText(text); return ok(true) })
  ipcMain.handle('clipboard:clear', () => { clipboard.clear(); return ok(true) })
}
