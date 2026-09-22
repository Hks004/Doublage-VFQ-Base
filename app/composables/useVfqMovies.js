export const useVfqMovies = () => {
  // On pointe directement vers la même variable globale partagée par app.vue
  const allMovies = useState('vfq_all_movies_comediens', () => [])
  
  // Comme app.vue gère le chargement initial au démarrage du site, 
  // on considère qu'il n'y a plus de chargement à faire ici.
  const loading = ref(false)

  const fetchMovies = async () => {
    // Ne fait plus rien puisque app.vue a déjà tout téléchargé proprement !
    return
  }

  return {
    allMovies,
    loading,
    fetchMovies
  }
}