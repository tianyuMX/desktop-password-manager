import {
  closeSync,
  copyFileSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync
} from 'node:fs'
import { randomBytes } from 'node:crypto'
import { dirname, join } from 'node:path'
import { decryptVault, encryptVault, type EncryptedPayload } from './crypto-service'
import { getVaultBackupDirectory, getVaultFilePath } from '../utils/path'

import type { VaultRoot } from '../../../src/renderer/types/vault'
export type { Account, Website, WebsiteCategory, VaultSettings, VaultRoot } from '../../../src/renderer/types/vault'
export interface UnlockResult { data: VaultRoot; recoveredFromBackup: boolean }

const MAX_BACKUPS = 10

const defaultData = (): VaultRoot => ({
  version: 1,
  settings: { autoLockMinutes: 5, lockOnMinimize: true, clearClipboard: true, clearClipboardSeconds: 30, hidePasswordByDefault: true },
  websites: [],
  mailboxes: []
})

let unlockedData: VaultRoot | null = null
let currentMasterPassword: string | null = null

const getBackupFiles = () => {
  const backupDirectory = getVaultBackupDirectory()
  if (!existsSync(backupDirectory)) return []

  return readdirSync(backupDirectory)
    .filter((name) => /^vault-\d+-[a-f0-9]+\.dat$/.test(name))
    .map((name) => join(backupDirectory, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
}

const pruneBackups = () => {
  for (const backupPath of getBackupFiles().slice(MAX_BACKUPS)) unlinkSync(backupPath)
}

const createBackup = () => {
  const vaultPath = getVaultFilePath()
  if (!existsSync(vaultPath)) return

  const backupDirectory = getVaultBackupDirectory()
  mkdirSync(backupDirectory, { recursive: true })
  const nonce = randomBytes(4).toString('hex')
  copyFileSync(vaultPath, join(backupDirectory, `vault-${Date.now()}-${nonce}.dat`))
  pruneBackups()
}

const atomicWrite = (content: string, backupCurrent = true) => {
  const vaultPath = getVaultFilePath()
  const tempPath = join(dirname(vaultPath), `.vault-${process.pid}-${Date.now()}-${randomBytes(4).toString('hex')}.tmp`)
  mkdirSync(dirname(vaultPath), { recursive: true })
  if (backupCurrent) createBackup()

  let descriptor: number | undefined
  try {
    descriptor = openSync(tempPath, 'wx', 0o600)
    writeFileSync(descriptor, content, 'utf8')
    fsyncSync(descriptor)
    closeSync(descriptor)
    descriptor = undefined
    renameSync(tempPath, vaultPath)
  } finally {
    if (descriptor !== undefined) closeSync(descriptor)
    if (existsSync(tempPath)) unlinkSync(tempPath)
  }
}

const parseVault = (filePath: string, masterPassword: string): VaultRoot => {
  const encrypted = JSON.parse(readFileSync(filePath, 'utf8')) as EncryptedPayload
  const data = JSON.parse(decryptVault(masterPassword, encrypted)) as VaultRoot
  if (data.version !== 1 || !data.settings || !Array.isArray(data.websites)) {
    throw new Error('密码库数据格式无效')
  }
  return data
}

const writeEncrypted = (masterPassword: string, data: VaultRoot, backupCurrent = true) => {
  const payload = encryptVault(masterPassword, JSON.stringify(data))
  atomicWrite(JSON.stringify(payload), backupCurrent)
}

const restoreBackup = (backupPath: string) => {
  const vaultPath = getVaultFilePath()
  copyFileSync(vaultPath, `${vaultPath}.corrupt-${Date.now()}-${randomBytes(4).toString('hex')}`)
  atomicWrite(readFileSync(backupPath, 'utf8'), false)
}

export const vaultExists = () => existsSync(getVaultFilePath())

export const initializeVault = (masterPassword: string) => {
  if (vaultExists()) throw new Error('密码库已存在')
  const data = defaultData()
  writeEncrypted(masterPassword, data, false)
  unlockedData = data
  currentMasterPassword = masterPassword
  return data
}

export const unlockVault = (masterPassword: string): UnlockResult => {
  if (!vaultExists()) throw new Error('密码库不存在')
  const data = parseVault(getVaultFilePath(), masterPassword)
  unlockedData = data
  currentMasterPassword = masterPassword
  return { data, recoveredFromBackup: false }
}

export const recoverVaultFromBackup = (masterPassword: string): UnlockResult => {
  if (!vaultExists()) throw new Error('密码库不存在')
  for (const backupPath of getBackupFiles()) {
    let data: VaultRoot
    try {
      data = parseVault(backupPath, masterPassword)
    } catch {
      continue
    }
    restoreBackup(backupPath)
    unlockedData = data
    currentMasterPassword = masterPassword
    return { data, recoveredFromBackup: true }
  }
  throw new Error('没有找到可用的密码库备份，请确认主密码是否正确')
}

export const lockVault = () => {
  unlockedData = null
  currentMasterPassword = null
}

export const getUnlockedData = () => {
  if (!unlockedData) throw new Error('未解锁')
  return unlockedData
}

export const saveUnlockedData = (data: VaultRoot) => {
  if (!currentMasterPassword) throw new Error('未解锁')
  writeEncrypted(currentMasterPassword, data)
  unlockedData = data
}

export const changeMasterPassword = (oldPassword: string, newPassword: string) => {
  const { data } = unlockVault(oldPassword)
  writeEncrypted(newPassword, data)
  createBackup()
  currentMasterPassword = newPassword
}
