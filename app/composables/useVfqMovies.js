export const useVfqMovies = () => {
  const supabase = useSupabaseClient()

  const movies = useState('vfq-movies-cache', () => [])
  const isLoading = useState('vfq-movies-loading', () => false)
  const hasLoaded = useState('vfq-movies-loaded', () => false)

  const fetchMovies = async (forceRefresh = false) => {
    // Si déjà chargé, vérification HEAD légère
    if (!forceRefresh && hasLoaded.value && movies.value.length > 0) {
      try {
        const { count, error } = await supabase
          .from('fiches_vfq')
          .select('*', { count: 'exact', head: true })

        if (!error && count === movies.value.length) {
          return 
        }
      } catch (e) {
        // En cas d'erreur réseau, on utilise le cache existant sans crasher
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