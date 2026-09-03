export const useVfqMovies = () => {
  const supabase = useSupabaseClient()
  const allMovies = useState('vfq_catalog_all_movies', () => null)

  const { pending, refresh: fetchAllMovies } = useLazyAsyncData('vfq-all-movies', async () => {
    if (allMovies.value && allMovies.value.length > 0) {
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

  return {
    allMovies,
    pending,
    fetchAllMovies
  }
}