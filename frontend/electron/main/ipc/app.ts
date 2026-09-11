import { ipcMain } from 'electron'
import { fail, ok } from '../utils/result'
import { openExternalUrl } from '../services/external-service'

export const registerAppIpc = () => {
  ipcMain.handle('app:open-external', async (_e, url: string) => {
    try { await openExternalUrl(url); return ok(true) } catch (e) { return fail((e as Error).message) }
  })
}
