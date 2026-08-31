// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/supabase'],
  
  ssr: false,

  app: {
    baseURL: '/Doublage-VFQ-Base/',
    buildAssetsDir: '_nuxt/',
  },

  supabase: {
    redirect: false // Désactive la redirection automatique si l'utilisateur n'est pas connecté
  }
})