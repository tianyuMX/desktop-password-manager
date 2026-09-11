import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { v4 as uuid } from 'uuid'
import type { Account, AccountInput, MailboxInput, CategoryFilter, VaultRoot, Website } from '../types/vault'
import { normalizeMailbox } from '../utils/mailbox'

export const useVaultStore = defineStore('vault', () => {
  const data = ref<VaultRoot | null>(null)
  const selectedCategory = ref<CategoryFilter>('全部')
  const searchKeyword = ref('')
  const selectedWebsiteId = ref<string>('')
  const sortBy = ref<'updated' | 'name' | 'created'>('updated')

  const setData = (next: VaultRoot) => { data.value = next; if (!selectedWebsiteId.value && next.websites[0]) selectedWebsiteId.value = next.websites[0].id }
  const clearData = () => { data.value = null; selectedWebsiteId.value = '' }

  const cloneVault = (value: VaultRoot): VaultRoot => JSON.parse(JSON.stringify(value)) as VaultRoot
  const persist = async (next: VaultRoot) => {
    const payload = cloneVault(next)
    const result = await window.desktopApi.vault.saveData(payload)
    if (!result?.success) throw new Error(result?.error || '密码库写入失败')
    data.value = payload
  }

  const websites = computed(() => data.value?.websites ?? [])
  const mailboxes = computed(() => data.value?.mailboxes ?? [])
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

  const selectedWebsite = computed(() => filteredWebsites.value.find((x) => x.id === selectedWebsiteId.value) || null)

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

  const deleteWebsite = async (id: string) => {
    if (!data.value) return
    const next = cloneVault(data.value)
    next.websites = next.websites.filter((x) => x.id !== id)
    await persist(next)
    selectedWebsiteId.value = next.websites[0]?.id || ''
  }

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

  const deleteAccount = async (websiteId: string, accountId: string) => {
    if (!data.value) return
    const next = cloneVault(data.value)
    const website = next.websites.find((x) => x.id === websiteId)
    if (!website) return
    website.accounts = website.accounts.filter((x) => x.id !== accountId)
    website.updatedAt = new Date().toISOString()
    await persist(next)
  }

  const setDefaultAccount = async (websiteId: string, accountId: string) => {
    if (!data.value) return
    const next = cloneVault(data.value)
    const website = next.websites.find((x) => x.id === websiteId)
    if (!website) return
    website.accounts.forEach((a) => { a.isDefault = a.id === accountId })
    website.updatedAt = new Date().toISOString()
    await persist(next)
  }

  const updateSettings = async (patch: Partial<VaultRoot['settings']>) => {
    if (!data.value) return
    const next = cloneVault(data.value)
    next.settings = { ...next.settings, ...patch }
    await persist(next)
  }

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

  const deleteMailbox = async (id: string) => {
    if (!data.value) throw new Error('密码库未解锁')
    const next = cloneVault(data.value)
    if (next.websites.some((w) => w.accounts.some((a) => a.mailboxId === id))) throw new Error('此邮箱仍有关联账号，请先在账号中解除关联')
    next.mailboxes = (next.mailboxes ?? []).filter((m) => m.id !== id)
    await persist(next)
  }

  return { data, selectedCategory, searchKeyword, selectedWebsiteId, sortBy, websites, mailboxes, filteredWebsites, selectedWebsite, setData, clearData, upsertWebsite, deleteWebsite, upsertAccount, deleteAccount, setDefaultAccount, updateSettings, upsertMailbox, deleteMailbox }
})
