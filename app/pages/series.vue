<script setup>
const supabase = useSupabaseClient()
const router = useRouter()

const sortType = useState('vfq_series_sort', () => 'default') 
const selectedYear = useState('vfq_series_year', () => '')

const allSeries = useState('vfq_all_series', () => null)
const movies = ref([])
const totalCount = ref(0)
const loadingMore = ref(false)
const page = ref(0)
const pageSize = 60
const hasMore = ref(true)
const sentinel = ref(null)

const isSeriesProject = (m) => {
  const type = m.project_type || m.projectType || m.extra?.projectType || m.extra_data?.projectType
  if (!type) return false
  
  const str = type.toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    
  return str.includes('serie') || str.includes('tv')
}

const extractYear = (m) => {
  if (m.release_year) return String(m.release_year)
  if (m.releaseYear) return String(m.releaseYear)
  
  const val = m.theatrical_release || m.theatricalRelease || m.extra_data?.theatricalRelease || m.extra?.theatricalRelease
  if (!val) return null
  const match = val.toString().match(/\d{4}/)
  return match ? match[0] : null
}

// Chargement asynchrone non bloquant pour rendre le clic instantané
const { pending: loading, refresh: fetchAllSeries } = await useLazyAsyncData('vfq-all-series', async () => {
  if (allSeries.value) {
    smartBackgroundSync()
    return allSeries.value
  }

  let allData = []
  let rangeStep = 1000
  let from = 0
  let keepFetching = true

  while (keepFetching) {
    const { data, error } = await supabase
      .from('fiches_vfq')
      .select('*')
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

  const seriesData = allData.filter(m => isSeriesProject(m))
  allSeries.value = seriesData
  return seriesData
}, {
  server: false
})

// Met à jour totalCount dès que les données changent
watch(allSeries, (newVal) => {
  if (newVal) {
    totalCount.value = newVal.length
    updateDisplayedMovies(true)
  }
}, { immediate: true })

const smartBackgroundSync = async () => {
  if (!allSeries.value || allSeries.value.length === 0) return

  const { data, error } = await supabase
    .from('fiches_vfq')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)

  if (!error && data && data.length > 0) {
    const latestDbId = data[0].id
    const cachedLatestId = Math.max(...allSeries.value.map(m => Number(m.id) || 0))

    if (latestDbId > cachedLatestId) {
      await fetchAllSeries(true)
      updateDisplayedMovies(true)
    }
  }
}

const processedSeries = computed(() => {
  if (!allSeries.value) return []
  let list = [...allSeries.value]
  
  if (selectedYear.value !== '') {
    list = list.filter(m => String(extractYear(m)) === String(selectedYear.value))
  }

  if (sortType.value === 'default') {
    list.sort((a, b) => Number(a.id) - Number(b.id))
  } else if (sortType.value === 'recent') {
    list.sort((a, b) => Number(b.id) - Number(a.id))
  } else if (sortType.value === 'vfq') {
    list.sort((a, b) => {
      const nameA = (a.translated_name || a.translatedName || '').toLowerCase()
      const nameB = (b.translated_name || b.translatedName || '').toLowerCase()
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

const updateDisplayedMovies = (reset = false) => {
  if (reset) {
    page.value = 0
  }
  const filtered = processedSeries.value
  const end = (page.value + 1) * pageSize
  
  movies.value = filtered.slice(0, end)
  hasMore.value = movies.value.length < filtered.length
}

watch([sortType, selectedYear], () => {
  updateDisplayedMovies(true)
})

onMounted(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasMore.value && !loading.value && !loadingMore.value) {
      loadMore()
    }
  }, { rootMargin: '200px' })

  if (sentinel.value) {
    observer.observe(sentinel.value)
  }

  onUnmounted(() => {
    if (sentinel.value) observer.unobserve(sentinel.value)
  })
})

const loadMore = () => {
  if (loadingMore.value || !hasMore.value || loading.value) return
  loadingMore.value = true
  page.value++
  updateDisplayedMovies(false)
  loadingMore.value = false
}

const navigateIfNoSelection = (movieId) => {
  const selection = window.getSelection().toString()
  if (!selection) {
    router.push('/film/' + movieId)
  }
}

const getPoster = (m) => {
  const baseUrl = 'https://image.tmdb.org/t/p/w342'
  const path = m.poster_path || m.posterPath || m.extra?.posterPath || m.extra_data?.posterPath
  return path ? (baseUrl + path) : null
}

const availableYears = computed(() => {
  if (!allSeries.value) return []
  const years = allSeries.value
    .map(m => extractYear(m))
    .filter(y => y !== null)
  return [...new Set(years)].sort((a, b) => b - a)
})

useHead({
  title: 'Séries Télé VFQ - Doublage Québec'
})
</script>

<template>
  <div class="page" v-if="!loading">
    <div class="centered-wrapper">
      <div class="header-section">
        <div class="title-area">
          <h1>Séries Télé</h1>
          <p class="count">{{ totalCount }} titres répertoriés</p>
        </div>
        
        <div class="controls">
          <div class="select-group">
            <label>Ordre</label>
            <select v-model="sortType">
              <option value="default">Par défaut (Premier au dernier)</option>
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
        <div v-for="movie in movies" :key="movie.id" class="movie-card">
          <NuxtLink :to="'/film/' + movie.id" class="poster-link" draggable="false">
            <div class="poster-wrapper">
              <img v-if="getPoster(movie)" :src="getPoster(movie)" loading="lazy" draggable="false" :alt="movie.translated_name || movie.translatedName" />
              <div v-else class="placeholder"><span>VFQ</span></div>
              
              <div class="overlay-mobile">
                <span class="year-label">{{ extractYear(movie) || '----' }}</span>
              </div>
            </div>
          </NuxtLink>

          <div class="info" @mouseup="navigateIfNoSelection(movie.id)">
            <h3 draggable="false">{{ movie.translated_name || movie.translatedName }}</h3>
            <p class="original-name" draggable="false">{{ movie.original_name || movie.originalName || movie.extra?.originalName || movie.extra_data?.originalName || '' }}</p>
          </div>
        </div>
      </div>

      <div ref="sentinel" class="scroll-sentinel">
        <p v-if="loadingMore" class="loading-more-text">Chargement de la suite...</p>
      </div>
    </div>
  </div>
  <div v-else class="loader">Chargement des séries...</div>
</template>

<style scoped>
.centered-wrapper { max-width: 1400px; margin: 0 auto; padding: 40px 20px; }
.header-section { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 50px; border-left: 4px solid var(--primary); padding-left: 20px; }
.title-area h1 { font-size: 3rem; font-weight: 900; margin: 0; text-transform: none; color: #fff; }
.count { color: #666; font-weight: 800; font-size: 0.9rem; margin-top: 5px; }

.controls { display: flex; gap: 20px; }
.select-group { display: flex; flex-direction: column; gap: 8px; }
.select-group label { font-size: 0.7rem; text-transform: none; color: #666; font-weight: 800; letter-spacing: 1px; }
select { background: #1a1a1a; color: #fff; border: 1px solid #333; padding: 10px 15px; border-radius: 8px; min-width: 180px; outline: none; font-weight: 600; }

.titles-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 30px 20px; }
.movie-card { display: flex; flex-direction: column; min-width: 0; }

.poster-link { text-decoration: none; display: block; transition: transform 0.3s ease; }
.poster-link:hover { transform: scale(1.02); }

.poster-wrapper { position: relative; aspect-ratio: 2/3; border-radius: 8px; overflow: hidden; background: #171717; border: 1px solid rgba(255,255,255,0.05); }
.poster-wrapper img { width: 100%; height: 100%; object-fit: cover; -webkit-user-drag: none; }
.placeholder { height: 100%; display: flex; align-items: center; justify-content: center; background: #1a1a1a; }
.placeholder span { font-size: 2rem; color: #262626; font-weight: 900; letter-spacing: -1px; }

.overlay-mobile { position: absolute; bottom: 5px; left: 5px; z-index: 2; }
.year-label { color: #fff; font-weight: 900; font-size: 0.6rem; background: var(--primary); padding: 2px 5px; border-radius: 3px; }

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
.movie-card:hover h3 { color: var(--primary); }

.scroll-sentinel { height: 60px; text-align: center; margin-top: 30px; }
.loading-more-text { color: var(--primary); font-weight: 800; font-size: 0.9rem; }

.loader { text-align: center; padding: 100px; color: var(--primary); font-weight: 800; }

/* --- RESPONSIVE --- */
@media (max-width: 1100px) { .titles-grid { grid-template-columns: repeat(4, 1fr); } }
@media (max-width: 850px) {
  .header-section { flex-direction: column; align-items: flex-start; gap: 20px; }
  .controls { width: 100%; }
  .select-group { flex: 1; }
  select { min-width: 0; width: 100%; }
  .titles-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 600px) {
  .centered-wrapper { padding: 20px 10px; }
  .title-area h1 { font-size: 1.8rem; }
  .titles-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 15px 8px; }
  .info h3 { font-size: 0.75rem; }
}
</style>