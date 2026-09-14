import ExcelJS from 'exceljs'
import { app } from 'electron'
import { dirname, join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import type { VaultRoot } from '../../../src/renderer/types/vault'

/**
 * 可读 Excel 备份服务。
 *
 * Excel 只用于人工查看和应急恢复，不参与应用读取；真正的数据源始终是
 * 加密后的 vault.dat。这里会包含明文密码，因此写入失败不能反过来破坏
 * 已经成功保存的主密码库。
 */
const PRODUCTION_SPREADSHEET_BACKUP_PATH = 'D:\\账号密码备份.xlsx'

/** 开发版备份隔离在 dev userData；正式版继续使用用户指定的 D 盘路径。 */
export const getSpreadsheetBackupPath = () => app.isPackaged
  ? PRODUCTION_SPREADSHEET_BACKUP_PATH
  : join(app.getPath('userData'), '账号密码备份.xlsx')

const titleFill = 'FF0B4F8A'
const headerFill = 'FF1479C9'
const stripeFill = 'FFEAF5FF'
const borderColor = 'FFB8D8F2'

/** 日期无效时保留原值，避免备份过程因一条旧数据而整体失败。 */
const formatDate = (value: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date)
}

/** 统一设置标题、表头、列宽和冻结区域，保证各数据表的结构一致。 */
const styleSheet = (sheet: ExcelJS.Worksheet, title: string, headers: string[], widths: number[]) => {
  sheet.mergeCells(1, 1, 1, headers.length)
  const titleCell = sheet.getCell(1, 1)
  titleCell.value = title
  titleCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 18 }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: titleFill } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
  sheet.getRow(1).height = 34

  sheet.mergeCells(2, 1, 2, headers.length)
  const subtitle = sheet.getCell(2, 1)
  subtitle.value = `自动备份时间：${formatDate(new Date().toISOString())}`
  subtitle.font = { color: { argb: 'FF4D6F8D' }, italic: true }
  sheet.getRow(2).height = 24

  const headerRow = sheet.getRow(4)
  headerRow.values = headers
  headerRow.height = 26
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerFill } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = { bottom: { style: 'thin', color: { argb: borderColor } } }
  })

  widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width })
  sheet.views = [{ state: 'frozen', ySplit: 4 }]
  sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: headers.length } }
}

/** 数据行从第 5 行开始；奇数行使用底色以提升长表格的可读性。 */
const styleDataRows = (sheet: ExcelJS.Worksheet, columnCount: number) => {
  for (let rowNumber = 5; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    row.height = 24
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      if (rowNumber % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: stripeFill } }
      cell.alignment = { vertical: 'middle', wrapText: columnNumber === 7 }
      cell.border = {
        bottom: { style: 'hair', color: { argb: borderColor } },
        right: columnNumber < columnCount ? { style: 'hair', color: { argb: borderColor } } : undefined
      }
    })
  }
  if (sheet.rowCount >= 5) {
    sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: sheet.rowCount, column: columnCount } }
  }
}

/**
 * 将当前密码库完整导出为一个工作簿。
 * 账号和邮箱拆分为两个工作表，账号表通过 mailboxId 显示关联邮箱账号。
 */
export const writeSpreadsheetBackup = async (vault: VaultRoot, outputPath = getSpreadsheetBackupPath()) => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = '密码保险箱'
  workbook.modified = new Date()

  const accounts = workbook.addWorksheet('账号密码', { properties: { defaultRowHeight: 22 } })
  const accountHeaders = ['网站名称', '网站地址', '分类', '账号', '密码', '验证邮箱', '备注', '默认账号', '标签', '更新时间']
  styleSheet(accounts, '账号密码备份', accountHeaders, [18, 32, 10, 24, 24, 24, 30, 12, 18, 20])
  // 先建立索引，避免为每个账号重复遍历整个邮箱列表。
  const mailboxById = new Map((vault.mailboxes ?? []).map((mailbox) => [mailbox.id, mailbox.username]))
  for (const website of vault.websites) {
    for (const account of website.accounts) {
      accounts.addRow([
        website.name,
        website.url,
        website.category,
        account.username,
        account.password,
        account.mailboxId ? mailboxById.get(account.mailboxId) ?? '关联邮箱已不存在' : '',
        account.note || website.note,
        account.isDefault ? '是' : '否',
        website.tags.join('、'),
        formatDate(account.updatedAt)
      ])
    }
  }
  styleDataRows(accounts, accountHeaders.length)

  const mailboxes = workbook.addWorksheet('邮箱信息', { properties: { defaultRowHeight: 22 } })
  const mailboxHeaders = ['邮箱账号', '邮箱密码', '登录地址', '更新时间']
  styleSheet(mailboxes, '验证邮箱备份', mailboxHeaders, [28, 26, 36, 20])
  for (const mailbox of vault.mailboxes ?? []) {
    mailboxes.addRow([mailbox.username, mailbox.password, mailbox.url, formatDate(mailbox.updatedAt)])
  }
  styleDataRows(mailboxes, mailboxHeaders.length)

  // 说明页明确标注备份为明文，降低用户把它误当成加密文件的风险。
  const instructions = workbook.addWorksheet('使用说明', { properties: { defaultRowHeight: 24 } })
  instructions.getColumn(1).width = 100
  instructions.mergeCells('A1:F1')
  instructions.getCell('A1').value = '密码保险箱 · 数据使用说明'
  instructions.getCell('A1').font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 18 }
  instructions.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: titleFill } }
  instructions.getRow(1).height = 36
  instructions.getCell('A3').value = '本文件由密码保险箱在每次保存数据时自动更新，内容未加密，请妥善保管。'
  instructions.getCell('A4').value = '主要数据文件仍是加密密码库，Excel 是便于查看和应急使用的额外副本。'
  instructions.getCell('A6').value = `加密密码库位置：${join(app.getPath('userData'), 'vault.dat')}（请勿删除）`
  instructions.getCell('A8').value = `Excel 备份位置：${outputPath}`
  instructions.getCell('A10').value = '误删账号、网站或邮箱时，请优先在应用的“回收站”中恢复；删除记录保留 30 天。'
  for (const rowNumber of [3, 4, 6, 8, 10]) {
    const cell = instructions.getCell(rowNumber, 1)
    cell.font = { size: 12, bold: rowNumber === 6 }
    cell.alignment = { vertical: 'middle', wrapText: true }
  }
  instructions.getCell('A6').font = { size: 12, bold: true, color: { argb: 'FFB4233A' } }

  // 正式版目标可能位于尚未创建的目录，写文件前确保父目录存在。
  const outputDirectory = dirname(outputPath)
  if (!existsSync(outputDirectory)) mkdirSync(outputDirectory, { recursive: true })
  await workbook.xlsx.writeFile(outputPath)
  return outputPath
}

export interface ReadableBackupResult {
  spreadsheetBackupPath: string
  backupWarning?: string
}

/** 主密码库是权威数据源；其写入成功后再刷新 Excel，Excel 失败只返回警告。 */
export const persistVaultWithReadableBackup = async (
  vault: VaultRoot,
  writeVault: () => void | Promise<void>,
  writeBackup: (data: VaultRoot) => Promise<string> = writeSpreadsheetBackup
): Promise<ReadableBackupResult> => {
  await writeVault()
  try {
    return { spreadsheetBackupPath: await writeBackup(vault) }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      spreadsheetBackupPath: getSpreadsheetBackupPath(),
      backupWarning: `账号密码已安全保存，但 Excel 备份失败：${message}`
    }
  }
}
