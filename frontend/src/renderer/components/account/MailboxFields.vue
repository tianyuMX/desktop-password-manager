<template>
  <v-text-field v-model="username" autocomplete="off" density="comfortable" hide-details label="邮箱账号" placeholder="name@example.com" variant="outlined" />
  <v-text-field v-model="password" autocomplete="new-password" density="comfortable" hide-details label="邮箱密码" type="password" variant="outlined" />
  <v-text-field v-model="url" density="comfortable" hide-details label="邮箱网页登录地址" placeholder="例如 mail.com" variant="outlined" />
</template>

<script setup lang="ts">
/** 邮箱字段组：账号/密码/登录地址三个输入框，用 defineModel 与父组件双向绑定，可在多处复用 */
const username = defineModel<string>('username', { required: true })
const password = defineModel<string>('password', { required: true })
const url = defineModel<string>('url', { required: true })
</script>
