/**
 * 密码库服务（主进程）
 *
 * 管理密码库的完整生命周期：初始化、解锁/锁定、加密持久化、备份与恢复。
 *
 * 设计要点：
 * - 明文数据只存在于主进程内存（unlockedData），锁定时立即清空；
 * - 所有写盘操作先经 crypto-service 加密，并通过"临时文件 + rename"原子落盘，
 *   避免写一半崩溃导致密码库损坏；
 * - 每次覆盖写入前都会先备份旧文件（最多保留 MAX_BACKUPS 份），
 *   主文件损坏时可从备份逐个尝试恢复。
 */
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
import { persistVaultWithReadableBackup, writeSpreadsheetBackup } from './spreadsheet-backup-service'

import type { VaultRoot } from '../../../src/renderer/types/vault'
// 复用渲染进程的类型定义，保证主进程与渲染进程的数据结构一致
export type { Account, Website, WebsiteCategory, VaultSettings, VaultRoot } from '../../../src/renderer/types/vault'
/** 解锁结果：data 为解密后的密码库数据；recoveredFromBackup 标记是否来自备份恢复 */
export interface UnlockResult { data: VaultRoot; recoveredFromBackup: boolean }

// 备份保留上限，超出后按修改时间从旧到新清理
const MAX_BACKUPS = 10

/** 首次初始化时的默认密码库结构（默认开启各项安全策略） */
const defaultData = (): VaultRoot => ({
  version: 1,
  settings: { autoLockMinutes: 5, lockOnMinimize: true, clearClipboard: true, clearClipboardSeconds: 30, hidePasswordByDefault: true },
  websites: [],
  mailboxes: []
})

// ---- 主进程内存中的解锁状态（锁定时置空，避免明文常驻内存） ----
/** 解锁后的密码库明文数据 */
let unlockedData: VaultRoot | null = null
/** 当前会话的主密码（仅解锁期间保留，用于后续自动保存） */
let currentMasterPassword: string | null = null

/** 列出所有备份文件，按修改时间从新到旧排序 */
const getBackupFiles = () => {
  const backupDirectory = getVaultBackupDirectory()
  if (!existsSync(backupDirectory)) return []

  return readdirSync(backupDirectory)
    .filter((name) => /^vault-\d+-[a-f0-9]+\.dat$/.test(name))
    .map((name) => join(backupDirectory, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
}

/** 清理超出保留上限的旧备份 */
const pruneBackups = () => {
  for (const backupPath of getBackupFiles().slice(MAX_BACKUPS)) unlinkSync(backupPath)
}

/** 把当前密码库主文件复制一份到备份目录（文件名含时间戳 + 随机数防碰撞） */
const createBackup = () => {
  const vaultPath = getVaultFilePath()
  if (!existsSync(vaultPath)) return

  const backupDirectory = getVaultBackupDirectory()
  mkdirSync(backupDirectory, { recursive: true })
  const nonce = randomBytes(4).toString('hex')
  copyFileSync(vaultPath, join(backupDirectory, `vault-${Date.now()}-${nonce}.dat`))
  pruneBackups()
}

/**
 * 原子写入：先写临时文件（独占创建 + fsync 刷盘），再 rename 覆盖主文件。
 * rename 在同一文件系统上是原子操作，可保证任一时刻主文件要么是旧内容、
 * 要么是完整的新内容，绝不会出现写了一半的中间状态。
 */
const atomicWrite = (content: string, backupCurrent = true) => {
  const vaultPath = getVaultFilePath()
  // 临时文件名混入进程号、时间戳和随机数，避免并发冲突
  const tempPath = join(dirname(vaultPath), `.vault-${process.pid}-${Date.now()}-${randomBytes(4).toString('hex')}.tmp`)
  mkdirSync(dirname(vaultPath), { recursive: true })
  // 写入前先把旧主文件备份一份
  if (backupCurrent) createBackup()

  let descriptor: number | undefined
  try {
    descriptor = openSync(tempPath, 'wx', 0o600) // 独占创建，权限仅限当前用户
    writeFileSync(descriptor, content, 'utf8')
    fsyncSync(descriptor) // 强制刷盘，防止掉电丢失
    closeSync(descriptor)
    descriptor = undefined
    renameSync(tempPath, vaultPath) // 原子替换主文件
  } finally {
    // 无论成功与否都清理残留的临时文件和未关闭的句柄
    if (descriptor !== undefined) closeSync(descriptor)
    if (existsSync(tempPath)) unlinkSync(tempPath)
  }
}

/** 读取并解密密码库文件，校验数据格式后返回明文结构 */
const parseVault = (filePath: string, masterPassword: string): VaultRoot => {
  const encrypted = JSON.parse(readFileSync(filePath, 'utf8')) as EncryptedPayload
  const data = JSON.parse(decryptVault(masterPassword, encrypted)) as VaultRoot
  if (data.version !== 1 || !data.settings || !Array.isArray(data.websites)) {
    throw new Error('密码库数据格式无效')
  }
  return data
}

/** 将密码库数据加密后原子写入主文件 */
const writeEncrypted = (masterPassword: string, data: VaultRoot, backupCurrent = true) => {
  const payload = encryptVault(masterPassword, JSON.stringify(data))
  atomicWrite(JSON.stringify(payload), backupCurrent)
}

/**
 * 从备份恢复：先把当前（可能损坏的）主文件另存为 .corrupt-* 留档，
 * 再把备份内容原子写入主文件。不再额外备份，避免把损坏文件扩散到备份链。
 */
const restoreBackup = (backupPath: string) => {
  const vaultPath = getVaultFilePath()
  copyFileSync(vaultPath, `${vaultPath}.corrupt-${Date.now()}-${randomBytes(4).toString('hex')}`)
  atomicWrite(readFileSync(backupPath, 'utf8'), false)
}

/** 密码库主文件是否存在（用于区分"首次初始化"和"解锁"流程） */
export const vaultExists = () => existsSync(getVaultFilePath())

/** 首次初始化：用主密码创建带默认设置的空密码库，并直接进入解锁状态 */
export const initializeVault = async (masterPassword: string) => {
  if (vaultExists()) throw new Error('密码库已存在')
  const data = defaultData()
  writeEncrypted(masterPassword, data, false)
  await writeSpreadsheetBackup(data).catch(() => undefined)
  unlockedData = data
  currentMasterPassword = masterPassword
  return data
}

/** 正常解锁：读取主文件并解密，失败（密码错误/文件损坏）时抛出异常 */
export const unlockVault = (masterPassword: string): UnlockResult => {
  if (!vaultExists()) throw new Error('密码库不存在')
  const data = parseVault(getVaultFilePath(), masterPassword)
  unlockedData = data
  currentMasterPassword = masterPassword
  return { data, recoveredFromBackup: false }
}

/**
 * 从备份恢复解锁：主文件损坏导致正常解锁失败时的兜底方案。
 * 按时间从新到旧逐个尝试备份，找到第一个能用当前主密码解开的备份，
 * 将其恢复为主文件并进入解锁状态。
 */
export const recoverVaultFromBackup = async (masterPassword: string): Promise<UnlockResult> => {
  if (!vaultExists()) throw new Error('密码库不存在')
  for (const backupPath of getBackupFiles()) {
    let data: VaultRoot
    try {
      data = parseVault(backupPath, masterPassword)
    } catch {
      continue // 该备份无法用当前密码解开，尝试下一个
    }
    restoreBackup(backupPath)
    await writeSpreadsheetBackup(data).catch(() => undefined)
    unlockedData = data
    currentMasterPassword = masterPassword
    return { data, recoveredFromBackup: true }
  }
  throw new Error('没有找到可用的密码库备份，请确认主密码是否正确')
}

/** 锁定：清空内存中的明文数据和主密码 */
export const lockVault = () => {
  unlockedData = null
  currentMasterPassword = null
}

/** 获取当前解锁的密码库数据（未解锁时抛错） */
export const getUnlockedData = () => {
  if (!unlockedData) throw new Error('未解锁')
  return unlockedData
}

/** 保存密码库数据：用当前主密码重新加密并原子落盘 */
export const saveUnlockedData = async (data: VaultRoot) => {
  if (!currentMasterPassword) throw new Error('未解锁')
  const masterPassword = currentMasterPassword
  const result = await persistVaultWithReadableBackup(data, () => writeEncrypted(masterPassword, data))
  unlockedData = data
  return result
}

/** 修改主密码：用旧密码解锁确认身份后，以新密码重新加密整个密码库 */
export const changeMasterPassword = async (oldPassword: string, newPassword: string) => {
  const { data } = unlockVault(oldPassword)
  writeEncrypted(newPassword, data)
  createBackup()
  await writeSpreadsheetBackup(data).catch(() => undefined)
  currentMasterPassword = newPassword
}
