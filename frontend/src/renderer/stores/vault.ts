/**
 * 密码库数据 store（渲染进程）
 *
 * 持有解锁后的密码库数据及 UI 相关的筛选/选中状态。
 * 所有写操作都遵循同一模式：深拷贝整库 → 修改副本 → persist 整库加密落盘，
 * 保证要么整体保存成功、要么保持原状，不会出现半新半旧的数据。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { v4 as uuid } from 'uuid'
import type { Account, AccountInput, Mailbox, MailboxInput, CategoryFilter, TrashItem, VaultRoot, Website } from '../types/vault'
import { normalizeMailbox } from '../utils/mailbox'

export const useVaultStore = defineStore('vault', () => {
  const data = ref<VaultRoot | null>(null)
  const selectedCategory = ref<CategoryFilter>('全部')
  const searchKeyword = ref('')
  const selectedWebsiteId = ref<string>('')
  const sortBy = ref<'updated' | 'name' | 'created'>('updated')
  const backupWarning = ref('')

  const setData = (next: VaultRoot) => {
    data.value = { ...next, mailboxes: next.mailboxes ?? [], trash: next.trash ?? [] }
    if (!selectedWebsiteId.value && next.websites[0]) selectedWebsiteId.value = next.websites[0].id
  }
  const clearData = () => { data.value = null; selectedWebsiteId.value = '' }

  const cloneVault = (value: VaultRoot): VaultRoot => JSON.parse(JSON.stringify(value)) as VaultRoot
  /** 每次写库前顺便清理过期项目，避免仅打开回收站时才触发清理。 */
  const pruneExpiredTrash = (value: VaultRoot) => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    value.trash = (value.trash ?? []).filter((item) => new Date(item.deletedAt).getTime() >= cutoff)
  }
  /** 唯一的数据提交入口：先让主进程加密落盘，成功后才替换内存状态。 */
  const persist = async (next: VaultRoot) => {
    pruneExpiredTrash(next)
    const payload = cloneVault(next)
    const result = await window.desktopApi.vault.saveData(payload)
    if (!result?.success) throw new Error(result?.error || '密码库写入失败')
    backupWarning.value = result.data?.backupWarning ?? ''
    data.value = payload
  }

  /** 全部网站（未筛选） */
  const websites = computed(() => data.value?.websites ?? [])
  /** 全部邮箱 */
  const mailboxes = computed(() => data.value?.mailboxes ?? [])
  /** 30 天内可恢复的删除记录，按删除时间从新到旧排列 */
  const trashItems = computed(() => [...(data.value?.trash ?? [])].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)))

  /** 回收站保存删除时的完整快照，恢复时无需依赖当前对象仍然存在。 */
  const moveToTrash = (next: VaultRoot, item: Omit<TrashItem, 'id' | 'deletedAt'>) => {
    next.trash ??= []
    next.trash.push({ ...item, id: uuid(), deletedAt: new Date().toISOString() })
  }

  /**
   * 按分类 + 关键词筛选网站，再按所选方式排序。
   * 关键词同时匹配：网站名、网址、备注、标签、各账号的用户名与备注。
   */
  const filteredWebsites = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase()
    let list = websites.value
    if (selectedCategory.value !== '全部') list = list.filter((x) => x.category === selectedCategory.value)
    if (keyword) {
      list = list.filter((w) =>
        [w.name, w.url, w.note, w.tags.join(' '), ...w.accounts.map((a) => `${a.username} ${a.note}`)]
          .join(' ').toLowerCase().includes(keyword)
      )
    }
    return [...list].sort((a, b) => {
      if (sortBy.value === 'name') return a.name.localeCompare(b.name, 'zh-CN')
      if (sortBy.value === 'created') return b.createdAt.localeCompare(a.createdAt)
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  })

  /** 当前选中的网站（仅在筛选结果中查找，选中项被筛选掉时返回 null） */
  const selectedWebsite = computed(() => filteredWebsites.value.find((x) => x.id === selectedWebsiteId.value) || null)

  /** 新增或编辑网站；不传 id 即为新增，成功后自动选中新网站 */
  const upsertWebsite = async (input: Pick<Website, 'name' | 'url' | 'category' | 'tags' | 'note' | 'icon'>, id?: string) => {
    if (!data.value) return undefined
    const next = cloneVault(data.value)
    const now = new Date().toISOString()
    if (!id) {
      const w: Website = { id: uuid(), createdAt: now, updatedAt: now, accounts: [], ...input }
      next.websites.push(w)
      await persist(next)
      selectedWebsiteId.value = w.id
      return w
    } else {
      const target = next.websites.find((x) => x.id === id)
      if (!target) return undefined
      Object.assign(target, input, { updatedAt: now })
      await persist(next)
      return target
    }
  }

  /** 删除网站（含其全部账号），删除后选中列表第一个网站 */
  const deleteWebsite = async (id: string) => {
    if (!data.value) return
    const next = cloneVault(data.value)
    const website = next.websites.find((x) => x.id === id)
    if (!website) return
    moveToTrash(next, { type: 'website', label: website.name, data: website })
    next.websites = next.websites.filter((x) => x.id !== id)
    await persist(next)
    selectedWebsiteId.value = next.websites[0]?.id || ''
  }

  /**
   * 新增或编辑账号，并在同一次事务中处理验证邮箱关联。
   * 选择“新邮箱”时先创建邮箱记录；默认账号始终保持同一网站下最多一个。
   */
  const upsertAccount = async (websiteId: string, payload: AccountInput, accountId?: string) => {
    if (!data.value) throw new Error('密码库未解锁')
    const next = cloneVault(data.value)
    const website = next.websites.find((x) => x.id === websiteId)
    if (!website) throw new Error('网站不存在')
    const { newMailbox, ...input } = payload
    const now = new Date().toISOString()
    if (newMailbox) {
      const normalized = normalizeMailbox(newMailbox)
      if (next.mailboxes?.some((m) => m.username.toLowerCase() === normalized.username.toLowerCase())) throw new Error('此邮箱已保存，请选择已有邮箱')
      const mailbox = { ...normalized, id: uuid(), createdAt: now, updatedAt: now }
      next.mailboxes ??= []
      next.mailboxes.push(mailbox)
      input.mailboxId = mailbox.id
    } else if (input.mailboxId && !next.mailboxes?.some((m) => m.id === input.mailboxId)) {
      throw new Error('验证邮箱不存在，请重新选择')
    }
    let savedAccountId = accountId
    if (!accountId) {
      const acct: Account = { id: uuid(), createdAt: now, updatedAt: now, ...input }
      website.accounts.push(acct)
      savedAccountId = acct.id
    } else {
      const target = website.accounts.find((x) => x.id === accountId)
      if (!target) return
      Object.assign(target, input, { updatedAt: now })
    }
    if (input.isDefault) website.accounts.forEach((a) => { if (a.id !== savedAccountId) a.isDefault = false })
    website.updatedAt = now
    await persist(next)
  }

  /** 删除账号时保留所属网站 ID，供回收站恢复到原网站。 */
  const deleteAccount = async (websiteId: string, accountId: string) => {
    if (!data.value) return
    const next = cloneVault(data.value)
    const website = next.websites.find((x) => x.id === websiteId)
    if (!website) return
    const account = website.accounts.find((x) => x.id === accountId)
    if (!account) return
    moveToTrash(next, { type: 'account', label: `${website.name} / ${account.username}`, websiteId, data: account })
    website.accounts = website.accounts.filter((x) => x.id !== accountId)
    website.updatedAt = new Date().toISOString()
    await persist(next)
  }

  /** 默认账号是网站级互斥状态，设置一个账号时同步取消其余账号。 */
  const setDefaultAccount = async (websiteId: string, accountId: string) => {
    if (!data.value) return
    const next = cloneVault(data.value)
    const website = next.websites.find((x) => x.id === websiteId)
    if (!website) return
    website.accounts.forEach((a) => { a.isDefault = a.id === accountId })
    website.updatedAt = new Date().toISOString()
    await persist(next)
  }

  /** 局部更新安全设置（自动锁定、剪贴板清空等） */
  const updateSettings = async (patch: Partial<VaultRoot['settings']>) => {
    if (!data.value) return
    const next = cloneVault(data.value)
    next.settings = { ...next.settings, ...patch }
    await persist(next)
  }

  /** 邮箱账号不区分大小写判重，避免同一邮箱因大小写不同被重复保存。 */
  const upsertMailbox = async (input: MailboxInput, id?: string) => {
    if (!data.value) throw new Error('密码库未解锁')
    const normalized = normalizeMailbox(input)
    const next = cloneVault(data.value)
    next.mailboxes ??= []
    if (next.mailboxes.some((m) => m.id !== id && m.username.toLowerCase() === normalized.username.toLowerCase())) throw new Error('此邮箱已保存，请编辑已有记录')
    const now = new Date().toISOString()
    if (id) {
      const target = next.mailboxes.find((m) => m.id === id)
      if (!target) throw new Error('邮箱不存在')
      Object.assign(target, normalized, { updatedAt: now })
    } else {
      next.mailboxes.push({ ...normalized, id: uuid(), createdAt: now, updatedAt: now })
    }
    await persist(next)
  }

  /** 删除邮箱；仍被账号关联时不允许删除，需先解除关联 */
  const deleteMailbox = async (id: string) => {
    if (!data.value) throw new Error('密码库未解锁')
    const next = cloneVault(data.value)
    if (next.websites.some((w) => w.accounts.some((a) => a.mailboxId === id))) throw new Error('此邮箱仍有关联账号，请先在账号中解除关联')
    const mailbox = (next.mailboxes ?? []).find((m) => m.id === id)
    if (!mailbox) return
    moveToTrash(next, { type: 'mailbox', label: mailbox.username, data: mailbox })
    next.mailboxes = (next.mailboxes ?? []).filter((m) => m.id !== id)
    await persist(next)
  }

  /**
   * 按删除类型恢复原始快照。
   * 账号依赖所属网站，因此网站不存在时必须先恢复网站，不能静默挂到别处。
   */
  const restoreTrashItem = async (id: string) => {
    if (!data.value) throw new Error('密码库未解锁')
    const next = cloneVault(data.value)
    const item = (next.trash ?? []).find((entry) => entry.id === id)
    if (!item) throw new Error('回收站记录不存在或已过期')

    if (item.type === 'website') {
      const website = item.data as Website
      if (next.websites.some((entry) => entry.id === website.id)) throw new Error('该网站已存在，无法重复恢复')
      next.websites.push(website)
      selectedWebsiteId.value = website.id
    } else if (item.type === 'account') {
      const website = next.websites.find((entry) => entry.id === item.websiteId)
      if (!website) throw new Error('请先恢复该账号所属的网站')
      const account = item.data as Account
      if (website.accounts.some((entry) => entry.id === account.id)) throw new Error('该账号已存在，无法重复恢复')
      website.accounts.push(account)
      website.updatedAt = new Date().toISOString()
      selectedWebsiteId.value = website.id
    } else {
      const mailbox = item.data as Mailbox
      next.mailboxes ??= []
      if (next.mailboxes.some((entry) => entry.id === mailbox.id)) throw new Error('该邮箱已存在，无法重复恢复')
      next.mailboxes.push(mailbox)
    }

    next.trash = (next.trash ?? []).filter((entry) => entry.id !== id)
    await persist(next)
  }

  /** 永久删除仅移除回收站快照，不再触碰已经删除的业务集合。 */
  const permanentlyDeleteTrashItem = async (id: string) => {
    if (!data.value) throw new Error('密码库未解锁')
    const next = cloneVault(data.value)
    next.trash = (next.trash ?? []).filter((entry) => entry.id !== id)
    await persist(next)
  }

  const clearBackupWarning = () => { backupWarning.value = '' }

  return { data, selectedCategory, searchKeyword, selectedWebsiteId, sortBy, backupWarning, websites, mailboxes, trashItems, filteredWebsites, selectedWebsite, setData, clearData, clearBackupWarning, upsertWebsite, deleteWebsite, upsertAccount, deleteAccount, setDefaultAccount, updateSettings, upsertMailbox, deleteMailbox, restoreTrashItem, permanentlyDeleteTrashItem }
})
