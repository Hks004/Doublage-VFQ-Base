export const useVfqMovies = () => {
  const allMovies = useState('vfq_all_movies', () => [])
  const isFetchedThisSession = useState('vfq_fetched_session', () => false)
  const loading = useState('vfq_movies_loading', () => false)

  const fetchMovies = async (force = false) => {
    // Si on a déjà les films en mémoire et qu'on ne force pas, on quitte immédiatement
    if (allMovies.value.length > 0 && isFetchedThisSession.value && !force) {
      return
    }

    // On affiche un loader uniquement si le cache est vraiment vide
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

    allMovies.value = allData
    isFetchedThisSession.value = true
    loading.value = false
  }

  return {
    allMovies,
    loading,
    fetchMovies
  }
}