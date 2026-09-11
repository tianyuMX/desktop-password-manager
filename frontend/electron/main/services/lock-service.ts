import { BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null

export const registerWindow = (win: BrowserWindow) => { mainWindow = win }
export const notifyAutoLock = () => { mainWindow?.webContents.send('app:auto-lock') }
