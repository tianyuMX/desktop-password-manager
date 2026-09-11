<template>
  <v-snackbar :model-value="!!text" color="primary" location="bottom right" rounded="lg" timeout="-1">
    {{ text }}
  </v-snackbar>
</template>

<script setup lang="ts">
defineProps<{ text: string }>()
</script>
