/**
 * 窗口锁定服务（主进程）
 *
 * 持有主窗口的引用，用于在窗口最小化等事件发生时，
 * 主动向渲染进程推送"自动锁定"通知（app:auto-lock）。
 */
import { BrowserWindow } from 'electron'

/** 当前主窗口引用（由主进程入口注册） */
let mainWindow: BrowserWindow | null = null

/** 注册主窗口，供后续推送事件使用 */
export const registerWindow = (win: BrowserWindow) => { mainWindow = win }

/** 向渲染进程广播自动锁定事件 */
export const notifyAutoLock = () => { mainWindow?.webContents.send('app:auto-lock') }
