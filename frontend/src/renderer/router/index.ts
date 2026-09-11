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
