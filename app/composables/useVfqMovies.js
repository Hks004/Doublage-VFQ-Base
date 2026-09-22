export const useVfqMovies = () => {
  const supabase = useSupabaseClient()

  const movies = useState('vfq-movies-cache', () => [])
  const isLoading = useState('vfq-movies-loading', () => false)
  const hasLoaded = useState('vfq-movies-loaded', () => false)

  // 1. Au démarrage, si le useState est vide, on tente de récupérer depuis le localStorage du navigateur
  if (process.client && movies.value.length === 0) {
    try {
      const cachedData = localStorage.getItem('vfq_movies_data')
      const cachedLoaded = localStorage.getItem('vfq_movies_loaded')
      if (cachedData && cachedLoaded === 'true') {
        movies.value = JSON.parse(cachedData)
        hasLoaded.value = true
      }
    } catch (e) {
      console.error("Erreur de lecture du localStorage :", e)
    }
  }

  const fetchMovies = async (forceRefresh = false) => {
    // Si déjà chargé (ou récupéré du localStorage), on fait la vérification HEAD légère !
    if (!forceRefresh && hasLoaded.value && movies.value.length > 0) {
      try {
        const { count, error } = await supabase
          .from('fiches_vfq')
          .select('*', { count: 'exact', head: true })

        if (!error && count === movies.value.length) {
          return // Boucle arrêtée : on garde le cache local, 0 Mo téléchargé !
        }
      } catch (e) {
        return // En cas d'erreur réseau, on garde le cache existant
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

      // 2. On sauvegarde le nouveau catalogue dans le localStorage pour les prochains F5
      if (process.client) {
        try {
          localStorage.setItem('vfq_movies_data', JSON.stringify(allRows))
          localStorage.setItem('vfq_movies_loaded', 'true')
        } catch (e) {
          console.error("Erreur d'écriture dans le localStorage :", e)
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