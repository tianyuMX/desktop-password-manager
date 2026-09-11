import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

const appAliases = {
  ...aliases,
  account: 'mdi-account',
  arrowleft: 'mdi-arrow-left',
  briefcase: 'mdi-briefcase-outline',
  category: 'mdi-view-grid-outline',
  cloud: 'mdi-cloud-outline',
  complete: 'mdi-check',
  copy: 'mdi-content-copy',
  delete: 'mdi-delete-outline',
  dropdown: 'mdi-menu-down',
  edit: 'mdi-pencil-outline',
  eye: 'mdi-eye-outline',
  eyeOff: 'mdi-eye-off-outline',
  file: 'mdi-tag-outline',
  info: 'mdi-information-outline',
  key: 'mdi-key-variant',
  lock: 'mdi-lock',
  mail: 'mdi-email-outline',
  logout: 'mdi-logout',
  note: 'mdi-note-text-outline',
  plus: 'mdi-plus',
  ratingFull: 'mdi-star',
  search: 'mdi-magnify',
  security: 'mdi-shield-check-outline',
  settings: 'mdi-cog-outline',
  success: 'mdi-check-circle-outline',
  warning: 'mdi-alert-outline',
  web: 'mdi-web'
}

export default createVuetify({
  theme: {
    defaultTheme: 'iceLight',
    themes: {
      iceLight: {
        dark: false,
        colors: {
          background: '#dcefff',
          surface: '#f5fbff',
          primary: '#0f7df2',
          secondary: '#5c85b2',
          success: '#1ba672',
          warning: '#f59e0b',
          error: '#b4233a',
          info: '#2492ff'
        }
      }
    }
  },
  icons: {
    defaultSet: 'mdi',
    aliases: appAliases,
    sets: { mdi }
  }
})
