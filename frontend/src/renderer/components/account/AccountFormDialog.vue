<template>
  <v-dialog :model-value="open" :persistent="saving" scrollable max-width="560" @update:model-value="onDialogUpdate">
    <v-card class="glass-card dialog-card">
      <v-card-title>{{ editing ? '编辑账号' : '新增账号' }}</v-card-title>
      <v-card-text class="dialog-fields" :class="{ 'form-saving': saving }">
        <v-text-field v-model="username" density="comfortable" hide-details label="用户名/邮箱" prepend-inner-icon="$account" variant="outlined" />
        <v-text-field v-model="password" density="comfortable" hide-details label="密码" prepend-inner-icon="$key" type="password" variant="outlined" />
        <v-textarea v-model="note" auto-grow density="comfortable" hide-details label="备注" prepend-inner-icon="$note" rows="3" variant="outlined" />
        <v-select v-model="mailboxId" :items="mailboxOptions" density="comfortable" hide-details label="验证邮箱（可选）" variant="outlined" />
        <template v-if="mailboxId === '__new__'">
          <small>邮箱账号已按网站账号预填，请确认。邮箱和网站账号会一起保存。</small>
          <MailboxFields v-model:username="mailUsername" v-model:password="mailPassword" v-model:url="mailUrl" />
        </template>
        <small v-else-if="mailboxId">邮箱资料统一保存在“邮箱管理”中，修改一次即可用于所有关联账号。</small>
        <v-checkbox v-model="isDefault" density="comfortable" hide-details label="设为默认账号" />
        <v-alert v-if="error" density="compact" type="error" variant="tonal">{{ error }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn :disabled="saving" variant="outlined" @click="$emit('cancel')">取消</v-btn>
        <v-btn :loading="saving" color="primary" prepend-icon="$complete" @click="submit">保存</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
/**
 * 账号 新增/编辑 弹窗
 *
 * 除用户名/密码/备注外，还支持关联"验证邮箱"：
 * - 可选择已有邮箱；
 * - 或选"新增验证邮箱"，此时若用户名本身是邮箱地址会自动预填，
 *   邮箱会与账号一起保存（由 store 的 upsertAccount 处理）。
 * 选择 "__new__" 哨兵值表示新建邮箱。
 */
import { computed, ref, watch } from 'vue'
import type { Account, AccountInput, Mailbox } from '../../types/vault'
import MailboxFields from './MailboxFields.vue'
import { normalizeMailbox } from '../../utils/mailbox'

const props = defineProps<{ open: boolean; account?: Account | null; mailboxes: Mailbox[]; saving: boolean }>()
const emit = defineEmits<{ cancel: []; save: [payload: AccountInput] }>()
// ---- 邮箱关联表单状态 ----
const mailboxId = ref('')            // 选中的邮箱 ID；'' 不关联，'__new__' 新建
const mailUsername = ref('')
const mailPassword = ref('')
const mailUrl = ref('')
/** 邮箱下拉选项：不关联 + 已有邮箱列表 + 新增入口（哨兵值 __new__） */
const mailboxOptions = computed(() => [
  { title: '不关联邮箱', value: '' },
  ...props.mailboxes.map((m) => ({ title: m.username, value: m.id })),
  { title: '＋ 新增验证邮箱', value: '__new__' }
])
// 选"新增邮箱"且账号用户名本身是邮箱时，自动预填邮箱账号
watch(mailboxId, (id) => {
  if (id === '__new__' && !mailUsername.value) mailUsername.value = username.value.includes('@') ? username.value : ''
})
// ---- 账号表单状态 ----
const username = ref('')
const password = ref('')
const note = ref('')
const isDefault = ref(false)
const error = ref('')
const editing = ref(false)

// 弹窗打开时按传入账号回填（未传 = 新增模式）
watch(() => props.open, () => {
  const account = props.open ? props.account : null
  editing.value = !!account
  username.value = account?.username ?? ''
  password.value = account?.password ?? ''
  note.value = account?.note ?? ''
  isDefault.value = account?.isDefault ?? false
  error.value = ''
  mailboxId.value = account?.mailboxId ?? ''
  mailUsername.value = ''
  mailPassword.value = ''
  mailUrl.value = ''
})

const onDialogUpdate = (value: boolean) => {
  if (!value) emit('cancel')
}

/**
 * 提交：校验必填项 → 若选择新建邮箱则先做邮箱规范化/查重（失败就地提示）
 * → 把表单值抛给父组件。保存中的防重由 saving prop + 父组件共同控制。
 */
const submit = () => {
  if (props.saving) return
  error.value = ''
  if (!username.value.trim()) {
    error.value = '用户名不能为空'
    return
  }
  if (!password.value.trim()) {
    error.value = '密码不能为空'
    return
  }

  try {
    const newMailbox = mailboxId.value === '__new__' ? normalizeMailbox({ username: mailUsername.value, password: mailPassword.value, url: mailUrl.value }) : undefined
    if (newMailbox && props.mailboxes.some((m) => m.username.toLowerCase() === newMailbox.username.toLowerCase())) throw new Error('此邮箱已保存，请选择已有邮箱')
    emit('save', { username: username.value.trim(), password: password.value, note: note.value.trim(), isDefault: isDefault.value,
      mailboxId: mailboxId.value === '__new__' ? '' : mailboxId.value, newMailbox })
  } catch (e) { error.value = (e as Error).message }
}
</script>

<style scoped>
/* 保存中禁用表单交互，防止重复提交 */
.form-saving { pointer-events: none; }
</style>
