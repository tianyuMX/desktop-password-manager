/**
 * 路由配置
 *
 * 四个页面对应密码库的完整生命周期：
 * /initialize（首次初始化）→ /unlock（解锁）→ /app（主界面）→ /settings（设置）
 * 使用 hash 模式以兼容 Electron 的 file:// 加载方式。
 */
import { createRouter, createWebHashHistory } from 'vue-router'
import InitializeView from '../views/InitializeView.vue'
import UnlockView from '../views/UnlockView.vue'
import MainLayout from '../views/MainLayout.vue'
import SettingsView from '../views/SettingsView.vue'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/unlock' },
    { path: '/initialize', component: InitializeView },
    { path: '/unlock', component: UnlockView },
    { path: '/app', component: MainLayout },
    { path: '/settings', component: SettingsView }
  ]
})

/**
 * 全局路由守卫：负责解锁状态机的访问控制。
 * - 未初始化 → 一律重定向到 /initialize；
 * - 已初始化未解锁 → 一律重定向到 /unlock；
 * - 已解锁 → 不允许再回到 /unlock、/initialize（重定向回 /app）。
 */
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.bootstrapped) await auth.bootstrap()
  if (!auth.initialized && to.path !== '/initialize') return '/initialize'
  if (auth.initialized && !auth.unlocked && to.path !== '/unlock' && to.path !== '/initialize') return '/unlock'
  if (!auth.unlocked && to.path === '/settings') return '/unlock'
  if (auth.unlocked && (to.path === '/unlock' || to.path === '/initialize')) return '/app'
  return true
})

export default router
