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
defineProps<{ open: boolean }>()
const emit = defineEmits<{ cancel: []; confirm: [] }>()

const onDialogUpdate = (value: boolean) => {
  if (!value) emit('cancel')
}
</script>
