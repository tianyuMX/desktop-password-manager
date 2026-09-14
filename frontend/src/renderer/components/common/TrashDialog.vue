<template>
  <v-dialog :model-value="open" :persistent="busy" scrollable max-width="760" @update:model-value="!busy && $emit('close')">
    <v-card class="glass-card dialog-card">
      <v-card-title class="trash-title">
        <span>回收站</span>
        <v-chip color="primary" size="small" variant="tonal">保留 30 天</v-chip>
      </v-card-title>
      <v-card-text class="dialog-fields">
        <v-alert density="compact" type="info" variant="tonal">
          删除的网站、账号和邮箱会保留 30 天。恢复后会立即同步更新 D 盘 Excel 备份。
        </v-alert>

        <div v-if="!vault.trashItems.length" class="trash-empty">
          <v-icon color="primary" icon="$recycle" size="42" />
          <strong>回收站是空的</strong>
          <span>删除的内容会暂时保存在这里。</span>
        </div>

        <v-list v-else class="trash-list" bg-color="transparent" lines="three">
          <v-list-item v-for="item in vault.trashItems" :key="item.id" class="trash-row">
            <template #prepend>
              <v-avatar color="primary" variant="tonal"><v-icon :icon="typeIcon(item.type)" /></v-avatar>
            </template>
            <v-list-item-title>{{ item.label }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ typeLabel(item.type) }} · 删除于 {{ formatTime(item.deletedAt) }} · {{ remainingDays(item.deletedAt) }} 天后清理
            </v-list-item-subtitle>
            <template #append>
              <div class="trash-actions">
                <v-btn :disabled="busy" color="primary" size="small" variant="tonal" @click="restore(item.id)">恢复</v-btn>
                <v-btn :disabled="busy" color="error" size="small" variant="text" @click="pendingPermanentDelete = item.id">彻底删除</v-btn>
              </div>
            </template>
          </v-list-item>
        </v-list>
        <v-alert v-if="error" density="compact" type="error" variant="tonal">{{ error }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn :disabled="busy" variant="outlined" @click="$emit('close')">关闭</v-btn>
      </v-card-actions>
    </v-card>

    <v-dialog :model-value="!!pendingPermanentDelete" :persistent="busy" max-width="440" @update:model-value="!busy && (pendingPermanentDelete = '')">
      <v-card title="彻底删除" text="彻底删除后无法从回收站恢复，确认继续吗？">
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="busy" @click="pendingPermanentDelete = ''">取消</v-btn>
          <v-btn :loading="busy" color="error" @click="removePermanently">彻底删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useVaultStore } from '../../stores/vault'
import { useAppStore } from '../../stores/app'
import { formatTime } from '../../utils/format'
import type { TrashItemType } from '../../types/vault'

defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()

const vault = useVaultStore()
const app = useAppStore()
const busy = ref(false)
const error = ref('')
const pendingPermanentDelete = ref('')

const typeLabel = (type: TrashItemType) => ({ website: '网站', account: '账号', mailbox: '邮箱' })[type]
const typeIcon = (type: TrashItemType) => ({ website: '$web', account: '$account', mailbox: '$mail' })[type]
const remainingDays = (deletedAt: string) => Math.max(0, Math.ceil((new Date(deletedAt).getTime() + 30 * 86400000 - Date.now()) / 86400000))

const restore = async (id: string) => {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await vault.restoreTrashItem(id)
    app.showToast('已从回收站恢复')
  } catch (caught) {
    error.value = (caught as Error).message
  } finally {
    busy.value = false
  }
}

const removePermanently = async () => {
  if (busy.value || !pendingPermanentDelete.value) return
  busy.value = true
  error.value = ''
  try {
    await vault.permanentlyDeleteTrashItem(pendingPermanentDelete.value)
    app.showToast('已彻底删除')
  } catch (caught) {
    error.value = (caught as Error).message
  } finally {
    pendingPermanentDelete.value = ''
    busy.value = false
  }
}
</script>

<style scoped>
.trash-title { display: flex; align-items: center; gap: 12px; }
.trash-list { display: grid; gap: 10px; }
.trash-row { border: 1px solid #bddaf0; border-radius: 14px; background: rgba(237, 247, 255, .78); }
.trash-row :deep(.v-list-item-subtitle) { white-space: normal; overflow-wrap: anywhere; }
.trash-actions { display: flex; gap: 6px; margin-left: 12px; }
.trash-empty { display: grid; justify-items: center; gap: 8px; padding: 36px 16px; color: #356997; }
.trash-empty strong { color: #174879; }
.trash-empty span { font-size: 13px; }
</style>
