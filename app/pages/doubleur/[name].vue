<script setup>
const route = useRoute()

const cleanString = (str) => {
  if (!str) return ''
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

const rawName = computed(() => route.params.name ? decodeURIComponent(route.params.name) : '')
const name = computed(() => cleanString(rawName.value))
const openGroups = ref({})

watch(() => route.params.name, () => {
  openGroups.value = {}
})

// Utilisation du composable global unifié pour s'assurer du chargement et du cache
const { allMovies: allMoviesCatalog, loading, fetchMovies } = useVfqMovies()

await fetchMovies()

// Calcul synchrone instantané des rôles du doubleur depuis le cache global
const groupedRoles = computed(() => {
  const targetName = name.value
  if (!targetName || !allMoviesCatalog.value || !Array.isArray(allMoviesCatalog.value) || allMoviesCatalog.value.length === 0) return []

  const groups = {}

  allMoviesCatalog.value.forEach(film => {
    const castList = film.cast_data || film.cast || film.casting || []
    let castArray = []
    
    if (typeof castList === 'string') {
      try { castArray = JSON.parse(castList) } catch (e) { castArray = [] }
    } else if (Array.isArray(castList)) {
      castArray = castList
    }

    castArray.forEach(c => {
      if (!c) return
      const rawDoubleur = c.doubleVFQ || c.double_vfq || c.voice || c.doubleur_vfq || c.doubleur || c.nom || c.name || ''
      const cleanedDoubleur = cleanString(rawDoubleur)

      if (cleanedDoubleur && cleanedDoubleur === targetName) {
        const actorName = c.actor || c.actor_original || c.original_actor || 'Acteur inconnu'
        const movieTitle = film.translated_name || c.movie_title || 'Titre inconnu'
        const movieId = film.id
        const characterRole = c.role || c.character || '—'
        
        // Ciblage exclusif de la sortie en salle (theatricalRelease)
        let releaseYear = 'N/A'
        const theatrical = film.extra_data?.theatricalRelease || c.theatricalRelease
        
        if (theatrical) {
          const match = theatrical.toString().match(/\d{4}/)
          if (match) {
            releaseYear = match[0]
          }
        }

        if (!groups[actorName]) groups[actorName] = []

        groups[actorName].push({
          title: movieTitle,
          id: movieId,
          role: characterRole,
          year: releaseYear
        })
      }
    })
  })

  return Object.keys(groups).map(actorName => ({
    actorName,
    movies: groups[actorName].sort((a, b) => b.year.localeCompare(a.year)),
    count: groups[actorName].length
  })).sort((a, b) => b.count - a.count)
})

const toggleGroup = (actor) => { 
  openGroups.value[actor] = !openGroups.value[actor] 
}

useHead(() => ({
  title: rawName.value ? `${rawName.value} - Doublage VFQ` : 'Doubleur - Doublage VFQ'
}))
</script>

<template>
  <div class="page" v-if="!loading">
    <div class="nav-container">
      <a href="#" @click.prevent="$router.back()" class="back-link">← RETOUR</a>
    </div>

    <div class="header">
      <p class="category-prefix">DOUBLEUR QUÉBÉCOIS</p>
      <h1>{{ rawName }}</h1>
      <div class="title-underline"></div>
    </div>

    <div class="groups-container" v-if="groupedRoles.length > 0">
      <div v-for="group in groupedRoles" :key="group.actorName" class="actor-group">
        <div class="group-header" @click="toggleGroup(group.actorName)">
          <div class="info">
            <span class="prefix">VOIX DE</span>
            <span class="actor-name">{{ group.actorName }}</span>
          </div>
          <div class="right-section">
            <span class="role-count">
              {{ group.count }} rôle{{ group.count > 1 ? 's' : '' }}
            </span>
            <span class="chevron" :class="{ 'is-open': openGroups[group.actorName] }">▼</span>
          </div>
        </div>

        <transition name="slide">
          <div v-if="openGroups[group.actorName]" class="group-content">
            <NuxtLink :key="m.id" :to="'/film/' + m.id" class="movie-row" v-for="m in group.movies">
              <div class="m-main">
                <span class="m-title">{{ m.title }}</span>
                <span class="m-role">{{ m.role }}</span>
              </div>
              <span class="m-year">{{ m.year }}</span>
            </NuxtLink>
          </div>
        </transition>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>Aucun doublage trouvé pour ce comédien.</p>
    </div>
  </div>

  <div v-else class="loader">
    <div class="spinner"></div>
    <p>Recherche des doublages...</p>
  </div>
</template>

<style scoped>
.page { max-width: 1000px; margin: 40px auto; padding: 0 20px; color: #fff; }
.nav-container { margin-bottom: 20px; }
.back-link { color: #666; text-decoration: none; font-size: 0.75rem; font-weight: 800; letter-spacing: 1px; transition: color 0.2s; cursor: pointer; }
.back-link:hover { color: var(--primary, #2563eb); }
.header { margin-bottom: 50px; }
.category-prefix { color: var(--primary, #2563eb); font-weight: 800; font-size: 0.75rem; letter-spacing: 2px; margin-bottom: 5px; }
h1 { font-size: 4rem; font-weight: 900; margin: 0; line-height: 1; color: #fff; }
.title-underline { width: 120px; height: 6px; background: var(--primary, #2563eb); margin-top: 10px; }
.groups-container { display: flex; flex-direction: column; gap: 15px; }
.actor-group { width: 100%; }
.group-header { background: rgba(255, 255, 255, 0.03); padding: 25px 30px; border-radius: 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255, 255, 255, 0.05); transition: all 0.3s ease; }
.group-header:hover { background: rgba(255, 255, 255, 0.06); border-color: rgba(37, 99, 235, 0.3); }
.info { display: flex; align-items: center; gap: 15px; }
.prefix { color: var(--primary, #2563eb); font-weight: 900; font-style: italic; font-size: 1.1rem; }
.actor-name { color: #fff; font-weight: 900; font-style: italic; font-size: 1.3rem; letter-spacing: 1px; }
.right-section { display: flex; align-items: center; gap: 20px; }
.role-count { background: rgba(37, 99, 235, 0.15); color: var(--primary, #2563eb); padding: 4px 15px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; white-space: nowrap; }
.chevron { color: #444; transition: 0.3s; font-size: 0.8rem; }
.chevron.is-open { transform: rotate(180deg); color: var(--primary, #2563eb); }
.group-content { background: rgba(0, 0, 0, 0.2); margin: -5px 10px 10px 10px; border-radius: 0 0 15px 15px; border: 1px solid rgba(255, 255, 255, 0.05); border-top: none; overflow: hidden; }
.movie-row { display: flex; justify-content: space-between; align-items: center; padding: 15px 25px; text-decoration: none; border-bottom: 1px solid rgba(255, 255, 255, 0.03); transition: background 0.2s; }
.movie-row:last-child { border-bottom: none; }
.movie-row:hover { background: rgba(37, 99, 235, 0.05); }
.m-main { display: flex; flex-direction: column; gap: 2px; }
.m-title { color: #fff; font-weight: 700; font-size: 1rem; transition: color 0.2s; }
.movie-row:hover .m-title { color: var(--primary, #2563eb); }
.m-role { color: #666; font-size: 0.85rem; font-style: italic; }
.m-year { color: #444; font-weight: 800; font-size: 0.8rem; }
.slide-enter-active, .slide-leave-active { transition: all 0.3s ease-out; max-height: 2000px; }
.slide-enter-from, .slide-leave-to { max-height: 0; opacity: 0; transform: translateY(-10px); }
.loader { text-align: center; padding: 100px; color: var(--primary, #2563eb); font-weight: 900; }
.spinner { width: 40px; height: 40px; border: 4px solid #262626; border-top: 4px solid var(--primary, #2563eb); border-radius: 50%; margin: 0 auto 15px; animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 60px; color: #555; font-style: italic; }
@media (max-width: 768px) {
  .page { margin: 20px auto; padding: 0 10px; }
  h1 { font-size: 2.5rem; }
  .header { margin-bottom: 30px; }
  .title-underline { width: 80px; height: 4px; }
  .group-header { padding: 12px 18px; border-radius: 10px; }
  .info { flex-direction: column; align-items: flex-start; gap: 0; }
  .prefix { font-size: 0.65rem; }
  .actor-name { font-size: 1rem; }
  .right-section { gap: 10px; }
  .role-count { font-size: 0.65rem; padding: 3px 10px; }
  .group-content { margin: -5px 5px 10px 5px; border-radius: 0 0 10px 10px; }
  .movie-row { padding: 10px 15px; }
  .m-title { font-size: 0.85rem; }
  .m-role { font-size: 0.75rem; }
  .m-year { font-size: 0.7rem; }
}
</style>