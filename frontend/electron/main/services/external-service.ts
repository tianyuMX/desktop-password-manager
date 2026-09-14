/**
 * 外部链接服务（主进程）
 *
 * 负责在系统默认浏览器中打开外部 URL。
 * 出于安全考虑，仅允许 http/https 协议，
 * 防止 file:、javascript: 等危险协议被注入执行。
 */
import { shell } from 'electron'

/** 校验 URL 是否为安全的 http/https 链接 */
const isSafeHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** 用系统默认浏览器打开 URL；非法 URL 直接抛错 */
export const openExternalUrl = async (url: string) => {
  if (!isSafeHttpUrl(url)) throw new Error('非法 URL')
  await shell.openExternal(url)
}
