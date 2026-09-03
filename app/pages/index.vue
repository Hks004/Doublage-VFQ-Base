<script setup>
const supabase = useSupabaseClient()
const router = useRouter()

// 1. On récupère le catalogue global en mémoire avec Nuxt (non bloquant)
const allMoviesCatalog = useState('vfq_all_movies_comediens', () => null)

// Chargement asynchrone non bloquant (instantané au clic)
const { pending: loading, refresh: fetchCatalog } = await useLazyAsyncData('vfq-home-catalog', async () => {
  if (allMoviesCatalog.value && allMoviesCatalog.value.length > 0) {
    return allMoviesCatalog.value
  }

  let allData = []
  let page = 0
  const pageSize = 1000
  let fetchMore = true

  while (fetchMore) {
    const { data, error } = await supabase
      .from('fiches_vfq')
      .select('*')
      .order('id', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error || !data || data.length === 0) {
      fetchMore = false
    } else {
      allData = allData.concat(data)
      if (data.length < pageSize) {
        fetchMore = false
      } else {
        page++
      }
    }
  }

  allMoviesCatalog.value = allData
  return allData
}, {
  server: false
})

// 2. Extraire les 5 derniers films triés par ID décroissant depuis le cache
const derniersAjouts = computed(() => {
  const data = allMoviesCatalog.value
  if (!data || data.length === 0) return []
  return [...data]
    .sort((a, b) => (b.id || 0) - (a.id || 0))
    .slice(0, 5)
})

// 3. Calculer le top des comédiens actifs
const topComediens = computed(() => {
  const data = allMoviesCatalog.value
  if (!data || data.length === 0) return []
  
  const counts = {}

  data.forEach(m => {
    const castList = m.cast_data || m.cast || m.extra_data?.cast
    
    if (Array.isArray(castList)) {
      castList.forEach(c => {
        let doubleur = ''
        if (typeof c === 'string') {
          doubleur = c
        } else if (c && typeof c === 'object') {
          doubleur = c.doubleVFQ || c.double_vfq || c.doubleur || c.nom || c.name || c.actor || c.voix
        }
        
        if (doubleur && typeof doubleur === 'string') {
          const nom = doubleur.trim()
          const nomLower = nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          const isAConfirmer = nomLower.includes('a confirmer') || nomLower.includes('confirmer')
          
          if (nom && !isAConfirmer) {
            counts[nom] = (counts[nom] || 0) + 1
          }
        }
      })
    }
  })

  return Object.keys(counts)
    .map(nom => ({ nom, count: counts[nom] }))
    .sort((a, b) => b.count - a.count || a.nom.localeCompare(b.nom, 'fr'))
    .slice(0, 6)
})

const navigateSafely = (e, route) => {
  const selection = window.getSelection().toString()
  if (selection.length > 0) {
    e.preventDefault()
    return
  }
  if (e.button !== 1) {
    router.push(route)
  }
}

const getMovieId = (m) => m.id || m._id
const getTranslatedName = (m) => m.translated_name || m.translatedName || m.title || 'Titre inconnu'
const getOriginalName = (m) => m.original_name || m.originalName || m.originalTitle || ''
const getReleaseDate = (m) => m.theatrical_release || m.release_year || m.extra_data?.theatricalRelease || m.extra?.theatricalRelease || ''

const getPosterUrl = (m) => {
  const path = m.poster_path || m.posterPath || m.extra_data?.posterPath || m.extra?.posterPath
  if (!path) return null
  return path.startsWith('http') ? path : `https://image.tmdb.org/t/p/w300${path}`
}

const truncate = (str, max = 28) => str && str.length > max ? str.slice(0, max) + "..." : str

const extractYear = (m) => {
  const val = getReleaseDate(m)
  if (!val) return '----'
  const match = val.toString().match(/\d{4}/)
  return match ? match[0] : '----'
}

useHead({
  title: 'Accueil - Doublage VFQ'
})
</script>

<template>
  <div class="home-page">
    <div v-if="!loading" class="container">
      
      <section class="hero-section">
        <h1>Bienvenue sur ⚜ Doublage<span>VFQ</span></h1>
        <p>Votre base de données de référence pour le doublage québécois. Retrouvez les fiches de vos films, séries et comédiens préférés.</p>
      </section>

      <section class="section">
        <div class="section-header">
          <h2 class="section-title">DERNIERS AJOUTS</h2>
          <NuxtLink to="/catalogue" class="btn-voir-tout">VOIR TOUT</NuxtLink>
        </div>
        
        <div class="grid-posters" v-if="derniersAjouts && derniersAjouts.length > 0">
          <NuxtLink 
            v-for="m in derniersAjouts" 
            :key="getMovieId(m)" 
            :to="'/film/' + getMovieId(m)"
            @click="navigateSafely($event, '/film/' + getMovieId(m))"
            class="poster-card"
            draggable="false"
          >
            <div class="poster-img-wrapper" draggable="false">
              <img v-if="getPosterUrl(m)" :src="getPosterUrl(m)" :alt="getTranslatedName(m)" loading="lazy" draggable="false">
              <div v-else class="poster-placeholder">VFQ</div>
            </div>
            <div class="poster-info">
              <span class="movie-title">{{ truncate(getTranslatedName(m)) }}</span>
              <span class="movie-original">{{ truncate(getOriginalName(m)) }}</span>
              <span class="movie-year">{{ extractYear(m) }}</span>
            </div>
          </NuxtLink>
        </div>
        <div v-else class="unconfirmed" style="padding: 20px 0;">Aucun film trouvé dans la base de données.</div>
      </section>

      <section class="section">
        <div class="section-header">
          <h2 class="section-title">COMÉDIENS LES PLUS ACTIFS</h2>
          <NuxtLink to="/comediens" class="btn-voir-tout">VOIR TOUT</NuxtLink>
        </div>

        <div class="grid-comediens" v-if="topComediens && topComediens.length > 0">
          <NuxtLink 
            v-for="(c, index) in topComediens" 
            :key="c.nom" 
            :to="'/doubleur/' + encodeURIComponent(c.nom)"
            @click="navigateSafely($event, '/doubleur/' + encodeURIComponent(c.nom))"
            class="comedien-card"
            draggable="false"
          >
            <span class="rank">{{ index + 1 }}</span>
            <div class="comedien-info">
              <span class="comedien-name">{{ c.nom }}</span>
              <span class="comedien-stats">{{ c.count }} RÔLES</span>
            </div>
            <span class="arrow">→</span>
          </NuxtLink>
        </div>
        <div v-else class="unconfirmed" style="padding: 20px 0;">Aucun comédien répertorié pour le moment.</div>
      </section>

    </div>
    
    <div v-else class="loader">
      <div class="spinner"></div>
      <p>Chargement de l'accueil...</p>
    </div>
  </div>
</template>

<style scoped>
.home-page { padding: 40px 20px; }
.container { max-width: 1400px; margin: 0 auto; }

.movie-original { 
  display: block; 
  color: #555; 
  font-size: 0.75rem; 
  font-weight: 600; 
  font-style: italic; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
  transition: color 0.3s;
}

.poster-card:hover .movie-title { color: var(--primary); }
.poster-card:hover .movie-original { color: #888; }

.hero-section { margin-bottom: 60px; border-left: 4px solid var(--primary); padding-left: 20px; }
.hero-section h1 { font-size: 2.2rem; font-weight: 900; margin: 0 0 10px 0; text-transform: uppercase; color: #fff; }
.hero-section h1 span { color: var(--primary); }
.hero-section p { color: var(--text-muted, #888); font-size: 1.1rem; max-width: 800px; margin: 0; line-height: 1.6; }

.section { margin-bottom: 60px; }
.section-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 25px;
  border-bottom: 1px solid #1a1a1a;
  padding-bottom: 15px;
}
.section-title { 
  font-size: 1.2rem; 
  font-weight: 900; 
  letter-spacing: 2px; 
  color: #fff;
  margin: 0;
  display: flex;
  align-items: center;
}
.section-title::before {
  content: ""; width: 20px; height: 2px; background: var(--primary); margin-right: 15px;
}

.btn-voir-tout {
  background: #111; border: 1px solid #333; color: var(--text-muted, #888); padding: 6px 15px; border-radius: 4px;
  font-size: 0.75rem; font-weight: 800; text-decoration: none; transition: 0.2s;
}
.btn-voir-tout:hover { background: var(--primary); color: white; border-color: var(--primary); }

.grid-posters {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
}

.poster-card { text-decoration: none; transition: transform 0.3s; display: block; }
.poster-card:hover { transform: translateY(-10px); }

.poster-img-wrapper {
  aspect-ratio: 2/3;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #262626;
  background: #1a1a1a;
  margin-bottom: 12px;
  box-shadow: 0 10px 20px rgba(0,0,0,0.3);
}
.poster-img-wrapper img { width: 100%; height: 100%; object-fit: cover; }
.poster-placeholder { 
  height: 100%; display: flex; align-items: center; justify-content: center; 
  font-weight: 900; color: #333; font-size: 1.5rem; 
}

.movie-title { display: block; color: white; font-weight: 700; font-size: 0.95rem; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color 0.3s; }
.movie-year { display: block; color: var(--primary); font-size: 0.8rem; font-weight: 800; }

.grid-comediens {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.comedien-card {
  background: #111; border: 1px solid #1a1a1a; border-radius: 8px; padding: 15px 20px;
  display: flex; align-items: center; text-decoration: none; transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.comedien-card:hover { background: #161616; border-color: var(--primary); transform: translateX(8px); }
.rank { font-size: 1.2rem; font-weight: 900; color: var(--primary); margin-right: 20px; opacity: 0.5; width: 25px; }
.comedien-info { flex: 1; }
.comedien-name { display: block; color: white; font-weight: 700; font-size: 1rem; }
.comedien-stats { display: block; color: #555; font-size: 0.75rem; font-weight: 800; margin-top: 2px; text-transform: uppercase; }
.arrow { color: #222; font-size: 1.2rem; transition: 0.2s; }
.comedien-card:hover .arrow { color: var(--primary); transform: translateX(3px); }

.unconfirmed { color: #555; font-style: italic; font-weight: normal; }

.loader { text-align: center; padding: 100px; color: var(--primary); font-weight: 800; }
.spinner { width: 40px; height: 40px; border: 4px solid #262626; border-top: 4px solid var(--primary); border-radius: 50%; margin: 0 auto 15px; animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

@media (max-width: 1200px) { .grid-posters { grid-template-columns: repeat(4, 1fr); } }
@media (max-width: 900px) { .grid-posters { grid-template-columns: repeat(3, 1fr); } .grid-comediens { grid-template-columns: repeat(2, 1fr); } .hero-section h1 { font-size: 1.8rem; } }
@media (max-width: 650px) {
  .poster-img-wrapper { height: 260px; aspect-ratio: unset; }
  .home-page { padding: 20px 15px; }
  .grid-posters { grid-template-columns: repeat(2, 1fr); gap: 15px; }
  .grid-comediens { grid-template-columns: 1fr; }
  .movie-title { white-space: normal; line-height: 1.2; height: 2.4em; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
}
@media (max-width: 400px) { .hero-section h1 { font-size: 1.4rem; } .grid-posters { gap: 10px; } }
</style>