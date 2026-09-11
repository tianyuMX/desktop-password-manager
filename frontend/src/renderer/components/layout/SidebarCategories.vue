<template>
  <aside class="panel category-panel">
    <v-list class="glass-list" bg-color="transparent" density="comfortable">
      <v-list-item
        v-for="item in categoryItems"
        :key="item.value"
        class="category-button"
        :active="modelValue === item.value"
        rounded="lg"
        @click="$emit('update:modelValue', item.value)"
      >
        <template #prepend>
          <v-avatar class="category-icon" rounded="lg" size="34">
            <v-icon :icon="item.icon" size="20" />
          </v-avatar>
        </template>
        <v-list-item-title>{{ item.label }}</v-list-item-title>
        <v-list-item-subtitle>{{ item.description }}</v-list-item-subtitle>
        <template #append>
          <v-chip color="primary" size="small" variant="text">{{ item.count }}</v-chip>
        </template>
      </v-list-item>
    </v-list>

    <v-card class="security-status glass-card" flat>
      <div class="security-summary">
        <v-icon color="success" icon="$success" size="34" />
        <div>
          <strong>安全状态：优秀</strong>
          <p>所有数据均已受保护</p>
        </div>
      </div>
      <div class="security-points">
        <span><v-icon icon="$lock" size="17" />本地加密存储</span>
        <span><v-icon icon="$security" size="17" />多重安全防护</span>
        <span><v-icon icon="$cloud" size="17" />数据完全由您掌控</span>
      </div>
    </v-card>
    <p class="security-slogan"><span></span>更安全 · 更高效 · 更安心<span></span></p>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useVaultStore } from '../../stores/vault'
import type { CategoryFilter } from '../../types/vault'

defineProps<{ modelValue: CategoryFilter }>()
defineEmits<{ 'update:modelValue': [value: CategoryFilter] }>()

const vault = useVaultStore()
const categoryItems = computed(() => {
  const workCount = vault.websites.filter((site) => site.category === '工作').length
  const personalCount = vault.websites.filter((site) => site.category === '个人').length

  return [
    { value: '全部' as const, label: '全部', description: '所有账号', icon: '$category', count: vault.websites.length },
    { value: '工作' as const, label: '工作', description: '工作资料', icon: '$briefcase', count: workCount },
    { value: '个人' as const, label: '个人', description: '私人账号', icon: '$account', count: personalCount }
  ]
})
</script>
