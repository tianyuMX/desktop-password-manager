/**
 * IPC 统一返回结构（主进程 → 渲染进程）
 *
 * 所有 ipcMain.handle 的返回值都用该结构包装，
 * 渲染进程通过 success 字段判断成败，避免异常跨进程传播。
 */
export interface ApiResult<T> {
  /** 是否成功 */
  success: boolean
  /** 成功时的返回数据 */
  data?: T
  /** 失败时的错误提示文案 */
  error?: string
}

/** 包装成功结果 */
export const ok = <T>(data: T): ApiResult<T> => ({ success: true, data })
/** 包装失败结果 */
export const fail = (error: string): ApiResult<never> => ({ success: false, error })
