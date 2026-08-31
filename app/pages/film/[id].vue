<script setup>
const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()

const movieId = computed(() => route.params.id)

// On récupère le catalogue global en mémoire
const allMoviesCatalog = useState('vfq_all_movies_comediens', () => null)

// Recherche immédiate et synchrone dans le cache si disponible
const cachedMovie = computed(() => {
  if (!allMoviesCatalog.value) return null
  return allMoviesCatalog.value.find(m => String(m.id) === String(movieId.value)) || null
})

// Si le film n'est pas dans le cache (accès direct par URL), on le charge en arrière-plan avec useAsyncData
const { data: fetchedMovie, pending: loading } = await useAsyncData(
  `movie-detail-${movieId.value}`,
  async () => {
    if (cachedMovie.value) return null // Pas besoin de fetch si déjà en cache
    const { data, error } = await supabase
      .from('fiches_vfq')
      .select('*')
      .eq('id', movieId.value)
      .single()

    if (error || !data) return null
    return data
  },
  {
    // Ne lance fetch que si on ne l'a pas trouvé en cache
    immediate: !cachedMovie.value
  }
)

// Le film final vient soit du cache instantané, soit du fetch unitaire
const movie = computed(() => cachedMovie.value || fetchedMovie.value)

// Extraction propre du casting (gère cast_data ou cast)
const cast = computed(() => {
  if (!movie.value) return []
  return movie.value.cast_data || movie.value.cast || []
})

const goBack = () => {
  router.back()
}

const getPoster = (m) => {
  if (!m) return null
  const baseUrl = 'https://image.tmdb.org/t/p/w500'
  const path = m.poster_path || m.posterPath || m.extra_data?.posterPath || m.extra?.posterPath
  return path ? (baseUrl + path) : null
}

// Meta SEO dynamique
useHead(() => ({
  title: movie.value ? `${movie.value.translated_name || movie.value.translatedName} - Doublage VFQ` : 'Film - Doublage VFQ'
}))
</script>

<template>
  <!-- S'affiche instantanément si le film est dans le cache, sans attendre le loader -->
  <div class="page-detail" v-if="movie">
    <div class="nav-container">
      <a href="#" @click.prevent="goBack" class="back-link">← RETOUR</a>
    </div>

    <div class="main-content">
      <div class="sidebar">
        <div class="poster-wrapper">
          <img v-if="getPoster(movie)" :src="getPoster(movie)" class="main-poster" :alt="movie.translated_name || movie.translatedName" />
          <div v-else class="main-poster-placeholder"><span>VFQ</span></div>
        </div>
      </div>

      <div class="details-area">
        <header class="movie-header">
          <h1>{{ movie.translated_name || movie.translatedName }}</h1>
          <div class="sub-header">
            <span class="original-title">{{ movie.original_name || movie.originalName }}</span>
            <span class="separator">|</span>
            <span class="release-date">{{ movie.release_year || movie.theatrical_release || movie.extra_data?.theatricalRelease || movie.extra?.theatricalRelease || 'DATE INCONNUE' }}</span>
          </div>
        </header>

        <section class="synopsis-section" v-if="movie.description || movie.overview">
          <h2 class="section-label">SYNOPSIS</h2>
          <p class="synopsis-text">{{ movie.description || movie.overview }}</p>
        </section>

        <h2 class="section-label">DISTRIBUTION VFQ</h2>
        <div class="cast-table-wrapper">
          <table class="cast-table">
            <thead>
              <tr>
                <th class="col-actor">ACTEUR ORIGINAL</th>
                <th class="col-role">RÔLE</th>
                <th class="col-doubleur">DOUBLEUR</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(c, index) in cast" :key="index">
                <td class="actor-orig">
                  <NuxtLink 
                    v-if="c.actor || c.actor_original || c.original_actor"
                    :to="'/acteur-original/' + encodeURIComponent((c.actor || c.actor_original || c.original_actor).trim())" 
                    class="actor-link"
                  >
                    {{ c.actor || c.actor_original || c.original_actor }}
                  </NuxtLink>
                  <span v-else class="unconfirmed">—</span>
                </td>
                <td class="role-name">({{ c.character || c.character_name || c.role || '—' }})</td>
                <td class="vfq-actor">
                  <NuxtLink 
                    v-if="(c.voice || c.doubleur_vfq || c.doubleVFQ) && (c.voice || c.doubleur_vfq || c.doubleVFQ) !== 'À confirmer'"
                    :to="'/doubleur/' + encodeURIComponent((c.voice || c.doubleur_vfq || c.doubleVFQ).trim())" 
                    class="vfq-link"
                  >
                    {{ c.voice || c.doubleur_vfq || c.doubleVFQ }}
                  </NuxtLink>
                  <span v-else class="unconfirmed">
                    {{ c.voice || c.doubleur_vfq || c.doubleVFQ || 'À confirmer' }}
                  </span>
                </td>
              </tr>
              <tr v-if="cast.length === 0">
                <td colspan="3" class="unconfirmed" style="text-align: center; padding: 20px;">Aucun acteur répertorié pour cette fiche.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="technical-sheet">
          <h2 class="section-label">FICHE TECHNIQUE VFQ</h2>
          <div class="tech-grid">
            <div class="tech-item" v-if="movie.extra_data?.studio || movie.extra?.studio || movie.studio_vfq">
              <span class="label">STUDIO</span>
              <span class="value">{{ movie.extra_data?.studio || movie.extra?.studio || movie.studio_vfq }}</span>
            </div>
            <div class="tech-item" v-if="movie.extra_data?.director || movie.extra?.director || movie.direction_vfq">
              <span class="label">DIRECTION</span>
              <span class="value">{{ movie.extra_data?.director || movie.extra?.director || movie.direction_vfq }}</span>
            </div>
            <div class="tech-item" v-if="movie.extra_data?.adapter || movie.extra?.adapter || movie.adaptation_vfq">
              <span class="label">ADAPTATION</span>
              <span class="value">{{ movie.extra_data?.adapter || movie.extra?.adapter || movie.adaptation_vfq }}</span>
            </div>
            <div class="tech-item" v-if="movie.extra_data?.distributor || movie.extra?.distributor || movie.distributor">
              <span class="label">DISTRIBUTEUR</span>
              <span class="value">{{ movie.extra_data?.distributor || movie.extra?.distributor || movie.distributor }}</span>
            </div>
            <div class="tech-item" v-if="movie.extra_data?.producer || movie.extra?.producer || movie.producer">
              <span class="label">PRODUCTEUR</span>
              <span class="value">{{ movie.extra_data?.producer || movie.extra?.producer || movie.producer }}</span>
            </div>
            <div class="tech-item" v-if="movie.extra_data?.theatricalRelease || movie.extra?.theatricalRelease || movie.theatrical_release">
              <span class="label">SORTIE</span>
              <span class="value">{{ movie.extra_data?.theatricalRelease || movie.extra?.theatricalRelease || movie.theatrical_release }}</span>
            </div>
            <div class="tech-item" v-if="movie.extra_data?.dvdRelease || movie.extra?.dvdRelease || movie.dvd_release">
              <span class="label">SORTIE DVD</span>
              <span class="value">{{ movie.extra_data?.dvdRelease || movie.extra?.dvdRelease || movie.dvd_release }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- Affiché uniquement si on arrive par URL directe et que Supabase charge encore -->
  <div v-else-if="loading" class="loader">
    <div class="spinner"></div>
    <p>Chargement...</p>
  </div>
  <div v-else class="loader">
    <p>Film introuvable.</p>
  </div>
</template>

<style scoped>
.page-detail { max-width: 1200px; margin: 0 auto; padding: 40px 20px; color: #fff; }
.nav-container { margin-bottom: 30px; }
.back-link { color: #667085; text-decoration: none; font-size: 0.8rem; font-weight: 700; letter-spacing: 1px; cursor: pointer; transition: color 0.2s; }
.back-link:hover { color: var(--primary); }

.main-content { display: flex; gap: 50px; }
.sidebar { width: 300px; flex-shrink: 0; }
.poster-wrapper { border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); }
.main-poster { width: 100%; display: block; }
.main-poster-placeholder { width: 100%; aspect-ratio: 2/3; background: #171717; display: flex; align-items: center; justify-content: center; font-size: 3rem; font-weight: 900; color: #262626; }

.movie-header h1 { font-size: 3.5rem; font-weight: 900; margin: 0; text-transform: none; line-height: 1; }
.sub-header { margin-top: 15px; font-size: 1.1rem; color: #888; display: flex; gap: 15px; align-items: center; }
.separator { opacity: 0.3; }
.release-date { font-weight: 800; color: #fff; font-size: 0.9rem; letter-spacing: 1px; }

.section-label { font-size: 0.7rem; font-weight: 800; color: #667085; letter-spacing: 2px; margin: 40px 0 20px 0; display: flex; align-items: center; gap: 10px; }
.section-label::before { content: ""; width: 20px; height: 1px; background: #333; }

.synopsis-text { font-size: 1.05rem; line-height: 1.6; color: #ccc; font-style: italic; max-width: 850px; }

.cast-table-wrapper { margin-top: 30px; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden; }
.cast-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.cast-table th { padding: 15px 20px; font-size: 0.65rem; color: #667085; border-bottom: 1px solid rgba(255,255,255,0.05); text-transform: uppercase; }
.cast-table td { padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 0.95rem; }

.col-actor { text-align: left; width: 35%; }
.col-role { text-align: center; width: 30%; }
.col-doubleur { text-align: right; width: 35%; }

.actor-orig { text-align: left; }
.role-name { text-align: center; color: #888; font-style: italic; }
.vfq-actor { text-align: right; }

.actor-link, .vfq-link { color: var(--primary); text-decoration: none; font-weight: 600; }
.actor-link:hover, .vfq-link:hover { text-decoration: underline; }
.unconfirmed { color: #555; font-style: italic; font-weight: normal; }

.technical-sheet { margin-top: 50px; background: rgba(255,255,255,0.02); padding: 30px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
.tech-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
.tech-item { display: flex; flex-direction: column; gap: 4px; }
.tech-item .label { font-size: 0.6rem; font-weight: 800; color: var(--primary); text-transform: uppercase; }
.tech-item .value { font-size: 1rem; font-weight: 700; color: #fff; }

.loader { text-align: center; padding: 100px; color: var(--primary); font-weight: 800; }
.spinner { width: 40px; height: 40px; border: 4px solid #262626; border-top: 4px solid var(--primary); border-radius: 50%; margin: 0 auto 15px; animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

@media (max-width: 900px) {
  .main-content { flex-direction: column; align-items: center; }
  .sidebar { width: 100%; max-width: 250px; margin-bottom: 20px; }
  .movie-header h1 { font-size: 2.2rem; text-align: center; }
  .sub-header { justify-content: center; }
  .synopsis-text { text-align: center; }
  .section-label { justify-content: center; }
  .tech-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 600px) {
  .page-detail { padding: 20px 10px; }
  .cast-table th, .cast-table td { padding: 10px 8px; font-size: 0.7rem; }
  .role-name { font-size: 0.65rem; }
  .tech-grid { grid-template-columns: 1fr; }
}
</style>