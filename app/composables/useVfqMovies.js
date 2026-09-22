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
    // 1. Si la mémoire est vide, on va cherché synchrone/await dans IndexedDB en premier
    if (!forceRefresh && movies.value.length === 0 && process.client) {
      const cachedData = await getFromIDB('vfq_movies_data')
      if (cachedData && cachedData.length > 0) {
        movies.value = cachedData
        hasLoaded.value = true
      }
    }

    // 2. Si on a maintenant les données, on fait la vérification HEAD ultra-légère
    if (!forceRefresh && hasLoaded.value && movies.value.length > 0) {
      try {
        const { count, error } = await supabase
          .from('fiches_vfq')
          .select('*', { count: 'exact', head: true })

        if (!error && count === movies.value.length) {
          return // Cache validé, 0 Mo téléchargé !
        }
      } catch (e) {
        return 
      }
    }

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

      // 3. Sauvegarde dans IndexedDB
      if (process.client) {
        await setToIDB('vfq_movies_data', allRows)
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