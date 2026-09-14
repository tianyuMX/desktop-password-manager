/** 渲染进程侧的 IPC 返回结构（与主进程 utils/result.ts 保持一致） */
export interface ApiResult<T> { success: boolean; data?: T; error?: string }
