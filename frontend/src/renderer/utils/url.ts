/** URL 工具 */
/**
 * 校验输入是否为合法的 http/https 网址。
 * 空字符串视为合法（网址为可选项）；带协议前缀以外的
 * 普通文本（如 "abc"）会被 URL 构造器判为非法。
 */
export const isHttpUrl = (value: string) => {
  if (!value.trim()) return true
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch { return false }
}
