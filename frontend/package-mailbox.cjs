const path = require('node:path')
const fs = require('node:fs')
async function main() {
  const config = (await require('jiti').createJiti(__filename).import('./forge.config.ts')).default
  const cache = path.resolve('.electron-cache')
  const version = require('electron/package.json').version
  const cached = fs.readdirSync(cache).map((name) => path.join(cache, name)).find((dir) => fs.existsSync(path.join(dir, `electron-v${version}-win32-x64.zip`)))
  if (!cached) throw new Error('No matching cached Electron archive')
  config.packagerConfig.electronZipDir = cached
  require('@electron-forge/core/dist/util/forge-config').registerForgeConfigForDirectory(process.cwd(), config)
  const result = await require('@electron-forge/core/dist/api/package').default({ outDir: path.resolve(process.env.MAILBOX_BUILD_DIR || 'out-mailbox') })
  console.log(result)
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
