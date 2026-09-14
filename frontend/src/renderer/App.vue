<template>
  <!-- 应用外壳：Vuetify 根组件，所有页面经由 router-view 渲染 -->
  <v-app>
    <router-view />
    <Toast :text="app.toast" />
  </v-app>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import Toast from './components/common/Toast.vue'
import { useAppStore } from './stores/app'
import { useVaultStore } from './stores/vault'

const app = useAppStore()
const vault = useVaultStore()

watch(() => vault.backupWarning, (warning) => {
  if (!warning) return
  app.showToast(warning)
  vault.clearBackupWarning()
})
</script>
