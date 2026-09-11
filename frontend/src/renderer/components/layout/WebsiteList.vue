<template>
  <section class="panel website-list-panel">
    <div class="list-toolbar">
      <v-btn class="filter-chip" color="primary" prepend-icon="$account" variant="tonal">全部账户</v-btn>
      <v-btn class="filter-chip" append-icon="$dropdown" variant="outlined">最新使用</v-btn>
    </div>

    <div v-if="!items.length" class="website-empty">
      <img :src="lockIcon" alt="" />
      <h2>{{ keyword ? '没有找到匹配的网站' : '还没有保存任何账号' }}</h2>
      <p>{{ keyword ? '请尝试其他搜索关键词' : '让密码保险箱帮您安全管理所有账号' }}</p>
    </div>

    <v-list v-else class="site-list glass-list" bg-color="transparent" density="compact">
      <v-list-item
        v-for="site in items"
        :key="site.id"
        class="site-button"
        :active="site.id === selectedId"
        rounded="lg"
        @click="$emit('select', site.id)"
      >
        <template #prepend>
          <v-avatar class="site-logo" :style="site.icon ? undefined : { background: logoGradient(site.name) }" size="44">
            <img v-if="site.icon" class="website-logo-image" :src="site.icon" alt="" />
            <template v-else>{{ logoText(site.name) }}</template>
          </v-avatar>
        </template>
        <v-list-item-title>{{ site.name }}</v-list-item-title>
        <v-list-item-subtitle>{{ defaultUsername(site) }}</v-list-item-subtitle>
        <template #append>
          <div class="site-meta">
            <v-icon :color="site.accounts.some((account) => account.isDefault) ? 'primary' : '#89a5c2'" icon="$ratingFull" />
            <small>{{ site.accounts.length }} 个</small>
          </div>
        </template>
      </v-list-item>
    </v-list>

    <v-btn class="add-site-button" color="primary" prepend-icon="$plus" variant="outlined" @click="$emit('add')">新增网站</v-btn>
  </section>
</template>

<script setup lang="ts">
import type { Website } from '../../types/vault'
import lockIcon from '../../assets/images/lock-icon.png'

defineProps<{ items: Website[]; selectedId: string; keyword: string }>()
defineEmits<{
  'update:keyword': [value: string]
  select: [id: string]
  add: []
  lock: []
  settings: []
}>()

const palette = [
  'linear-gradient(135deg, #38bdf8, #1169e6)',
  'linear-gradient(135deg, #60a5fa, #2563eb)',
  'linear-gradient(135deg, #34d399, #0ea5e9)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #818cf8, #0ea5e9)'
]

const logoText = (name: string) => name.trim().slice(0, 1).toUpperCase() || '站'
const logoGradient = (name: string) => palette[Math.abs(hashText(name)) % palette.length]
const defaultUsername = (site: Website) => {
  const account = site.accounts.find((item) => item.isDefault) ?? site.accounts[0]
  return account?.username || site.url || site.category
}
const hashText = (value: string) => Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0)
</script>
