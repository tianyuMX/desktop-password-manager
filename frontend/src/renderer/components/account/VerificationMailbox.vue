<template>
  <div class="verification-mailbox">
    <template v-if="mailbox">
      <div><span>验证邮箱</span><strong>{{ maskEmail(mailbox.username) }}</strong></div>
      <small>需要邮箱验证码时，打开邮箱查看邮件。</small>
      <div class="mailbox-shortcuts">
        <v-btn prepend-icon="$web" size="small" variant="outlined" @click="$emit('open', mailbox.url)">打开邮箱</v-btn>
        <v-btn prepend-icon="$copy" size="small" variant="text" @click="copy(mailbox.username, '已复制邮箱账号')">复制邮箱账号</v-btn>
        <v-btn prepend-icon="$copy" size="small" variant="text" @click="copy(mailbox.password, '已复制邮箱密码')">复制邮箱密码</v-btn>
      </div>
    </template>
    <small v-else>关联邮箱不存在，请编辑账号重新选择验证邮箱。</small>
  </div>
</template>

<script setup lang="ts">
/** 账号卡片内的"验证邮箱"区块：脱敏展示邮箱账号，提供打开邮箱/复制账号/复制密码快捷操作 */
import type { Mailbox } from '../../types/vault'
import { maskEmail } from '../../utils/mailbox'
import { useClipboard } from '../../composables/useClipboard'
defineProps<{ mailbox?: Mailbox }>()
defineEmits<{ open: [url: string] }>()
const { copy } = useClipboard()
</script>

<style scoped>
.verification-mailbox { display: grid; gap: 10px; padding: 14px; background: #edf7ff; border: 1px solid #b5d5ee; border-radius: 12px; }
.verification-mailbox strong { margin-left: 14px; overflow-wrap: anywhere; }
.verification-mailbox small { color: #56718d; }
.mailbox-shortcuts { display: flex; flex-wrap: wrap; gap: 6px; }
</style>
