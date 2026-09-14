<template>
  <div class="auth-page">
    <section class="auth-hero">
      <div class="auth-intro">
        <div class="auth-copy">
          <h1>密码保险箱</h1>
          <p class="auth-tagline">安全存储 · 智能管理 · 全面守护</p>
          <p class="auth-description">创建仅由主密码守护的<br />本地密码库。</p>
        </div>
        <img class="auth-shield-art" :src="shieldIcon" alt="" />
      </div>
      <div class="feature-strip" aria-label="安全特性">
        <div class="feature-item">
          <v-icon icon="$security" size="28" />
          <strong>加密保存</strong>
          <span>敏感数据不明文落盘</span>
        </div>
        <div class="feature-item">
          <v-icon icon="$lock" size="28" />
          <strong>自动锁定</strong>
          <span>离开后减少暴露风险</span>
        </div>
        <div class="feature-item">
          <v-icon icon="$cloud" size="28" />
          <strong>离线可用</strong>
          <span>核心能力不依赖网络</span>
        </div>
      </div>
    </section>

    <section class="auth-card">
      <img class="auth-lock-image" :src="lockIcon" alt="" />
      <h1>初始化密码库</h1>
      <p>设置一个强主密码，后续将用它解锁所有账号</p>
      <form @submit.prevent="submit">
        <v-text-field
          v-model="pwd"
          autocomplete="new-password"
          density="comfortable"
          hide-details
          label="主密码"
          prepend-inner-icon="$key"
          type="password"
          variant="outlined"
        />
        <v-text-field
          v-model="confirm"
          autocomplete="new-password"
          density="comfortable"
          hide-details
          label="确认主密码"
          prepend-inner-icon="$lock"
          type="password"
          variant="outlined"
        />
        <v-btn class="primary-button" color="primary" prepend-icon="$security" type="submit">创建密码库</v-btn>
        <p class="error" v-if="error">{{ error }}</p>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
/**
 * 初始化页（仅首次启动可见）
 *
 * 设置主密码并创建密码库。两次输入一致后调用主进程初始化，
 * 成功即视为解锁并进入主界面。
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useVaultStore } from '../stores/vault'
import lockIcon from '../assets/images/lock-icon.png'
import shieldIcon from '../assets/images/shield-icon.png'

const auth = useAuthStore()
const vault = useVaultStore()
const router = useRouter()
const pwd = ref('')
const confirm = ref('')
const error = ref('')

/** 提交前做两次输入一致性校验，再交给主进程创建密码库 */
const submit = async () => {
  if (!pwd.value || !confirm.value) {
    error.value = '密码不能为空'
    return
  }
  if (pwd.value !== confirm.value) {
    error.value = '两次密码不一致'
    return
  }

  try {
    const data = await auth.initialize(pwd.value)
    vault.setData(data)
    await router.push('/app')
  } catch (e) {
    error.value = (e as Error).message
  }
}
</script>
