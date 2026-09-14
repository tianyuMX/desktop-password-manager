<template>
  <div class="app-stage">
    <section class="vault-window">
      <header class="window-header">
        <div class="brand-mark">
          <img class="brand-shield-image" :src="shieldIcon" alt="" />
          <div class="brand-copy">
            <h1>密码保险箱</h1>
            <p>{{ vault.websites.length }} 个网站 · {{ accountTotal }} 个账号</p>
          </div>
        </div>
        <div>
          <v-text-field
            v-model="vault.searchKeyword"
            class="header-search"
            density="compact"
            hide-details
            label="搜索网站/账号"
            prepend-inner-icon="$search"
            variant="outlined"
          />
        </div>
        <div class="header-actions">
          <v-btn class="icon-button" prepend-icon="$mail" variant="outlined" @click="mailboxDialog = true">邮箱管理</v-btn>
          <v-btn class="icon-button" prepend-icon="$recycle" variant="outlined" @click="trashDialog = true">
            回收站<span v-if="vault.trashItems.length">（{{ vault.trashItems.length }}）</span>
          </v-btn>
          <v-btn class="icon-button" prepend-icon="$logout" variant="outlined" @click="doLock">锁定</v-btn>
          <v-btn class="icon-button" prepend-icon="$settings" variant="outlined" @click="router.push('/settings')">设置</v-btn>
        </div>
      </header>

      <div class="layout">
        <SidebarCategories v-model="vault.selectedCategory" />
        <WebsiteList
          :items="vault.filteredWebsites"
          :selected-id="vault.selectedWebsiteId"
          :keyword="vault.searchKeyword"
          @update:keyword="vault.searchKeyword = $event"
          @select="vault.selectedWebsiteId = $event"
          @add="openAddSite"
          @lock="doLock"
          @settings="router.push('/settings')"
        />
        <div class="panel detail-shell">
          <EmptyState v-if="!vault.filteredWebsites.length" illustration="shield" text="暂无网站" />
          <EmptyState v-else-if="!vault.selectedWebsite" illustration="shield" text="请选择一个网站" />
          <WebsiteDetail
            v-else
            :website="vault.selectedWebsite"
            :mailboxes="vault.mailboxes"
            :highlighted-account-id="highlightedAccountId"
            :hide-by-default="vault.data?.settings.hidePasswordByDefault ?? true"
            @edit-site="openEditSite"
            @delete-site="confirmDeleteSite = true"
            @open-site="openSite"
            @copy-site-url="copy($event, '已复制网址')"
            @add-account="openAddAccount"
            @copy-username="copy($event, '已复制用户名')"
            @copy-password="copy($event, '已复制密码')"
            @edit-account="openEditAccount"
            @delete-account="onDeleteAccount"
            @set-default="vault.setDefaultAccount(vault.selectedWebsite!.id, $event)"
          />
        </div>
      </div>
    </section>

    <WebsiteFormDialog :open="siteDialog" :website="editingSite" @cancel="siteDialog = false" @save="onSaveSite" />
    <AccountFormDialog :open="accountDialog" :account="editingAccount" :mailboxes="vault.mailboxes" :saving="accountSaving" @cancel="accountDialog = false" @save="onSaveAccount" />
    <MailboxManagerDialog :open="mailboxDialog" @close="mailboxDialog = false" @view-account="viewLinkedAccount" />
    <TrashDialog :open="trashDialog" @close="trashDialog = false" />
    <ConfirmDialog :open="confirmDeleteSite" @cancel="confirmDeleteSite = false" @confirm="onDeleteSite">
      确认将网站及全部账号移入回收站？
    </ConfirmDialog>
    <ConfirmDialog :open="confirmDeleteAccount" @cancel="confirmDeleteAccount = false" @confirm="confirmDeleteAccountAction">
      确认将账号移入回收站？
    </ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 主界面布局
 *
 * 三栏结构：左侧分类侧边栏 + 中间网站列表 + 右侧网站详情。
 * 本组件承担所有弹窗（网站/账号/邮箱表单、删除确认）的编排，
 * 以及自动锁定（空闲计时 + 最小化）的接线。
 */
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import SidebarCategories from '../components/layout/SidebarCategories.vue'
import WebsiteList from '../components/layout/WebsiteList.vue'
import WebsiteDetail from '../components/layout/WebsiteDetail.vue'
import WebsiteFormDialog from '../components/website/WebsiteFormDialog.vue'
import AccountFormDialog from '../components/account/AccountFormDialog.vue'
import MailboxManagerDialog from '../components/account/MailboxManagerDialog.vue'
import TrashDialog from '../components/common/TrashDialog.vue'
import EmptyState from '../components/common/EmptyState.vue'
import ConfirmDialog from '../components/common/ConfirmDialog.vue'
import { useAuthStore } from '../stores/auth'
import { useVaultStore } from '../stores/vault'
import { useAppStore } from '../stores/app'
import { useClipboard } from '../composables/useClipboard'
import { useLockTimer } from '../composables/useLockTimer'
import type { AccountInput, Website } from '../types/vault'
import shieldIcon from '../assets/images/shield-icon.png'

const router = useRouter()
const auth = useAuthStore()
const vault = useVaultStore()
const app = useAppStore()
const { copy } = useClipboard()
const siteDialog = ref(false)
const accountDialog = ref(false)
const accountSaving = ref(false)
const mailboxDialog = ref(false)
const trashDialog = ref(false)
const highlightedAccountId = ref('')
/** 从邮箱管理跳转到关联账号：先撤销筛选，再选中并滚动到目标卡片。 */
const viewLinkedAccount = async (websiteId: string, accountId: string) => {
  vault.searchKeyword = ''
  vault.selectedCategory = '全部'
  vault.selectedWebsiteId = websiteId
  highlightedAccountId.value = accountId
  mailboxDialog.value = false
  await nextTick()
  document.getElementById(`account-${accountId}`)?.scrollIntoView({ block: 'center', behavior: 'instant' })
}
const editingSiteId = ref('')          // 正在编辑的网站 ID（空 = 新增）
const editingAccountId = ref('')       // 正在编辑的账号 ID（空 = 新增）
const confirmDeleteSite = ref(false)   // 删除网站确认弹窗
const confirmDeleteAccount = ref(false) // 删除账号确认弹窗
const pendingDeleteAccountId = ref('') // 待删除的账号 ID

/** 当前编辑的网站对象（新增时为 null） */
const editingSite = computed(() => vault.websites.find((x) => x.id === editingSiteId.value) ?? null)
/** 当前编辑的账号对象（新增时为 null） */
const editingAccount = computed(() => vault.selectedWebsite?.accounts.find((x) => x.id === editingAccountId.value) ?? null)
/** 所有网站的账号总数（头部统计） */
const accountTotal = computed(() => vault.websites.reduce((sum, site) => sum + site.accounts.length, 0))

// 空闲自动锁定：无操作 N 分钟后锁定；最小化时由主进程通知、按设置决定是否锁定
useLockTimer(vault.data?.settings.autoLockMinutes ?? 5, async () => { await doLock() })
onMounted(() => window.desktopApi.app.onAutoLock(async () => {
  if (vault.data?.settings.lockOnMinimize) await doLock()
}))

/** 锁定：通知主进程清密文 → 清空本地状态 → 回到解锁页 */
const doLock = async () => {
  await auth.lock()
  vault.clearData()
  await router.push('/unlock')
}

const openSite = async (url: string) => {
  const res = await window.desktopApi.app.openExternal(url)
  if (!res.success) app.showToast(res.error || '打开失败')
}

// ---- 弹窗开关辅助：打开前先清空编辑 ID 即为"新增"模式 ----

const openAddSite = () => {
  editingSiteId.value = ''
  siteDialog.value = true
}

const openEditSite = () => {
  editingSiteId.value = vault.selectedWebsite?.id || ''
  siteDialog.value = true
}

const openAddAccount = () => {
  editingAccountId.value = ''
  accountDialog.value = true
}

const openEditAccount = (id: string) => {
  editingAccountId.value = id
  accountDialog.value = true
}

type WebsiteFormPayload = Pick<Website, 'name' | 'url' | 'category' | 'tags' | 'note' | 'icon'>

const onSaveSite = async (payload: WebsiteFormPayload) => {
  try {
    await vault.upsertWebsite(payload, editingSiteId.value || undefined)
    siteDialog.value = false
    editingSiteId.value = ''
  } catch (error) {
    app.showToast(`保存失败：${(error as Error).message}`)
  }
}

const onDeleteSite = async () => {
  if (!vault.selectedWebsite) return
  await vault.deleteWebsite(vault.selectedWebsite.id)
  confirmDeleteSite.value = false
}

/** 账号表单提交：带防重复提交保护，保存期间禁用表单交互 */
const onSaveAccount = async (payload: AccountInput) => {
  if (accountSaving.value) return
  if (!vault.selectedWebsite) {
    accountDialog.value = false
    app.showToast('请先选择网站')
    return
  }

  accountSaving.value = true
  try {
    await vault.upsertAccount(vault.selectedWebsite.id, payload, editingAccountId.value || undefined)
    accountDialog.value = false
    editingAccountId.value = ''
  } catch (error) {
    app.showToast(`保存失败：${(error as Error).message}`)
  } finally {
    accountSaving.value = false
  }
}

const onDeleteAccount = (id: string) => {
  pendingDeleteAccountId.value = id
  confirmDeleteAccount.value = true
}

/** 二次确认后才执行软删除，pending ID 用来跨越两个弹窗事件保存目标。 */
const confirmDeleteAccountAction = async () => {
  if (!vault.selectedWebsite) return
  await vault.deleteAccount(vault.selectedWebsite.id, pendingDeleteAccountId.value)
  confirmDeleteAccount.value = false
}
</script>
