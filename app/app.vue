<script setup>
const supabase = useSupabaseClient()
const router = useRouter()

const allData = useState('vfq_all_movies_comediens', () => [])
const searchQuery = ref('')
const showResults = ref(false)
const searchWrapper = ref(null)
const isMenuOpen = ref(false)

// Variable pour gérer l'affichage de l'écran de chargement initial
const isInitialLoading = ref(true)

const toggleMenu = () => { isMenuOpen.value = !isMenuOpen.value }
const closeMenu = () => { isMenuOpen.value = false }

const handleClickOutside = (event) => {
  if (showResults.value && searchWrapper.value && !searchWrapper.value.contains(event.target)) {
    showResults.value = false
  }
}

onMounted(async () => {
  window.addEventListener('click', handleClickOutside)

  try {
    // Si le useState est déjà rempli, on coupe direct le chargement
    if (allData.value && allData.value.length > 0) {
      isInitialLoading.value = false
      return
    }

    // On télécharge la base complète en arrière-plan
    let allRows = []
    let page = 0
    const pageSize = 1000
    let fetchMore = true

    while (fetchMore) {
      const { data, error } = await supabase
        .from('fiches_vfq')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) throw error

      if (data && data.length > 0) {
        allRows = allRows.concat(data)
        if (data.length < pageSize) {
          fetchMore = false
        } else {
          page++
        }
      } else {
        fetchMore = false
      }
    }

    allData.value = allRows
  } catch (error) {
    console.error("Erreur de chargement Supabase:", error)
  } finally {
    // Dans tous les cas (succès ou erreur), on retire l'écran de chargement
    isInitialLoading.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})

const getPosterUrl = (posterPath) => {
  if (!posterPath) return null
  return posterPath.startsWith('http') ? posterPath : `https://image.tmdb.org/t/p/w92${posterPath}`
}

const liveResults = computed(() => {
  const rawQuery = searchQuery.value.trim()
  const dataList = allData.value || []
  if (rawQuery.length < 1 || dataList.length === 0) return { movies: [], vfq: [], actors: [] }
  
  const s = rawQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  
  const movies = []
  const vfqSet = new Set()
  const actorSet = new Set()

  dataList.forEach(m => {
    const tNameRaw = m.translated_name || ''
    const oNameRaw = m.original_name || ''
    const pTypeRaw = m.project_type || ''

    const tName = tNameRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    const oName = oNameRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    const pType = pTypeRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

    const matchesMovie = tName.includes(s) || oName.includes(s) || pType.includes(s)

    if (matchesMovie && movies.length < 50) {
      movies.push(m)
    }

    const castList = m.cast_data || m.cast || m.casting
    let castArray = []
    
    if (typeof castList === 'string') {
      try { castArray = JSON.parse(castList) } catch (e) { castArray = [] }
    } else if (Array.isArray(castList)) {
      castArray = castList
    }

    castArray.forEach(c => {
      if (!c) return
      
      let vfqName = c.doubleVFQ || c.double_vfq || c.doubleur || c.comedien || c.voice || c.nom || c.name || ''
      let actorName = c.actor || c.original_actor || c.actorName || ''

      vfqName = typeof vfqName === 'string' ? vfqName.trim() : ''
      actorName = typeof actorName === 'string' ? actorName.trim() : ''

      const vfqLower = vfqName.toLowerCase()
      const actorLower = actorName.toLowerCase()
      
      const vfqNorm = vfqLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      const actorNorm = actorLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

      const isAConfirmer = vfqNorm.includes('a confirmer') || vfqNorm.includes('confirmer')

      if (vfqName && !isAConfirmer && vfqLower !== 'voix' && vfqLower !== '—' && vfqLower !== '-' && vfqNorm.includes(s)) {
        vfqSet.add(vfqName)
      }
      if (actorName && actorNorm.includes(s)) {
        actorSet.add(actorName)
      }
    })
  })

  return { 
    movies, 
    vfq: Array.from(vfqSet).slice(0, 10), 
    actors: Array.from(actorSet).slice(0, 10) 
  }
})

const selectMovie = (id) => {
  showResults.value = false
  searchQuery.value = '' 
  router.push(`/film/${id}`)
}

const selectPerson = (name, type) => {
  showResults.value = false
  searchQuery.value = '' 
  const encodedName = encodeURIComponent(name)
  if (type === 'actor') {
    router.push(`/acteur-original/${encodedName}`)
  } else {
    router.push(`/doubleur/${encodedName}`)
  }
}
</script>

<template>
  <!-- Écran de chargement global pendant la récupération initiale -->
  <div v-if="isInitialLoading" class="initial-loading-screen">
    <div class="loader-content">
      <div class="spinner"></div>
      <p>🎬 Chargement de la base de données...</p>
    </div>
  </div>

  <!-- Le site normal s'affiche une fois le chargement terminé -->
  <div id="layout" v-else>
    <nav class="nav">
      <div class="nav-content">
        <div class="nav-header">
          <NuxtLink to="/" class="logo" @click="closeMenu">⚜ Doublage<span>VFQ</span></NuxtLink>
          <button class="hamburger" :class="{ 'is-active': isMenuOpen }" @click.stop="toggleMenu">
            <span></span><span></span><span></span>
          </button>
        </div>

        <div class="search-wrapper" ref="searchWrapper">
          <div class="search-bar">
            <span class="search-icon">🔍</span>
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Film, série, acteur ou doubleur..." 
              @focus="showResults = true"
              @input="showResults = true"
            >
          </div>

          <transition name="fade">
            <div v-if="showResults && (liveResults.movies.length > 0 || liveResults.vfq.length > 0 || liveResults.actors.length > 0)" class="search-dropdown">
              <div v-if="liveResults.vfq.length > 0" class="search-section">
                <div class="section-label">Doubleurs VFQ</div>
                <div v-for="name in liveResults.vfq" :key="'vfq-'+name" class="dropdown-item person-item" @click="selectPerson(name, 'vfq')">
                  <div class="person-icon vfq-icon">⚜</div>
                  <div class="item-info"><div class="item-title">{{ name }}</div></div>
                </div>
              </div>
              <div v-if="liveResults.actors.length > 0" class="search-section">
                <div class="section-label">Acteurs Originaux</div>
                <div v-for="name in liveResults.actors" :key="'act-'+name" class="dropdown-item person-item" @click="selectPerson(name, 'actor')">
                  <div class="person-icon">👤</div>
                  <div class="item-info"><div class="item-title">{{ name }}</div></div>
                </div>
              </div>
              <div v-if="liveResults.movies.length > 0" class="search-section">
                <div class="section-label">Films & Séries</div>
                <div v-for="movie in liveResults.movies" :key="movie.id" class="dropdown-item" @click="selectMovie(movie.id)">
                  <img v-if="movie.poster_path" :src="getPosterUrl(movie.poster_path)" class="item-poster">
                  <div v-else class="item-poster-placeholder">VFQ</div>
                  <div class="item-info">
                    <div class="item-title">{{ movie.translated_name }}</div>
                    <div class="item-sub">{{ movie.original_name }}</div>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>

        <div class="links" :class="{ 'is-open': isMenuOpen }">
          <NuxtLink to="/catalogue" @click="closeMenu">Tout</NuxtLink> 
          <NuxtLink to="/films" @click="closeMenu">Films</NuxtLink>
          <NuxtLink to="/series" @click="closeMenu">Séries</NuxtLink>
          <NuxtLink to="/animation" @click="closeMenu">Animation</NuxtLink>
          <NuxtLink to="/comediens" @click="closeMenu">Comédiens</NuxtLink>
          <NuxtLink to="/soumettre" @click="closeMenu" class="btn-soumettre">Soumettre</NuxtLink>
        </div>
      </div>
    </nav>
    
    <main class="main-container" @click="closeMenu">
      <NuxtPage />
    </main>

    <footer class="footer">
      <div class="footer-content">
        <div class="footer-left">
          <NuxtLink to="/" class="logo-small">⚜ Doublage<span>VFQ</span></NuxtLink>
          <p class="copyright">&copy; 2026 • Tous droits réservés</p>
        </div>
        <div class="footer-nav">
          <NuxtLink to="/catalogue">Tout</NuxtLink>
          <NuxtLink to="/films">Films</NuxtLink>
          <NuxtLink to="/series">Séries</NuxtLink>
          <NuxtLink to="/animation">Animation</NuxtLink>
          <NuxtLink to="/comediens">Comédiens</NuxtLink>
          <NuxtLink to="/soumettre">Soumettre</NuxtLink>
          <a href="https://www.themoviedb.org/" target="_blank" rel="noopener">TMDB</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
:root {
  --primary: #2563eb;
  --bg: #0a0a0a;
  --nav-bg: #111111;
  --text: #ffffff;
  --text-muted: #666;
}
body { margin: 0; background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; }
#layout { display: flex; flex-direction: column; min-height: 100vh; }
.main-container { flex: 1; }

/* Styles pour l'écran de chargement initial */
.initial-loading-screen {
  min-height: 100vh;
  background-color: var(--bg);
  color: var(--text);
  display: flex;
  justify-content: center;
  align-items: center;
}
.loader-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  font-weight: 600;
  font-size: 1.1rem;
  color: #818cf8;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #222;
  border-top: 4px solid var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { 100% { transform: rotate(360deg); } }

.nav { height: 70px; background: var(--nav-bg); border-bottom: 1px solid #262626; position: sticky; top: 0; z-index: 1000; display: flex; align-items: center; }
.nav-content { max-width: 1400px; margin: 0 auto; width: 100%; padding: 0 20px; display: flex; align-items: center; justify-content: space-between; position: relative; }
.nav-header { display: flex; align-items: center; justify-content: space-between; }

.logo { font-size: 1.3rem; font-weight: 800; text-decoration: none; color: white; flex-shrink: 0; }
.logo span { color: var(--primary); }

.search-wrapper { position: relative; width: 500px; margin: 0 20px; }
.search-bar { background: #1a1a1a; border: 1px solid #333; padding: 10px 15px; border-radius: 8px; display: flex; align-items: center; gap: 10px; }
.search-bar input { background: transparent; border: none; color: white; outline: none; width: 100%; font-size: 0.95rem; }

.links { display: flex; align-items: center; gap: 20px; flex-shrink: 0; }
.links a { color: var(--text-muted); text-decoration: none; font-size: 0.85rem; font-weight: 600; transition: 0.2s; }
.links a:hover, .links a.router-link-active { color: var(--primary); }

.links a.btn-soumettre {
  background: var(--primary);
  color: white;
  padding: 6px 14px;
  border-radius: 6px;
  transition: opacity 0.2s;
}
.links a.btn-soumettre:hover, 
.links a.btn-soumettre.router-link-active {
  color: white;
  opacity: 0.85;
}

.search-dropdown { position: absolute; top: calc(100% + 10px); left: 0; width: 100%; max-height: 600px; background: #151515; border: 1px solid #333; border-radius: 8px; overflow-y: auto; z-index: 1001; }
.search-section { padding: 10px 0; border-bottom: 1px solid #262626; }
.section-label { padding: 5px 15px 10px; font-size: 0.7rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 1px; }
.dropdown-item { display: flex; align-items: center; padding: 10px 15px; cursor: pointer; gap: 15px; }
.dropdown-item:hover { background: #1e1e1e; }
.item-poster { width: 40px; height: 58px; border-radius: 4px; object-fit: cover; }
.item-poster-placeholder { width: 40px; height: 58px; border-radius: 4px; background: #222; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; color: #555; }
.person-icon { width: 40px; height: 40px; background: #222; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
.vfq-icon { color: var(--primary); border: 1px solid var(--primary); }

.item-info { display: flex; flex-direction: column; gap: 2px; }
.item-title { color: #fff; font-weight: 700; font-size: 0.95rem; }
.item-sub { color: #666; font-size: 0.75rem; font-style: italic; }

.footer { background: var(--nav-bg); border-top: 1px solid #262626; padding: 40px 20px; margin-top: 60px; }
.footer-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
.logo-small { text-decoration: none; color: white; font-weight: 800; font-size: 1.1rem; }
.logo-small span { color: var(--primary); }
.copyright { color: #444; font-size: 0.75rem; margin: 5px 0 0 0; font-weight: 600; }
.footer-nav { display: flex; gap: 20px; }
.footer-nav a {color: var(--text-muted); text-decoration: none; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

.hamburger { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; }
.hamburger span { width: 22px; height: 2px; background: white; transition: 0.3s; }
.hamburger.is-active span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.hamburger.is-active span:nth-child(2) { opacity: 0; }
.hamburger.is-active span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

@media (max-width: 950px) {
  .nav-content { flex-direction: column; align-items: stretch; height: auto; padding: 15px 20px; }
  .nav-header { width: 100%; display: flex; justify-content: space-between; margin-bottom: 10px; }
  .hamburger { display: flex; }
  .search-wrapper { width: 100%; margin: 0; }
  .links {
    position: absolute; top: 100%; right: 20px; left: 20px; width: auto; 
    background: #161616; flex-direction: column; padding: 15px; gap: 5px; 
    border-radius: 12px; border: 1px solid #333; opacity: 0; 
    transform: translateY(-10px); pointer-events: none; transition: 0.3s; z-index: 2000;
  }
  .links.is-open { opacity: 1; transform: translateY(10px); pointer-events: auto; }
  .links a { padding: 12px; border-bottom: 1px solid #222; width: 100%; box-sizing: border-box; }
  .links a.btn-soumettre { text-align: center; margin-top: 5px; }
  .footer-content { flex-direction: column; gap: 20px; text-align: center; }
  .footer-nav { flex-wrap: wrap; justify-content: center; }
}
</style>