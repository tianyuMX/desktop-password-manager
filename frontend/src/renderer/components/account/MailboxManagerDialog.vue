<template>
  <v-dialog :model-value="open" :persistent="busy" scrollable max-width="680" @update:model-value="!busy && $emit('close')">
    <v-card class="glass-card dialog-card">
      <v-card-title>邮箱管理</v-card-title>
      <v-card-text class="dialog-fields">
        <p>邮箱资料保存在加密密码库中，可供多个网站账号共用。</p>
        <template v-if="!editing">
          <v-btn color="primary" prepend-icon="$plus" @click="edit()">新增邮箱</v-btn>
          <p v-if="!vault.mailboxes.length">还没有邮箱，也可以在新增网站账号时一起添加。</p>
          <v-expansion-panels v-model="expandedId" variant="accordion" class="mailbox-panels">
          <v-expansion-panel v-for="mailbox in vault.mailboxes" :key="mailbox.id" :value="mailbox.id" class="mailbox-row" elevation="0">
            <v-expansion-panel-title>
              <div class="mailbox-summary">
                <strong>{{ mailbox.username }}</strong>
                <span>{{ usage(mailbox.id) }} 个关联账号 · {{ expandedId === mailbox.id ? '收起' : '查看关联' }}</span>
                <small>{{ mailbox.url }}</small>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <p v-if="!usage(mailbox.id)">此邮箱尚未关联任何网站账号。</p>
              <v-list v-else class="mailbox-links" bg-color="transparent" lines="two">
                <v-list-item v-for="link in linksByMailbox.get(mailbox.id)" :key="`${link.websiteId}-${link.accountId}`" :title="link.websiteName" :subtitle="`账号：${link.username}`">
                  <template #append>
                    <v-btn size="small" variant="text" :aria-label="`查看 ${link.websiteName} 的账号 ${link.username}`" @click="$emit('view-account', link.websiteId, link.accountId)">查看账号</v-btn>
                  </template>
                </v-list-item>
              </v-list>
            </v-expansion-panel-text>
            <div class="mailbox-actions">
              <v-btn size="small" variant="text" @click="openMailbox(mailbox.url)">打开邮箱</v-btn>
              <v-btn size="small" variant="text" @click="copy(mailbox.username, '已复制邮箱账号')">复制账号</v-btn>
              <v-btn size="small" variant="text" @click="copy(mailbox.password, '已复制邮箱密码')">复制密码</v-btn>
              <v-btn size="small" variant="text" @click="edit(mailbox)">编辑</v-btn>
              <v-btn :disabled="usage(mailbox.id) > 0 || busy" color="error" size="small" variant="text" @click="pendingDelete = mailbox.id">删除</v-btn>
            </div>
          </v-expansion-panel>
          </v-expansion-panels>
          <small v-if="vault.mailboxes.length">删除邮箱前，请先在关联账号中将“验证邮箱”改为“不关联邮箱”。</small>
        </template>
        <template v-else>
          <strong>{{ editingId ? '编辑邮箱' : '新增邮箱' }}</strong>
          <v-alert v-if="editingId && usage(editingId)" density="compact" type="info" variant="tonal">保存后，{{ usage(editingId) }} 个关联账号将使用更新后的邮箱资料。</v-alert>
          <fieldset :disabled="busy" class="mailbox-fields">
            <MailboxFields v-model:username="username" v-model:password="password" v-model:url="url" />
          </fieldset>
        </template>
        <v-alert v-if="error" density="compact" type="error" variant="tonal">{{ error }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn :disabled="busy" variant="outlined" @click="editing ? reset() : $emit('close')">{{ editing ? '取消编辑' : '关闭' }}</v-btn>
        <v-btn v-if="editing" :loading="busy" color="primary" @click="save">保存邮箱</v-btn>
      </v-card-actions>
    </v-card>
    <v-dialog :model-value="!!pendingDelete" :persistent="busy" max-width="420" @update:model-value="!busy && (pendingDelete = '')">
      <v-card title="删除邮箱" text="确认删除这条邮箱记录？">
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="busy" @click="pendingDelete = ''">取消</v-btn>
          <v-btn :loading="busy" color="error" @click="remove">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useVaultStore } from '../../stores/vault'
import { useClipboard } from '../../composables/useClipboard'
import type { Mailbox } from '../../types/vault'
import MailboxFields from './MailboxFields.vue'

const props = defineProps<{ open: boolean }>()
defineEmits<{ close: []; 'view-account': [websiteId: string, accountId: string] }>()
const vault = useVaultStore()
const { copy } = useClipboard()
const editing = ref(false)
const editingId = ref('')
const username = ref('')
const password = ref('')
const url = ref('')
const busy = ref(false)
const error = ref('')
const pendingDelete = ref('')
const expandedId = ref<string | undefined>()
const linksByMailbox = computed(() => {
  const links = new Map<string, { websiteId: string; websiteName: string; accountId: string; username: string }[]>()
  for (const website of vault.websites) {
    for (const account of website.accounts) {
      if (!account.mailboxId) continue
      const entries = links.get(account.mailboxId) ?? []
      entries.push({ websiteId: website.id, websiteName: website.name, accountId: account.id, username: account.username })
      links.set(account.mailboxId, entries)
    }
  }
  return links
})
const usage = (id: string) => linksByMailbox.value.get(id)?.length ?? 0
const reset = () => {
  editing.value = false
  expandedId.value = undefined
  editingId.value = username.value = password.value = url.value = error.value = pendingDelete.value = ''
}
watch(() => props.open, reset)
const edit = (mailbox?: Mailbox) => {
  editing.value = true
  editingId.value = mailbox?.id ?? ''
  username.value = mailbox?.username ?? ''
  password.value = mailbox?.password ?? ''
  url.value = mailbox?.url ?? ''
  error.value = ''
}
const save = async () => {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await vault.upsertMailbox({ username: username.value, password: password.value, url: url.value }, editingId.value || undefined)
    reset()
  } catch (e) { error.value = (e as Error).message }
  finally { busy.value = false }
}
const remove = async () => {
  if (busy.value) return
  busy.value = true
  try { await vault.deleteMailbox(pendingDelete.value); error.value = '' }
  catch (e) { error.value = (e as Error).message }
  finally { pendingDelete.value = ''; busy.value = false }
}
const openMailbox = async (value: string) => {
  try {
    const result = await window.desktopApi.app.openExternal(value)
    if (!result.success) throw new Error(result.error || '打开邮箱失败')
  } catch (e) { error.value = (e as Error).message }
}
</script>

<style scoped>
.mailbox-panels { gap: 12px; }
.mailbox-row { border: 1px solid #b5d5ee; border-radius: 12px !important; background: #edf7ff; }
.mailbox-actions { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 16px 12px; }
.mailbox-fields { display: grid; gap: 16px; border: 0; padding: 0; min-width: 0; }
.mailbox-summary { display: grid; gap: 8px; min-width: 0; padding-right: 12px; text-align: left; color: #174879; overflow-wrap: anywhere; }
.mailbox-summary span, .mailbox-summary small { font-size: 12px; color: #356997; }
.mailbox-links :deep(.v-list-item-title), .mailbox-links :deep(.v-list-item-subtitle) { white-space: normal; overflow-wrap: anywhere; -webkit-line-clamp: unset; }
</style>
