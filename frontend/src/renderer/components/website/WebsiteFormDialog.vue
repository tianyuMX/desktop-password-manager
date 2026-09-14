<template>
  <v-dialog :model-value="open" max-width="560" @update:model-value="onDialogUpdate">
    <v-card class="glass-card dialog-card">
      <v-card-title>{{ editing ? '编辑网站' : '新增网站' }}</v-card-title>
      <v-card-text class="dialog-fields">
        <div class="website-icon-picker">
          <v-avatar class="website-icon-preview" size="58">
            <img v-if="icon" class="website-logo-image" :src="icon" alt="网站图标预览" />
            <span v-else>{{ logoText }}</span>
          </v-avatar>
          <div class="website-icon-copy">
            <strong>网站图标</strong>
            <small>支持 PNG、JPG、WebP，图片仅保存在本地加密密码库中</small>
          </div>
          <input ref="iconInput" accept="image/png,image/jpeg,image/webp" hidden type="file" @change="onIconSelected" />
          <v-btn size="small" variant="outlined" @click="iconInput?.click()">选择图片</v-btn>
          <v-btn v-if="icon" color="error" size="small" variant="text" @click="removeIcon">移除</v-btn>
        </div>
        <v-text-field v-model="name" density="comfortable" hide-details label="网站名称" prepend-inner-icon="$web" variant="outlined" />
        <v-text-field v-model="url" density="comfortable" hide-details label="网站地址" placeholder="https://example.com" prepend-inner-icon="$web" variant="outlined" />
        <v-select v-model="category" density="comfortable" hide-details :items="categories" label="分类" prepend-inner-icon="$category" variant="outlined" />
        <v-text-field v-model="tagsText" density="comfortable" hide-details label="标签" placeholder="标签，逗号分隔" prepend-inner-icon="$file" variant="outlined" />
        <v-textarea v-model="note" auto-grow density="comfortable" hide-details label="备注" prepend-inner-icon="$note" rows="3" variant="outlined" />
        <v-alert v-if="error" density="compact" type="error" variant="tonal">{{ error }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="outlined" @click="$emit('cancel')">取消</v-btn>
        <v-btn color="primary" prepend-icon="$complete" @click="submit">保存</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
/**
 * 网站 新增/编辑 弹窗
 *
 * 打开时按是否传入 website 初始化表单（编辑回填、新增留空）。
 * 图标选择后会压缩到最大 256px 并转成 WebP base64，
 * 作为字符串随密码库一起加密保存（不落独立文件）。
 */
import { computed, ref, watch } from 'vue'
import { isHttpUrl } from '../../utils/url'
import type { Website, WebsiteCategory } from '../../types/vault'

const props = defineProps<{ open: boolean; website?: Website | null }>()
type WebsiteFormPayload = Pick<Website, 'name' | 'url' | 'category' | 'tags' | 'note' | 'icon'>
const emit = defineEmits<{ cancel: []; save: [payload: WebsiteFormPayload] }>()
const name = ref('')
const url = ref('')
const category = ref<WebsiteCategory>('工作')
const tagsText = ref('')
const note = ref('')
const icon = ref<string | undefined>()
const iconInput = ref<HTMLInputElement | null>(null)
const error = ref('')
const editing = ref(false)
const categories: WebsiteCategory[] = ['工作', '个人']

watch(() => props.open, () => {
  const website = props.website
  editing.value = !!website
  name.value = website?.name ?? ''
  url.value = website?.url ?? ''
  category.value = website?.category ?? '工作'
  tagsText.value = website?.tags.join(',') ?? ''
  note.value = website?.note ?? ''
  icon.value = website?.icon
  error.value = ''
})

const logoText = computed(() => name.value.trim().slice(0, 1).toUpperCase() || '站')

/**
 * 把选中的图片文件压缩为不超过 256px 的 WebP DataURL。
 * 使用 canvas 绘制缩放，输出质量 0.86，兼顾清晰度与库文件体积。
 */
const resizeIcon = (file: File) => new Promise<string>((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file)
  const image = new Image()
  image.onload = () => {
    URL.revokeObjectURL(objectUrl)
    const scale = Math.min(1, 256 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) {
      reject(new Error('无法处理该图片'))
      return
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    resolve(canvas.toDataURL('image/webp', 0.86))
  }
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl)
    reject(new Error('无法读取该图片'))
  }
  image.src = objectUrl
})

/** 图标文件选择：限制 5MB，超出直接提示；正常则压缩后暂存 */
const onIconSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    error.value = '图标文件不能超过 5MB'
    return
  }
  try {
    icon.value = await resizeIcon(file)
    error.value = ''
  } catch (cause) {
    error.value = (cause as Error).message
  }
}

const removeIcon = () => {
  icon.value = undefined
}

const onDialogUpdate = (value: boolean) => {
  if (!value) emit('cancel')
}

const submit = () => {
  if (!name.value.trim()) {
    error.value = '网站名称不能为空'
    return
  }
  if (!isHttpUrl(url.value)) {
    error.value = '网址格式不正确'
    return
  }

  emit('save', {
    name: name.value.trim(),
    url: url.value.trim(),
    category: category.value,
    tags: tagsText.value.split(',').map((x) => x.trim()).filter(Boolean),
    note: note.value.trim(),
    icon: icon.value
  })
}
</script>
