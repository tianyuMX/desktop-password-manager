<template>
  <div v-if="website" class="detail-view">
    <header class="detail-header">
      <v-avatar class="detail-logo" size="66">
        <img v-if="website.icon" class="website-logo-image" :src="website.icon" alt="" />
        <template v-else>{{ logoText(website.name) }}</template>
      </v-avatar>
      <div class="detail-title">
        <h2>{{ website.name }}</h2>
        <p>{{ website.url || '无网址' }}</p>
        <div class="strength-row">
          <v-progress-linear
            class="strength-meter"
            color="success"
            height="7"
            rounded
            :model-value="strengthScore * 20"
          />
          <strong>{{ strengthLabel }}</strong>
        </div>
      </div>
      <div class="detail-actions">
        <v-btn v-if="website.url" class="icon-button" prepend-icon="$web" variant="outlined" @click="$emit('open-site', website.url)">打开网站</v-btn>
        <v-btn class="icon-button" prepend-icon="$edit" variant="outlined" @click="$emit('edit-site')">编辑</v-btn>
        <v-btn class="icon-button danger-button" color="error" prepend-icon="$delete" variant="outlined" @click="$emit('delete-site')">删除</v-btn>
      </div>
    </header>

    <section class="field-group">
      <v-card class="field-card glass-card" flat>
        <span>网站地址</span>
        <div>
          <strong>{{ website.url || '无网址' }}</strong>
          <v-btn v-if="website.url" class="field-action" prepend-icon="$copy" size="small" variant="text" @click="$emit('copy-site-url', website.url)">复制</v-btn>
        </div>
      </v-card>
      <v-card class="field-card glass-card" flat>
        <span>分类与标签</span>
        <div class="category-tags">
          <v-chip color="primary" size="small" variant="tonal">{{ website.category }}</v-chip>
          <v-chip v-for="tag in website.tags" :key="tag" color="primary" size="small" variant="tonal">{{ tag }}</v-chip>
          <small v-if="!website.tags.length">暂无标签</small>
        </div>
      </v-card>
      <v-card class="field-card note-card glass-card" flat>
        <span>备注</span>
        <div>
          <strong>{{ website.note || '无备注' }}</strong>
        </div>
      </v-card>
    </section>

    <div class="section-heading">
      <h3>账号</h3>
      <v-btn class="primary-button" color="primary" prepend-icon="$plus" @click="$emit('add-account')">新增账号</v-btn>
    </div>

    <section class="accounts-stack">
      <v-card v-for="account in sortedAccounts" :id="`account-${account.id}`" :key="account.id" class="account-card glass-card" :class="{ 'linked-account-highlight': account.id === highlightedAccountId }" flat>
        <div class="account-head">
          <div>
            <strong>{{ account.username }}</strong>
            <v-chip v-if="account.isDefault" color="success" size="small" variant="tonal">默认</v-chip>
          </div>
          <small>更新于 {{ formatDate(account.updatedAt) }}</small>
        </div>

        <v-card class="field-card compact glass-card" flat>
          <span>用户名</span>
          <div>
            <strong>{{ account.username }}</strong>
            <v-btn class="field-action" prepend-icon="$copy" size="small" variant="text" @click="$emit('copy-username', account.username)">复制</v-btn>
          </div>
        </v-card>
        <v-card class="field-card compact glass-card" flat>
          <span>密码</span>
          <div>
            <strong class="password-text">{{ visible[account.id] ? account.password : maskedPassword }}</strong>
            <v-btn
              class="field-action"
              :prepend-icon="visible[account.id] ? '$eyeOff' : '$eye'"
              size="small"
              variant="text"
              @click="visible[account.id] = !visible[account.id]"
            >
              {{ visible[account.id] ? '隐藏' : '显示' }}
            </v-btn>
            <v-btn class="field-action" prepend-icon="$copy" size="small" variant="text" @click="$emit('copy-password', account.password)">复制</v-btn>
          </div>
        </v-card>
        <v-card v-if="account.note" class="field-card compact glass-card" flat>
          <span>备注</span>
          <div><strong>{{ account.note }}</strong></div>
        </v-card>

        <VerificationMailbox v-if="account.mailboxId" :mailbox="mailboxById.get(account.mailboxId)" @open="$emit('open-site', $event)" />
        <div class="account-actions">
          <v-btn class="ghost-button" prepend-icon="$edit" variant="outlined" @click="$emit('edit-account', account.id)">编辑</v-btn>
          <v-btn v-if="!account.isDefault" class="ghost-button" prepend-icon="$success" variant="outlined" @click="$emit('set-default', account.id)">设为默认</v-btn>
          <v-btn class="danger-button" color="error" prepend-icon="$delete" variant="outlined" @click="$emit('delete-account', account.id)">删除</v-btn>
        </div>
      </v-card>
      <div v-if="!website.accounts.length" class="empty account-empty">
        <v-icon icon="$account" size="36" />
        <span>暂无账号</span>
      </div>
    </section>

    <footer class="detail-foot">
      <span>创建时间 {{ formatDate(website.createdAt) }}</span>
      <span>最后更新 {{ formatDate(website.updatedAt) }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
/**
 * 右侧网站详情面板
 *
 * 展示选中网站的基本信息、密码强度条、账号卡片列表
 * （含用户名/密码的显示切换与复制、默认账号、关联邮箱）。
 * 纯展示组件：所有操作（编辑/删除/复制/打开）均通过事件上抛。
 */
import { computed, reactive, watch } from 'vue'
import type { Website, Mailbox } from '../../types/vault'
import VerificationMailbox from '../account/VerificationMailbox.vue'

const props = defineProps<{ website: Website | null; hideByDefault: boolean; mailboxes: Mailbox[]; highlightedAccountId?: string }>()
/** 邮箱 ID → 邮箱对象的索引，用于 O(1) 查找账号关联的邮箱 */
const mailboxById = computed(() => new Map(props.mailboxes.map((m) => [m.id, m])))
defineEmits<{
  'edit-site': []
  'delete-site': []
  'open-site': [url: string]
  'copy-site-url': [url: string]
  'add-account': []
  'copy-username': [value: string]
  'copy-password': [value: string]
  'edit-account': [id: string]
  'delete-account': [id: string]
  'set-default': [id: string]
}>()

/** 各账号密码的明文可见状态（账号 ID → 是否显示） */
const visible = reactive<Record<string, boolean>>({})
/** 隐藏密码时的占位符号 */
const maskedPassword = '••••••••••••••'

/** 默认账号的密码（用于头部密码强度评估） */
const defaultPassword = computed(() => {
  const account = props.website?.accounts.find((item) => item.isDefault) ?? props.website?.accounts[0]
  return account?.password ?? ''
})
/** 账号排序：默认账号置顶 */
const sortedAccounts = computed(() => {
  const accounts = props.website?.accounts ?? []
  return [...accounts].sort((left, right) => Number(right.isDefault) - Number(left.isDefault))
})
/** 简易密码强度评分（1-5）：按密码长度估算，每 4 字符 1 分 */
const strengthScore = computed(() => {
  const password = defaultPassword.value
  if (!password) return 0
  return Math.min(5, Math.max(1, Math.ceil(password.length / 4)))
})
/** 强度评分对应的文案 */
const strengthLabel = computed(() => {
  if (!defaultPassword.value) return '未设置'
  if (strengthScore.value >= 4) return '强'
  if (strengthScore.value >= 3) return '中'
  return '弱'
})

/** 让 visible 状态与当前账号列表保持同步：清掉已删除账号、为新账号按设置初始化 */
const syncVisibility = () => {
  const ids = new Set(props.website?.accounts.map((account) => account.id) ?? [])
  Object.keys(visible).forEach((key) => {
    if (!ids.has(key)) delete visible[key]
  })
  props.website?.accounts.forEach((account) => {
    if (visible[account.id] === undefined) visible[account.id] = !props.hideByDefault
  })
}

// 切换网站或改变"默认隐藏"设置时，重置全部密码可见状态
watch(() => [props.website?.id, props.hideByDefault], () => {
  Object.keys(visible).forEach((key) => delete visible[key])
  syncVisibility()
}, { immediate: true })
// 账号列表变化（增删）时仅做增量同步
watch(() => props.website?.accounts.map((account) => account.id).join('|'), syncVisibility)

/** 取名称首字符作为占位 logo 文字 */
const logoText = (name: string) => name.trim().slice(0, 1).toUpperCase() || '站'
/** 格式化 ISO 时间为"年-月-日 时:分"；非法值原样返回 */
const formatDate = (value: string) => {
  if (!value) return '未知'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
/* 从邮箱管理跳转过来时的高亮描边 */
.linked-account-highlight { outline: 2px solid #0f7df2; outline-offset: -2px; }
</style>
