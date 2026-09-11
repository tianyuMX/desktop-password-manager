import type { MailboxInput } from '../types/vault'

export const normalizeMailbox = (input: MailboxInput): MailboxInput => {
  const username = input.username.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) throw new Error('请输入完整的邮箱账号')
  if (!input.password.trim()) throw new Error('邮箱密码不能为空')
  let url = input.url.trim()
  if (!url) throw new Error('请输入邮箱网页登录地址')
  if (!/^[a-z][a-z\d+.-]*:/i.test(url)) url = `https://${url}`
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes('.') || parsed.username || parsed.password) throw new Error()
    url = parsed.href
  } catch { throw new Error('邮箱网页登录地址须为有效的 HTTP 或 HTTPS 网址') }
  return { username, password: input.password, url }
}

export const maskEmail = (email: string) => {
  const at = email.lastIndexOf('@')
  return at > 0 ? `${email.slice(0, Math.min(2, at))}••••${email.slice(at)}` : '••••'
}
