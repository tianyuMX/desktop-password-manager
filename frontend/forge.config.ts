/**
 * Electron Forge 打包配置
 *
 * 使用 @electron-forge/plugin-vite 插件，将项目拆为三套独立的 Vite 构建：
 * - 主进程（electron/main/index.ts）
 * - Preload（electron/preload/index.ts）
 * - 渲染进程（src/renderer，输出目录名 main_window）
 * 打包产物：Windows 用 Squirrel 安装器 + ZIP，Linux 用 deb/rpm。
 */
import type { ForgeConfig } from '@electron-forge/shared-types'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZIP } from '@electron-forge/maker-zip'
import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerRpm } from '@electron-forge/maker-rpm'
import { VitePlugin } from '@electron-forge/plugin-vite'

const config: ForgeConfig = {
  packagerConfig: {
    asar: true, // 源码打包进 asar 归档，避免直接暴露明文资源
    icon: 'src/renderer/assets/images/app-icon',
    extraResource: ['src/renderer/assets/images/app-icon.png']
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      setupIcon: 'src/renderer/assets/images/app-icon.ico'
    }),
    new MakerZIP({}, ['win32']),
    new MakerDeb({}),
    new MakerRpm({})
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'electron/main/index.ts',
          config: 'vite.main.config.ts'
        },
        {
          entry: 'electron/preload/index.ts',
          config: 'vite.preload.config.ts'
        }
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts'
        }
      ]
    })
  ]
}

export default config
