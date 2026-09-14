/**
 * 密码库数据类型定义
 *
 * 这些结构同时被主进程（加密落盘的载荷）和渲染进程（UI 展示）使用，
 * 是整个应用的数据契约；修改字段需同时考虑旧数据的兼容性。
 */

/** 网站分类：工作 / 个人 */
export type WebsiteCategory = '工作' | '个人'
/** 侧边栏分类筛选：具体分类或"全部" */
export type CategoryFilter = WebsiteCategory | '全部'

/** 网站下的一个登录账号 */
export interface Account {
  id: string
  username: string
  password: string
  note: string
  /** 是否为该网站的默认账号（每个网站至多一个） */
  isDefault: boolean
  /** 关联的验证邮箱 ID（对应 Mailbox.id），可选 */
  mailboxId?: string
  createdAt: string
  updatedAt: string
}

/** 验证邮箱（可被多个网站账号共用的邮箱凭证） */
export interface Mailbox {
  id: string
  username: string
  password: string
  /** 邮箱网页登录地址 */
  url: string
  createdAt: string
  updatedAt: string
}

/** 新建邮箱时的用户输入（不含 id 与时间戳） */
export type MailboxInput = Pick<Mailbox, 'username' | 'password' | 'url'>
/** 新建/编辑账号时的输入，可附带一个待新建的邮箱 */
export type AccountInput = Pick<Account, 'username' | 'password' | 'note' | 'isDefault' | 'mailboxId'> & { newMailbox?: MailboxInput }

/** 一个网站条目（含其下所有账号） */
export interface Website {
  id: string
  name: string
  url: string
  category: WebsiteCategory
  tags: string[]
  note: string
  /** 网站图标（base64 DataURL，保存在加密库内） */
  icon?: string
  createdAt: string
  updatedAt: string
  accounts: Account[]
}

/** 密码库安全设置（随密码库一起加密存储） */
export interface VaultSettings {
  /** 无操作自动锁定分钟数，0 表示禁用 */
  autoLockMinutes: number
  /** 窗口最小化时是否自动锁定 */
  lockOnMinimize: boolean
  /** 复制密码后是否自动清空剪贴板 */
  clearClipboard: boolean
  /** 剪贴板自动清空延迟秒数 */
  clearClipboardSeconds: number
  /** 密码默认是否隐藏显示 */
  hidePasswordByDefault: boolean
}

export type TrashItemType = 'website' | 'account' | 'mailbox'

/** 回收站条目：保留被删除对象的完整副本，30 天内可恢复 */
export interface TrashItem {
  id: string
  type: TrashItemType
  label: string
  deletedAt: string
  /** 账号恢复时用于定位原网站 */
  websiteId?: string
  data: Website | Account | Mailbox
}

/** 密码库根结构：整个 vault.dat 解密后的 JSON 形态 */
export interface VaultRoot { version: 1; settings: VaultSettings; websites: Website[]; mailboxes?: Mailbox[]; trash?: TrashItem[] }

/** 解锁接口的返回：data 为密码库数据，recoveredFromBackup 标记是否来自备份恢复 */
export interface VaultUnlockResult { data: VaultRoot; recoveredFromBackup: boolean }
