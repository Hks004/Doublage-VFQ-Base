<script setup>
const supabase = useSupabaseClient()
const router = useRouter()

const sortType = useState('vfq_catalog_sort', () => 'default')
const selectedYear = useState('vfq_catalog_year', () => '')

const displayLimit = ref(40)

const allMovies = useState('vfq_catalog_all_movies', () => null)

// Chargement asynchrone non bloquant pour rendre le clic instantané
const { pending: loading, refresh: fetchAllMovies } = await useLazyAsyncData('vfq-all-movies', async () => {
  if (allMovies.value) {
    smartBackgroundSync()
    return allMovies.value
  }

  let allData = []
  let rangeStep = 1000
  let from = 0
  let keepFetching = true

  while (keepFetching) {
    const { data, error } = await supabase
      .from('fiches_vfq')
      .select('*')
      .order('id', { ascending: false })
      .range(from, from + rangeStep - 1)

    if (error || !data || data.length === 0) {
      keepFetching = false
    } else {
      allData = allData.concat(data)
      if (data.length < rangeStep) {
        keepFetching = false
      } else {
        from += rangeStep
      }
    }
  }

  allMovies.value = allData
  return allData
}, {
  server: false
})

const smartBackgroundSync = async () => {
  if (!allMovies.value || allMovies.value.length === 0) return

  const { data, error } = await supabase
    .from('fiches_vfq')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)

  if (!error && data && data.length > 0) {
    const latestDbId = data[0].id
    const cachedLatestId = Math.max(...allMovies.value.map(m => Number(m.id) || 0))

    if (latestDbId > cachedLatestId) {
      fetchAllMovies(true)
    }
  }
}

const navigateIfNoSelection = (movieId) => {
  const selection = window.getSelection().toString()
  if (!selection) {
    router.push('/film/' + movieId)
  }
}

const extractYear = (m) => {
  const val = m.theatrical_release || m.theatricalRelease || m.extra?.theatricalRelease || m.extra_data?.theatricalRelease
  if (!val) return null
  const match = val.toString().match(/\d{4}/)
  return match ? match[0] : null
}

const availableYears = computed(() => {
  if (!allMovies.value) return []
  const years = allMovies.value
    .map(m => extractYear(m))
    .filter(y => y !== null)
  return [...new Set(years)].sort((a, b) => Number(b) - Number(a))
})

const filtered = computed(() => {
  if (!allMovies.value) return []
  
  let list = allMovies.value.filter(m => {
    const year = extractYear(m)
    return selectedYear.value === '' || String(year) === String(selectedYear.value)
  })
  
  if (sortType.value === 'default') {
    list.sort((a, b) => Number(a.id) - Number(b.id))
  } else if (sortType.value === 'recent') {
    list.sort((a, b) => Number(b.id) - Number(a.id))
  } else if (sortType.value === 'vfq') {
    list.sort((a, b) => {
      const nameA = (a.translated_name || a.translatedName || a.extra?.translatedName || a.extra_data?.translatedName || '').toLowerCase()
      const nameB = (b.translated_name || b.translatedName || b.extra?.translatedName || b.extra_data?.translatedName || '').toLowerCase()
      return nameA.localeCompare(nameB, 'fr')
    })
  } else if (sortType.value === 'original') {
    list.sort((a, b) => {
      const nameA = (a.original_name || a.originalName || a.extra?.originalName || a.extra_data?.originalName || '').toLowerCase()
      const nameB = (b.original_name || b.originalName || b.extra?.originalName || b.extra_data?.originalName || '').toLowerCase()
      return nameA.localeCompare(nameB, 'en')
    })
  }
  return list
})

const visibleItems = computed(() => {
  return filtered.value.slice(0, displayLimit.value)
})

const loadMore = () => {
  if (displayLimit.value < filtered.value.length) {
    displayLimit.value += 40
  }
}

const handleScroll = () => {
  const scrollHeight = document.documentElement.scrollHeight
  const scrollTop = document.documentElement.scrollTop
  const clientHeight = window.innerHeight
  
  if (scrollTop + clientHeight >= scrollHeight - 600) { 
    loadMore()
  }
}

watch([sortType, selectedYear], () => {
  displayLimit.value = 40
  if (process.client) {
    window.scrollTo(0, 0)
  }
})

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

const getPoster = (m) => {
  const baseUrl = 'https://image.tmdb.org/t/p/w342'
  const path = m.poster_path || m.posterPath || m.extra?.posterPath || m.extra_data?.posterPath
  return path ? (baseUrl + path) : null
}

const isAnimation = (movie) => {
  return movie.category === 'Animation/jeunesse' || movie.extra_data?.projectType === 'Animation/jeunesse'
}

useHead({
  title: 'Tout le Catalogue - Doublage Québec'
})
</script>

<template>
  <div class="page" v-if="!loading">
    <div class="centered-wrapper">
      <div class="header-section">
        <div class="title-area">
          <h1>Tout le Catalogue</h1>
          <p class="count">{{ filtered.length }} titres répertoriés</p>
        </div>
        
        <div class="controls">
          <div class="select-group">
            <label>Ordre</label>
            <select v-model="sortType">
              <option value="default">Par défaut</option>
              <option value="recent">Ajouts récents</option>
              <option value="vfq">A-Z (VFQ)</option>
              <option value="original">A-Z (Original)</option>
            </select>
          </div>
          <div class="select-group">
            <label>Année</label>
            <select v-model="selectedYear">
              <option value="">Toutes les années</option>
              <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="titles-grid">
        <div v-for="m in visibleItems" :key="m.id" class="movie-card">
          <NuxtLink :to="'/film/' + m.id" class="poster-link" draggable="false">
            <div class="poster-wrapper">
              <img v-if="getPoster(m)" :src="getPoster(m)" loading="lazy" draggable="false" :alt="m.translated_name || m.translatedName" />
              <div v-else class="placeholder"><span>VFQ</span></div>
              
              <div v-if="isAnimation(m)" class="type-badge">ANIMATION</div>

              <div class="overlay-mobile">
                <span class="year-label">{{ extractYear(m) || '----' }}</span>
              </div>
            </div>
          </NuxtLink>

          <div class="info" @mouseup="navigateIfNoSelection(m.id)">
            <h3 draggable="false">{{ m.translated_name || m.translatedName }}</h3>
            <p class="original-name" draggable="false">{{ m.original_name || m.originalName || m.extra?.originalName || m.extra_data?.originalName || '' }}</p>
          </div>
        </div>
      </div>

      <div v-if="displayLimit < filtered.length" class="loader-scrolling">
        Chargement de la suite...
      </div>
    </div>
  </div>
  <div v-else class="loader">Chargement...</div>
</template>

<style scoped>
.centered-wrapper { max-width: 1400px; margin: 0 auto; padding: 40px 20px; }
.header-section { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 50px; border-left: 4px solid var(--primary, #2563eb); padding-left: 20px; }
.title-area h1 { font-size: 3rem; font-weight: 900; margin: 0; text-transform: none; color: #fff; }
.count { color: #666; font-weight: 800; font-size: 0.9rem; margin-top: 5px; }

.controls { display: flex; gap: 20px; }
.select-group { display: flex; flex-direction: column; gap: 8px; }
.select-group label { font-size: 0.7rem; text-transform: none; color: #666; font-weight: 800; letter-spacing: 1px; }
select { background: #1a1a1a; color: #fff; border: 1px solid #333; padding: 10px 15px; border-radius: 8px; min-width: 180px; outline: none; font-weight: 600; cursor: pointer; }

.titles-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 30px 20px; }
.movie-card { display: flex; flex-direction: column; min-width: 0; }

.poster-link { text-decoration: none; display: block; transition: transform 0.3s ease; }
.poster-link:hover { transform: scale(1.02); }

.poster-wrapper { position: relative; aspect-ratio: 2/3; border-radius: 8px; overflow: hidden; background: #171717; border: 1px solid rgba(255,255,255,0.05); }
.poster-wrapper img { width: 100%; height: 100%; object-fit: cover; -webkit-user-drag: none; }
.placeholder { height: 100%; display: flex; align-items: center; justify-content: center; background: #1a1a1a; }
.placeholder span { font-size: 2rem; color: #262626; font-weight: 900; letter-spacing: -1px; }

.type-badge { position: absolute; top: 8px; right: 8px; background: rgba(0, 0, 0, 0.8); color: var(--primary, #2563eb); font-size: 0.55rem; font-weight: 900; padding: 3px 7px; border-radius: 4px; border: 1px solid var(--primary, #2563eb); z-index: 3; }

.overlay-mobile { position: absolute; bottom: 5px; left: 5px; z-index: 2; }
.year-label { color: #fff; font-weight: 900; font-size: 0.6rem; background: var(--primary, #2563eb); padding: 2px 5px; border-radius: 3px; }

.info { margin-top: 8px; cursor: pointer; }
.info h3 { 
    color: #fff; font-size: 0.8rem; font-weight: 700; margin: 0; line-height: 1.2; text-transform: none;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    user-select: text; -webkit-user-select: text; transition: color 0.2s ease;
}
.original-name { 
    color: #888; font-size: 0.72rem; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    user-select: text; -webkit-user-select: text; font-weight: 500; transition: all 0.2s ease;
}

.movie-card:hover .original-name { color: #ccc; }
.movie-card:hover h3 { color: var(--primary, #2563eb); }

.loader { text-align: center; padding: 100px; color: var(--primary, #2563eb); font-weight: 800; }
.loader-scrolling { text-align: center; padding: 40px; color: #444; font-weight: 800; font-size: 0.8rem; text-transform: none; letter-spacing: 2px; }

@media (max-width: 1000px) { .titles-grid { grid-template-columns: repeat(4, 1fr); gap: 20px 12px; } .title-area h1 { font-size: 2.2rem; } }
@media (max-width: 700px) {
  .centered-wrapper { padding: 20px 10px; }
  .header-section { flex-direction: column; align-items: flex-start; gap: 15px; margin-bottom: 25px; }
  .title-area h1 { font-size: 1.8rem; }
  .controls { width: 100%; gap: 10px; }
  .select-group { flex: 1; }
  select { min-width: 0; width: 100%; padding: 8px; font-size: 0.75rem; }
  .titles-grid { grid-template-columns: repeat(3, 1fr); gap: 15px 8px; }
}
@media (max-width: 450px) { .info h3 { font-size: 0.7rem; } .titles-grid { gap: 10px 6px; } }
</style>