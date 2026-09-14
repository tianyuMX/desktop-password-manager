/**
 * 主进程入口
 *
 * 职责：创建应用菜单与主窗口、注册各 IPC 通道、
 * 并把窗口事件（如最小化）接入自动锁定逻辑。
 */
import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { dialog, Menu, type MenuItemConstructorOptions } from 'electron'
import { registerVaultIpc } from './ipc/vault'
import { registerAppIpc } from './ipc/app'
import { registerClipboardIpc } from './ipc/clipboard'
import { notifyAutoLock, registerWindow } from './services/lock-service'

// Vite 插件注入的编译期常量：开发模式下为 dev server 地址，生产构建下为 undefined
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined
declare const MAIN_WINDOW_VITE_NAME: string

// 开发版使用独立数据目录，避免调试时读写已安装正式版的密码库。
if (!app.isPackaged) {
  app.setPath('userData', join(app.getPath('appData'), '密码保险箱-dev'))
}

/** 配置应用顶部菜单栏（中文化，开发者工具仅在开发模式可见） */
const configureApplicationMenu = () => {
  const template: MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        { label: '关闭窗口', role: 'close' },
        { type: 'separator' },
        { label: '退出', role: 'quit' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { label: '全选', role: 'selectAll' }
      ]
    },
    {
      label: '查看',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { label: '强制重新加载', role: 'forceReload' },
        { label: '开发者工具', role: 'toggleDevTools', visible: Boolean(MAIN_WINDOW_VITE_DEV_SERVER_URL) },
        { type: 'separator' },
        { label: '恢复默认缩放', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { type: 'separator' },
        { label: '切换全屏', role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', role: 'minimize' },
        { label: '缩放', role: 'zoom' },
        { label: '关闭窗口', role: 'close' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于密码工具',
          click: () => {
            void dialog.showMessageBox({
              type: 'info',
              title: '关于密码工具',
              message: '密码保险箱',
              detail: `版本 ${app.getVersion()}\n本地加密存储您的账号密码。`,
              buttons: ['确定']
            })
          }
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

/** 创建主窗口：启用上下文隔离 + 沙箱，仅通过 preload 暴露最小能力 */
const createWindow = () => {
  const icon = app.isPackaged
    ? join(process.resourcesPath, 'app-icon.png')
    : join(app.getAppPath(), 'src/renderer/assets/images/app-icon.png')

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon,
    webPreferences: {
      contextIsolation: true,   // 隔离渲染进程与 preload 的 JS 环境
      nodeIntegration: false,   // 渲染进程禁用 Node API
      sandbox: true,            // 开启 Chromium 沙箱
      preload: join(__dirname, 'preload.js')
    }
  })

  registerWindow(win) // 注册窗口引用，供自动锁定通知使用
  win.on('minimize', () => notifyAutoLock()) // 最小化时通知渲染进程（由设置决定是否锁定）

  // 开发模式加载 dev server，生产模式加载打包产物
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    void win.loadFile(join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
  }
}

app.whenReady().then(() => {
  registerVaultIpc()
  registerAppIpc()
  registerClipboardIpc()
  configureApplicationMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
