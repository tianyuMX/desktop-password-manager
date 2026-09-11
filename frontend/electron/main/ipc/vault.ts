import { ipcMain } from 'electron'
import { fail, ok } from '../utils/result'
import { changeMasterPassword, getUnlockedData, initializeVault, lockVault, recoverVaultFromBackup, saveUnlockedData, unlockVault, vaultExists } from '../services/vault-service'

export const registerVaultIpc = () => {
  ipcMain.handle('vault:exists', () => ok(vaultExists()))
  ipcMain.handle('vault:initialize', (_e, masterPassword: string) => {
    try { return ok(initializeVault(masterPassword)) } catch (e) { return fail((e as Error).message) }
  })
  ipcMain.handle('vault:unlock', (_e, masterPassword: string) => {
    try { return ok(unlockVault(masterPassword)) } catch { return fail('主密码错误或密码库损坏') }
  })
  ipcMain.handle('vault:recover-backup', (_e, masterPassword: string) => {
    try { return ok(recoverVaultFromBackup(masterPassword)) } catch (e) { return fail((e as Error).message) }
  })
  ipcMain.handle('vault:get-data', () => {
    try { return ok(getUnlockedData()) } catch (e) { return fail((e as Error).message) }
  })
  ipcMain.handle('vault:save-data', (_e, data) => {
    try { saveUnlockedData(data); return ok(true) } catch (e) { return fail((e as Error).message) }
  })
  ipcMain.handle('vault:lock', () => { lockVault(); return ok(true) })
  ipcMain.handle('vault:change-master-password', (_e, oldPwd: string, newPwd: string) => {
    try { changeMasterPassword(oldPwd, newPwd); return ok(true) } catch (e) { return fail((e as Error).message) }
  })
}
