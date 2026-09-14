/**
 * 剪贴板 IPC 通道
 *
 * 剪贴板操作只能在主进程执行；渲染进程复制密码后，
 * 由定时清空逻辑（见渲染进程 useClipboard）再调用 clipboard:clear。
 */
import { clipboard, ipcMain } from 'electron'
import { ok } from '../utils/result'

export const registerClipboardIpc = () => {
  ipcMain.handle('clipboard:copy-text', (_e, text: string) => { clipboard.writeText(text); return ok(true) }) // 写入文本
  ipcMain.handle('clipboard:clear', () => { clipboard.clear(); return ok(true) }) // 清空剪贴板
}
