<template>
  <v-dialog :model-value="open" max-width="420" @update:model-value="onDialogUpdate">
    <v-card class="glass-card dialog-card">
      <v-card-title>确认操作</v-card-title>
      <v-card-text class="confirm-body">
        <v-icon color="warning" icon="$warning" size="32" />
        <div><slot /></div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="outlined" @click="$emit('cancel')">取消</v-btn>
        <v-btn color="error" prepend-icon="$delete" @click="$emit('confirm')">确认</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
/** 通用确认弹窗：内容通过默认插槽传入，确认/取消结果以事件抛出 */
defineProps<{ open: boolean }>()
const emit = defineEmits<{ cancel: []; confirm: [] }>()

// 点遮罩/ESC 关闭弹窗等同于取消
const onDialogUpdate = (value: boolean) => {
  if (!value) emit('cancel')
}
</script>
