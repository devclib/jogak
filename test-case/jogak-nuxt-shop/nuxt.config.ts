import tailwindcss from '@tailwindcss/vite'

// Nuxt 4 — file-system routing + auto-imports + Vue 3.
// jogak vue adapter를 그대로 사용한다 (framework: 'vue').
export default defineNuxtConfig({
  compatibilityDate: '2026-06-29',
  devtools: { enabled: false },
  css: ['~/assets/globals.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    head: {
      title: 'jogak shop · Nuxt',
      htmlAttrs: { lang: 'ko' },
    },
  },
})
