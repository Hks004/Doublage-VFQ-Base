const openDB = () => {
  return new Promise((resolve, reject) => {
    if (!process.client) return reject(new Error('SSR'))
    const request = indexedDB.open('VfqCacheDB', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('movies_store')) {
        db.createObjectStore('movies_store')
      }
    }
  })
}

const getFromIDB = async (key) => {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const transaction = db.transaction('movies_store', 'readonly')
      const store = transaction.objectStore('movies_store')
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    })
  } catch (e) {
    return null
  }
}

const setToIDB = async (key, value) => {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('movies_store', 'readwrite')
      const store = transaction.objectStore('movies_store')
      const request = store.put(value, key)
      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    console.error("Erreur d'écriture IndexedDB :", e)
  }
}

export const useVfqMovies = () => {
  const supabase = useSupabaseClient()

  const movies = useState('vfq-movies-cache', () => [])
  const isLoading = useState('vfq-movies-loading', () => false)
  const hasLoaded = useState('vfq-movies-loaded', () => false)

  const fetchMovies = async (forceRefresh = false) => {
    // 1. Si la mémoire est vide, on va chercher async/await dans IndexedDB en premier
    if (!forceRefresh && movies.value.length === 0 && process.client) {
      const cachedData = await getFromIDB('vfq_movies_data')
      if (cachedData && cachedData.length > 0) {
        movies.value = cachedData
        hasLoaded.value = true
      }
    }

    // 2. Vérification TTL (30 minutes) + synchronisation chirurgicale
    if (!forceRefresh && hasLoaded.value && movies.value.length > 0 && process.client) {
      const lastCheck = localStorage.getItem('vfq_vfq_last_check')
      const now = Date.now()
      const THIRTY_MINUTES = 30 * 60 * 1000

      // Si vérifié il y a moins de 30 minutes, on skip totalement Supabase !
      if (lastCheck && (now - parseInt(lastCheck)) < THIRTY_MINUTES) {
        return 
      }

      try {
        // On récupère le updated_at le plus récent de la table
        const { data, error } = await supabase
          .from('fiches_vfq')
          .select('updated_at')
          .order('updated_at', { ascending: false })
          .limit(1)

        if (!error && data && data.length > 0) {
          const latestServerUpdate = data[0].updated_at
          const cachedServerUpdate = localStorage.getItem('vfq_last_updated_at')

          // Si la date serveur est identique, le cache est 100% valide (0 Mo téléchargé)
          if (cachedServerUpdate && cachedServerUpdate === latestServerUpdate) {
            localStorage.setItem('vfq_vfq_last_check', now.toString())
            return 
          }

          // SINON : Des modifications ont eu lieu ! On fait une mise à jour chirurgicale.
          // Au lieu de tout re-télécharger, on va chercher UNIQUEMENT les fiches modifiées depuis notre dernière ref.
          const lastSyncTime = localStorage.getItem('vfq_last_sync_timestamp') || '1970-01-01T00:00:00.000Z'
          
          const { data: updatedRows, error: updateError } = await supabase
            .from('fiches_vfq')
            .select('*')
            .gt('updated_at', lastSyncTime)

          if (!updateError && updatedRows && updatedRows.length > 0) {
            // On met à jour ou ajoute les fiches modifiées directement dans notre tableau en mémoire
            const movieMap = new Map(movies.value.map(m => [m.id, m])) // Assure-toi que ton ID s'appelle bien 'id', ajuste si c'est 'id_fiche' par exemple
            
            updatedRows.forEach(row => {
              movieMap.set(row.id, row) // Remplace l'ancienne version par la nouvelle
            })

            movies.value = Array.from(movieMap.values())

            // On sauvegarde le nouveau tableau propre dans l'IndexedDB
            await setToIDB('vfq_movies_data', movies.value)
          }

          // On met à jour les repères temporels
          localStorage.setItem('vfq_last_updated_at', latestServerUpdate)
          localStorage.setItem('vfq_last_sync_timestamp', new Date().toISOString())
          localStorage.setItem('vfq_vfq_last_check', now.toString())
          return // Fin du processus chirurgical, egress minimaliste !
        }
      } catch (e) {
        console.error("Erreur lors de la sync chirurgicale :", e)
        // En cas de pépin, on laisse passer vers le chargement complet de secours
      }
    }

    // 3. Téléchargement complet initial (si l'IndexedDB était totalement vide)
    isLoading.value = true
    let allRows = []
    let page = 0
    const pageSize = 2500
    let fetchMore = true

    try {
      while (fetchMore) {
        const { data, error } = await supabase
          .from('fiches_vfq')
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) throw error

        if (data && data.length > 0) {
          allRows.push(...data)
          if (data.length < pageSize) {
            fetchMore = false
          } else {
            page++
          }
        } else {
          fetchMore = false
        }
      }
      
      movies.value = allRows
      hasLoaded.value = true

      // Sauvegarde initiale dans IndexedDB et marquage des repères
      if (process.client) {
        await setToIDB('vfq_movies_data', allRows)
        localStorage.setItem('vfq_vfq_last_check', Date.now().toString())
        localStorage.setItem('vfq_last_sync_timestamp', new Date().toISOString())

        const { data: latestData } = await supabase
          .from('fiches_vfq')
          .select('updated_at')
          .order('updated_at', { ascending: false })
          .limit(1)
        
        if (latestData && latestData.length > 0) {
          localStorage.setItem('vfq_last_updated_at', latestData[0].updated_at)
        }
      }

    } catch (err) {
      console.error("Erreur de chargement du catalogue :", err)
    } finally {
      isLoading.value = false
    }
  }

  return {
    movies,
    allMovies: movies,
    allMoviesCatalog: movies,
    isLoading,
    loading: isLoading,
    directLoading: isLoading,
    fetchMovies
  }
}