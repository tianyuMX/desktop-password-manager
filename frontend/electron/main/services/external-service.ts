import { shell } from 'electron'

const isSafeHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export const openExternalUrl = async (url: string) => {
  if (!isSafeHttpUrl(url)) throw new Error('非法 URL')
  await shell.openExternal(url)
}
