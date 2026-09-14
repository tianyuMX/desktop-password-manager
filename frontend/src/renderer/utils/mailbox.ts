/** 邮箱工具：输入规范化与脱敏展示 */
import type { MailboxInput } from '../types/vault'

/**
 * 校验并规范化邮箱输入：
 * - 用户名必须是完整邮箱格式；
 * - 密码、网页登录地址不能为空；
 * - 登录地址未写协议时自动补 https://，且只允许 http/https、
 *   域名必须包含点号、不允许携带用户名密码（防止奇怪的 URL 注入）。
 * 校验失败直接抛出带中文提示的错误。
 */
export const normalizeMailbox = (input: MailboxInput): MailboxInput => {
  const username = input.username.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) throw new Error('请输入完整的邮箱账号')
  if (!input.password.trim()) throw new Error('邮箱密码不能为空')
  let url = input.url.trim()
  if (!url) throw new Error('请输入邮箱网页登录地址')
  // 未带协议时默认补 https://
  if (!/^[a-z][a-z\d+.-]*:/i.test(url)) url = `https://${url}`
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes('.') || parsed.username || parsed.password) throw new Error()
    url = parsed.href
  } catch { throw new Error('邮箱网页登录地址须为有效的 HTTP 或 HTTPS 网址') }
  return { username, password: input.password, url }
}

/** 邮箱账号脱敏：只保留前缀前 2 个字符 + 域名，中间用圆点遮盖 */
export const maskEmail = (email: string) => {
  const at = email.lastIndexOf('@')
  return at > 0 ? `${email.slice(0, Math.min(2, at))}••••${email.slice(at)}` : '••••'
}
