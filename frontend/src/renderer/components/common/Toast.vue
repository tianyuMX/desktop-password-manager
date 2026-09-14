<template>
  <v-snackbar :model-value="!!text" color="primary" location="bottom right" rounded="lg" timeout="-1">
    {{ text }}
  </v-snackbar>
</template>

<script setup lang="ts">
/** 全局轻提示：显示 app store 中的 toast 文案；timeout=-1 表示由 store 控制消失时机 */
defineProps<{ text: string }>()
</script>
