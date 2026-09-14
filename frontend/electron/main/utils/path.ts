/** 路径工具：集中定义密码库及备份的落盘位置（均在系统 userData 目录下） */
import { app } from 'electron'
import { join } from 'node:path'

/** 密码库主文件路径：<userData>/vault.dat */
export const getVaultFilePath = () => join(app.getPath('userData'), 'vault.dat')

/** 密码库备份目录：<userData>/backups */
export const getVaultBackupDirectory = () => join(app.getPath('userData'), 'backups')
