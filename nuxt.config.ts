// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/supabase'],
  
  ssr: false,

  app: {
    baseURL: '/Doublage-VFQ-Base/',
    buildAssetsDir: '_nuxt/',
    head: {
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/Doublage-VFQ-Base/favicon.ico' }
      ]
    }
  },

  supabase: {
    redirect: false
  }
})