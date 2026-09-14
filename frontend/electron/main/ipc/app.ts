/** 应用级 IPC 通道：在系统默认浏览器打开外部链接（协议白名单校验在 external-service 中） */
import { ipcMain } from 'electron'
import { fail, ok } from '../utils/result'
import { openExternalUrl } from '../services/external-service'

export const registerAppIpc = () => {
  ipcMain.handle('app:open-external', async (_e, url: string) => {
    try { await openExternalUrl(url); return ok(true) } catch (e) { return fail((e as Error).message) }
  })
}
