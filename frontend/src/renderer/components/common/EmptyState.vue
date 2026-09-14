<template>
  <div class="empty">
    <img v-if="illustration === 'shield'" class="empty-illustration" :src="shieldIcon" alt="" />
    <v-icon v-else icon="$info" size="38" />
    <strong>{{ text }}</strong>
    <span v-if="illustration === 'shield'">请选择左侧的网站账号<br />查看详细信息</span>
  </div>
</template>

<script setup lang="ts">
/** 通用空状态占位：shield 模式展示盾牌插画 + 引导文案，否则显示信息图标 */
import shieldIcon from '../../assets/images/shield-icon.png'

withDefaults(defineProps<{ text: string; illustration?: 'shield' }>(), {
  illustration: undefined
})
</script>
