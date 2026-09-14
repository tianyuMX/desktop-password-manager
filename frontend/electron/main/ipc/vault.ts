/**
 * 密码库 IPC 通道（主进程侧）
 *
 * 每个通道对应 preload 中暴露的一个方法，
 * 返回值统一用 ok/fail 包装，敏感操作（初始化/解锁/恢复）不向渲染进程
 * 暴露具体失败原因，防止通过错误信息探测密码。
 */
import { ipcMain } from 'electron'
import { fail, ok } from '../utils/result'
import { changeMasterPassword, getUnlockedData, initializeVault, lockVault, recoverVaultFromBackup, saveUnlockedData, unlockVault, vaultExists } from '../services/vault-service'

export const registerVaultIpc = () => {
  // 密码库是否存在（首次启动判断走初始化还是解锁流程）
  ipcMain.handle('vault:exists', () => ok(vaultExists()))
  // 首次初始化密码库
  ipcMain.handle('vault:initialize', async (_e, masterPassword: string) => {
    try { return ok(await initializeVault(masterPassword)) } catch (e) { return fail((e as Error).message) }
  })
  // 正常解锁（密码错误与文件损坏统一提示，避免泄露具体原因）
  ipcMain.handle('vault:unlock', (_e, masterPassword: string) => {
    try { return ok(unlockVault(masterPassword)) } catch { return fail('主密码错误或密码库损坏') }
  })
  // 主文件损坏时从备份恢复解锁
  ipcMain.handle('vault:recover-backup', async (_e, masterPassword: string) => {
    try { return ok(await recoverVaultFromBackup(masterPassword)) } catch (e) { return fail((e as Error).message) }
  })
  // 读取当前解锁的密码库数据
  ipcMain.handle('vault:get-data', () => {
    try { return ok(getUnlockedData()) } catch (e) { return fail((e as Error).message) }
  })
  // 保存修改后的密码库数据
  ipcMain.handle('vault:save-data', async (_e, data) => {
    try { return ok(await saveUnlockedData(data)) } catch (e) { return fail((e as Error).message) }
  })
  // 锁定密码库（清空内存中的明文与主密码）
  ipcMain.handle('vault:lock', () => { lockVault(); return ok(true) })
  // 修改主密码
  ipcMain.handle('vault:change-master-password', async (_e, oldPwd: string, newPwd: string) => {
    try { await changeMasterPassword(oldPwd, newPwd); return ok(true) } catch (e) { return fail((e as Error).message) }
  })
}
