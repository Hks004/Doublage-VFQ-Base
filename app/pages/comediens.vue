<script setup>
const supabase = useSupabaseClient()
const router = useRouter()

const sortType = useState('vfq_comediens_sort', () => 'az')
const displayLimit = ref(40)

const allMoviesComediens = useState('vfq_all_movies_comediens', () => null)

// Chargement asynchrone non bloquant avec useLazyAsyncData et server: false
const { pending: loading, refresh: fetchAllMovies } = await useLazyAsyncData('vfq-all-movies-comediens', async () => {
  if (allMoviesComediens.value && allMoviesComediens.value.length > 0) {
    smartBackgroundSync()
    return allMoviesComediens.value
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

  allMoviesComediens.value = allData
  return allData
}, {
  server: false
})

const smartBackgroundSync = async () => {
  if (!allMoviesComediens.value || allMoviesComediens.value.length === 0) return

  const { data, error } = await supabase
    .from('fiches_vfq')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)

  if (!error && data && data.length > 0) {
    const latestDbId = data[0].id
    const cachedLatestId = Math.max(...allMoviesComediens.value.map(m => Number(m.id) || 0))

    if (latestDbId > cachedLatestId) {
      await fetchAllMovies(true)
    }
  }
}

// Calcul et agrégation des statistiques par comédien avec toutes les clés possibles
const comediensStats = computed(() => {
  if (!allMoviesComediens.value) return []

  const counts = {}

  allMoviesComediens.value.forEach(m => {
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
          if (nom) {
            counts[nom] = (counts[nom] || 0) + 1
          }
        }
      })
    }
  })

  let list = Object.keys(counts).map(nom => ({
    nom,
    count: counts[nom]
  }))

  // Logique de tri
  if (sortType.value === 'az') {
    list.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  } else if (sortType.value === 'roles_desc') {
    list.sort((a, b) => b.count - a.count || a.nom.localeCompare(b.nom, 'fr'))
  } else if (sortType.value === 'roles_asc') {
    list.sort((a, b) => a.count - b.count || a.nom.localeCompare(b.nom, 'fr'))
  }

  return list
})

// Liste tronquée pour la performance (Infinite Scroll)
const visibleComediens = computed(() => {
  return comediensStats.value.slice(0, displayLimit.value)
})

const loadMore = () => {
  if (displayLimit.value < comediensStats.value.length) {
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

watch(sortType, () => {
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

useHead({
  title: 'Comédiens VFQ - Doublage Québec'
})
</script>

<template>
  <div class="page" v-if="!loading">
    <div class="centered-wrapper">
      <div class="header-section">
        <div class="title-area">
          <h1>Comédiens VFQ</h1>
          <p class="count">{{ comediensStats.length }} artistes répertoriés</p>
        </div>

        <div class="controls">
          <div class="select-group">
            <label>Trier par</label>
            <select v-model="sortType">
              <option value="az">Nom (A à Z)</option>
              <option value="roles_desc">Plus de rôles (Décroissant)</option>
              <option value="roles_asc">Moins de rôles (Croissant)</option>
            </select>
          </div>
        </div>
      </div>

      <div class="list-container">
        <NuxtLink 
          v-for="item in visibleComediens" 
          :key="item.nom" 
          :to="'/doubleur/' + encodeURIComponent(item.nom)" 
          class="modern-item"
        >
          <div class="icon-container">
            <span class="placeholder-icon">🎙️</span>
          </div>

          <div class="content">
            <span class="name">{{ item.nom }}</span>
          </div>

          <div class="meta">
            <span class="role-badge" :class="{ 'gold': item.count > 50 }">
              {{ item.count }} {{ item.count > 1 ? 'rôles' : 'rôle' }}
            </span>
          </div>
        </NuxtLink>
      </div>

      <div v-if="displayLimit < comediensStats.length" class="loader-scrolling">
        Chargement des artistes suivants...
      </div>
    </div>
  </div>
  <div v-else class="loader">Analyse des comédiens...</div>
</template>

<style scoped>
.centered-wrapper { max-width: 1000px; margin: 0 auto; padding: 40px 20px; }

.header-section { 
  display: flex; 
  justify-content: space-between; 
  align-items: flex-end; 
  margin-bottom: 40px; 
  border-left: 4px solid var(--primary); 
  padding-left: 20px; 
}

.title-area h1 { margin: 0; font-size: 2.5rem; text-transform: none; font-weight: 900; color: #fff; }
.count { color: #666; font-size: 0.9rem; margin: 5px 0 0 0; font-weight: 700; }

.controls { display: flex; gap: 15px; }
.select-group { display: flex; flex-direction: column; gap: 8px; }
.select-group label { font-size: 0.65rem; text-transform: none; color: #666; font-weight: 800; letter-spacing: 1px; }

select { 
  background: #1a1a1a; 
  color: #fff; 
  border: 1px solid #333; 
  padding: 10px 15px; 
  border-radius: 8px; 
  cursor: pointer; 
  min-width: 240px; 
  outline: none; 
  font-weight: 600;
  transition: border-color 0.2s;
}
select:focus { border-color: var(--primary); }

.list-container { display: flex; flex-direction: column; gap: 10px; }

.modern-item { 
  display: flex; 
  align-items: center; 
  background: rgba(255, 255, 255, 0.03); 
  padding: 15px 25px; 
  border-radius: 12px; 
  text-decoration: none; 
  border: 1px solid rgba(255, 255, 255, 0.05); 
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
}

.modern-item:hover { 
  background: rgba(37, 99, 235, 0.08); 
  transform: translateX(10px); 
  border-color: var(--primary); 
}

.icon-container {
  width: 45px; height: 45px; margin-right: 20px;
  background: #111; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid #262626; flex-shrink: 0;
}
.placeholder-icon { font-size: 1.2rem; opacity: 0.6; }

.content { flex: 1; min-width: 0; }
.name { color: #fff; font-weight: 700; font-size: 1.2rem; }

.meta { display: flex; align-items: center; }

.role-badge { 
  background: #000; 
  color: var(--primary); 
  font-size: 0.75rem; 
  font-weight: 900; 
  padding: 5px 16px; 
  border-radius: 50px; 
  text-transform: none;
  border: 1px solid rgba(37, 99, 235, 0.2);
}

.gold { border-color: #ffd700; color: #ffd700 !important; }

.modern-item:hover .role-badge { background: var(--primary); color: #fff; border-color: transparent; }
.modern-item:hover .role-badge.gold { background: #ffd700; color: #000; }

.loader { text-align: center; padding: 100px; color: var(--primary); font-weight: 800; }
.loader-scrolling { text-align: center; padding: 40px; color: #444; font-weight: 800; font-size: 0.8rem; text-transform: none; letter-spacing: 2px; }

@media (max-width: 600px) {
  .centered-wrapper { padding: 20px 12px; }
  .header-section { flex-direction: column; align-items: flex-start; gap: 20px; margin-bottom: 25px; }
  .title-area h1 { font-size: 1.8rem; }
  .controls { width: 100%; }
  .select-group { width: 100%; }
  select { min-width: 0; width: 100%; padding: 12px; }
  .modern-item { padding: 12px 15px; border-radius: 10px; }
  .modern-item:hover { transform: none; }
  .icon-container { width: 35px; height: 35px; margin-right: 12px; }
  .placeholder-icon { font-size: 1rem; }
  .name { font-size: 1rem; }
  .role-badge { font-size: 0.65rem; padding: 3px 10px; }
}
</style>