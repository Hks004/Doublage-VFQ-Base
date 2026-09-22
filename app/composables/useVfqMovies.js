export const useVfqMovies = () => {
  const allMovies = useState('vfq_all_movies', () => [])
  const isFetchedThisSession = useState('vfq_fetched_session', () => false)
  const loading = useState('vfq_movies_loading', () => false)

  const fetchMovies = async (force = false) => {
    // Si la mémoire vive a déjà les données pour cette session et qu'on ne force pas, on sort
    if (allMovies.value.length > 0 && isFetchedThisSession.value && !force) {
      return
    }

    // 1. Essayer de charger le localStorage immédiatement pour l'affichage instantané
    if (process.client && allMovies.value.length === 0) {
      try {
        const cached = localStorage.getItem('vfq_movies_cache')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0) {
            allMovies.value = parsed
            isFetchedThisSession.value = true
          }
        }
      } catch (e) {
        console.error("Erreur lecture localStorage:", e)
      }
    }

    // 2. On affiche le loader seulement si on n'a vraiment AUCUNE donnée (ni mémoire, ni cache)
    loading.value = allMovies.value.length === 0

    const supabase = useSupabaseClient()
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

    // Si on a récupéré des données de Supabase, on met à jour la mémoire et le cache
    if (allData.length > 0) {
      allMovies.value = allData
      isFetchedThisSession.value = true

      if (process.client) {
        try {
          localStorage.setItem('vfq_movies_cache', JSON.stringify(allData))
        } catch (e) {
          console.error("Erreur écriture localStorage:", e)
        }
      }
    }

    loading.value = false
  }

  return {
    allMovies,
    loading,
    fetchMovies
  }
}