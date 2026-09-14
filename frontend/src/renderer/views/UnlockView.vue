<template>
  <div class="auth-page">
    <section class="auth-hero">
      <div class="auth-intro">
        <div class="auth-copy">
          <h1>密码保险箱</h1>
          <p class="auth-tagline">安全存储 · 智能管理 · 全面守护</p>
          <p class="auth-description">让重要的账号密码，<br />始终掌握在您手中。</p>
        </div>
        <img class="auth-shield-art" :src="shieldIcon" alt="" />
      </div>
      <div class="feature-strip" aria-label="安全特性">
        <div class="feature-item">
          <v-icon icon="$security" size="28" />
          <strong>端到端加密</strong>
          <span>数据安全加密存储</span>
        </div>
        <div class="feature-item">
          <v-icon icon="$key" size="28" />
          <strong>主密码保护</strong>
          <span>仅您可访问</span>
        </div>
        <div class="feature-item">
          <v-icon icon="$cloud" size="28" />
          <strong>本地优先</strong>
          <span>数据本地存储</span>
        </div>
      </div>
    </section>

    <section class="auth-card">
      <img class="auth-lock-image" :src="lockIcon" alt="" />
      <h1>解锁密码库</h1>
      <p>请输入主密码以解锁您的密码库</p>
      <form @submit.prevent="submit">
        <v-text-field
          v-model="pwd"
          autocomplete="current-password"
          density="comfortable"
          hide-details
          label="主密码"
          prepend-inner-icon="$lock"
          type="password"
          variant="outlined"
        />
        <v-btn class="primary-button" color="primary" prepend-icon="$lock" type="submit">立即解锁</v-btn>
        <p class="error" v-if="error">{{ error }}</p>
        <v-btn v-if="showRecovery" block variant="text" @click="recover">从最近的备份恢复</v-btn>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * 解锁页
 *
 * 输入主密码解锁密码库；解锁失败（主密码错误或库文件损坏）时
 * 显示"从最近的备份恢复"入口，尝试用备份文件兜底解锁。
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useAuthStore } from '../stores/auth'
import { useVaultStore } from '../stores/vault'
import lockIcon from '../assets/images/lock-icon.png'
import shieldIcon from '../assets/images/shield-icon.png'

const auth = useAuthStore()
const app = useAppStore()
const vault = useVaultStore()
const router = useRouter()
const pwd = ref('')
const error = ref('')
const showRecovery = ref(false)

const submit = async () => {
  if (!pwd.value) {
    error.value = '请输入主密码'
    return
  }

  try {
    error.value = ''
    showRecovery.value = false
    const result = await auth.unlock(pwd.value)
    vault.setData(result.data)
    await router.push('/app')
  } catch (e) {
    error.value = (e as Error).message
    showRecovery.value = true
  }
}

/** 从最近的可用备份恢复解锁（用于主文件损坏的场景） */
const recover = async () => {
  try {
    error.value = ''
    const result = await auth.recoverBackup(pwd.value)
    vault.setData(result.data)
    app.showToast('密码库已从最近的有效备份恢复')
    await router.push('/app')
  } catch (e) {
    error.value = (e as Error).message
  }
}
</script>
