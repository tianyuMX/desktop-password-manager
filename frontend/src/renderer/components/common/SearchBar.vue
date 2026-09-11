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
defineProps<{ modelValue: string; placeholder?: string }>()
defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
