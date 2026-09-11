import { app } from 'electron'
import { join } from 'node:path'

export const getVaultFilePath = () => join(app.getPath('userData'), 'vault.dat')

export const getVaultBackupDirectory = () => join(app.getPath('userData'), 'backups')
