export interface ApiResult<T> {
  success: boolean
  data?: T
  error?: string
}

export const ok = <T>(data: T): ApiResult<T> => ({ success: true, data })
export const fail = (error: string): ApiResult<never> => ({ success: false, error })
