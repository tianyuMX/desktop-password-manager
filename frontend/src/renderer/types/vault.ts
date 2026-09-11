export type WebsiteCategory = '工作' | '个人'
export type CategoryFilter = WebsiteCategory | '全部'
export interface Account { id: string; username: string; password: string; note: string; isDefault: boolean; mailboxId?: string; createdAt: string; updatedAt: string }
export interface Mailbox { id: string; username: string; password: string; url: string; createdAt: string; updatedAt: string }
export type MailboxInput = Pick<Mailbox, 'username' | 'password' | 'url'>
export type AccountInput = Pick<Account, 'username' | 'password' | 'note' | 'isDefault' | 'mailboxId'> & { newMailbox?: MailboxInput }
export interface Website { id: string; name: string; url: string; category: WebsiteCategory; tags: string[]; note: string; icon?: string; createdAt: string; updatedAt: string; accounts: Account[] }
export interface VaultSettings { autoLockMinutes: number; lockOnMinimize: boolean; clearClipboard: boolean; clearClipboardSeconds: number; hidePasswordByDefault: boolean }
export interface VaultRoot { version: 1; settings: VaultSettings; websites: Website[]; mailboxes?: Mailbox[] }
export interface VaultUnlockResult { data: VaultRoot; recoveredFromBackup: boolean }
