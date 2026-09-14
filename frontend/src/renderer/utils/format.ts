/** 把 ISO 时间字符串格式化为本地化日期时间（如 2026/9/11 17:30:00） */
export const formatTime = (iso: string) => new Date(iso).toLocaleString('zh-CN')
