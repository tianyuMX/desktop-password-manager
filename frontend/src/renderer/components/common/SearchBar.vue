<template>
  <v-text-field
    :model-value="modelValue"
    density="compact"
    hide-details
    :label="placeholder"
    prepend-inner-icon="$search"
    variant="outlined"
    @update:model-value="$emit('update:modelValue', String($event ?? ''))"
  />
</template>

<script setup lang="ts">
/** 通用搜索框：v-model 双向绑定关键词（受控组件） */
defineProps<{ modelValue: string; placeholder?: string }>()
defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
