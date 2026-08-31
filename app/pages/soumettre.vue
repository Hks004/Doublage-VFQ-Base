<template>
  <div class="submission-container">
    <div class="submission-wrapper">
      
      <!-- En-tête -->
      <div class="header">
        <h1>Soumettre une fiche <span>VFQ</span></h1>
        <p>Remplissez le formulaire ci-dessous. Votre ajout sera modéré avant d'apparaître sur le site.</p>
      </div>

      <!-- Formulaire -->
      <form @submit.prevent="submitMovie" class="form-card">
        
        <!-- Section 1 : Film -->
        <div class="section-box">
          <h2>🎬 1. Le Film</h2>

          <div class="grid-2">
            <div class="full-width">
              <label>Titre VFQ (au Québec) *</label>
              <input v-model="form.translated_name" type="text" required placeholder="Ex: Rapides et dangereux" />
            </div>
            <div>
              <label>Titre original</label>
              <input v-model="form.original_name" type="text" placeholder="Ex: The Fast and The Furious" />
            </div>
            <div>
              <label>Année de sortie</label>
              <input v-model="form.release_year" type="number" placeholder="Ex: 2001" />
            </div>
            <div class="full-width">
              <label>Poster Path (lien TMDB relatif, ex: /abc.jpg)</label>
              <input v-model="form.poster_path" type="text" placeholder="/..." />
            </div>
            <div class="full-width">
              <label>Synopsis</label>
              <textarea v-model="form.description" rows="3" placeholder="Résumé du film/série..."></textarea>
            </div>
          </div>
        </div>

        <!-- Section 2 : Doublage & Production (extra_data) -->
        <div class="section-box">
          <h2>🎙️ 2. Crédits, Studios & Sorties</h2>
          <div class="grid-2">
            <div>
              <label>Studio de doublage</label>
              <input v-model="extra.studio" type="text" placeholder="Ex: Cinélume, Difuze etc" />
            </div>
            <div>
              <label>Type de projet</label>
              <input v-model="extra.projectType" type="text" placeholder="Ex: Film, Série télé ou Animation/jeunesse" />
            </div>
            <div>
              <label>Adaptateur</label>
              <input v-model="extra.adapter" type="text" placeholder="Ex: Benoît Rousseau" />
            </div>
            <div>
              <label>Direction artistique</label>
              <input v-model="extra.director" type="text" placeholder="Ex: Benoît Rousseau" />
            </div>
            <div>
              <label>Distributeur</label>
              <input v-model="extra.distributor" type="text" placeholder="Ex: Warner Bros. Pictures" />
            </div>
            <div>
              <label>Producteur</label>
              <input v-model="extra.producer" type="text" placeholder="Ex: Warner Bros. Pictures" />
            </div>
            <div>
              <label>Sortie en salle (Theatrical Release)</label>
              <input v-model="extra.theatricalRelease" type="text" placeholder="Ex: 16 Mars 2026" />
            </div>
            <div>
              <label>Sortie DVD</label>
              <input v-model="extra.dvdRelease" type="text" placeholder="Ex: 27 Mai 2026" />
            </div>
          </div>
        </div>

        <!-- Section 3 : Casting -->
        <div class="section-box">
          <div class="section-header-flex">
            <h2>👥 3. Distribution (Casting)</h2>
            <button type="button" @click="addCastMember" class="btn-secondary">+ Ajouter</button>
          </div>

          <div class="cast-list">
            <div v-for="(item, index) in castList" :key="index" class="cast-row">
              <input v-model="item.actor" type="text" placeholder="Acteur original" />
              <input v-model="item.voice" type="text" placeholder="Voix VFQ" />
              <input v-model="item.character" type="text" placeholder="Personnage" />
              <button type="button" @click="removeCastMember(index)" class="btn-delete">✕</button>
            </div>
            <div v-if="castList.length === 0" class="empty-cast">
              Aucun acteur ajouté. Cliquez sur "+ Ajouter".
            </div>
          </div>
        </div>

        <!-- Messages -->
        <div v-if="successMessage" class="alert success">{{ successMessage }}</div>
        <div v-if="errorMessage" class="alert error">{{ errorMessage }}</div>

        <button type="submit" :disabled="loading" class="btn-submit">
          {{ loading ? 'Envoi...' : 'Soumettre la fiche' }}
        </button>

      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const client = useSupabaseClient()

const form = ref({
  translated_name: '',
  original_name: '',
  release_year: '',
  description: '',
  poster_path: ''
})

const extra = ref({
  studio: '',
  adapter: '',
  director: '',
  producer: '',
  dvdRelease: '',
  distributor: '',
  projectType: '',
  theatricalRelease: ''
})

const castList = ref([])

const addCastMember = () => {
  castList.value.push({ actor: '', voice: '', character: '' })
}

const removeCastMember = (index) => {
  castList.value.splice(index, 1)
}

const loading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Fonction utilitaire pour formater les noms propres (Title Case gérant les tirets)
const capitalizeName = (str) => {
  if (!str) return ''
  return str
    .toLowerCase()
    .trim()
    .split(' ')
    .map(word => {
      return word.split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('-')
    })
    .join(' ')
}

const submitMovie = async () => {
  loading.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    // Nettoyage et normalisation automatique du casting avant l'envoi
    const cleanedCast = castList.value.map(member => ({
      ...member,
      actor: capitalizeName(member.actor),
      voice: capitalizeName(member.voice),
      character: capitalizeName(member.character)
    }))

    const { error } = await client
      .from('movie_submissions')
      .insert([
        {
          translated_name: form.value.translated_name,
          original_name: form.value.original_name,
          description: form.value.description,
          poster_path: form.value.poster_path,
          cast_data: cleanedCast,
          extra_data: extra.value,
          status: 'pending'
        }
      ])

    if (error) throw error

    successMessage.value = 'Merci ! Votre soumission a bien été envoyée et est en attente de validation.'
    
    form.value = { translated_name: '', original_name: '', release_year: '', description: '', poster_path: '' }
    extra.value = { studio: '', adapter: '', director: '', producer: '', dvdRelease: '', distributor: '', projectType: '', theatricalRelease: '' }
    castList.value = []

  } catch (err) {
    errorMessage.value = 'Erreur lors de la soumission : ' + err.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.submission-container {
  min-height: 100vh;
  background-color: #0b0f19;
  color: #fff;
  padding: 40px 20px;
  font-family: system-ui, -apple-system, sans-serif;
}

.submission-wrapper {
  max-width: 800px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 40px;
}

.header h1 {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 10px;
}

.header h1 span {
  color: #6366f1;
}

.header p {
  color: #9ca3af;
  font-size: 1.1rem;
}

.form-card {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.section-box {
  background-color: #111827;
  border: 1px solid #1f2937;
  border-radius: 16px;
  padding: 24px;
}

.section-box h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header-flex h2 {
  margin-bottom: 0;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.full-width {
  grid-column: span 2;
}

label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #d1d5db;
  margin-bottom: 6px;
}

input, textarea {
  width: 100%;
  background-color: #1f2937;
  border: 1px solid #374151;
  border-radius: 8px;
  padding: 10px 14px;
  color: #fff;
  font-size: 0.95rem;
  box-sizing: border-box;
}

input:focus, textarea:focus {
  outline: none;
  border-color: #6366f1;
}

textarea {
  resize: vertical;
}

.cast-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cast-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 40px;
  gap: 10px;
  align-items: center;
  background-color: #030712;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #1f2937;
}

.empty-cast {
  text-align: center;
  padding: 20px;
  color: #6b7280;
  font-size: 0.9rem;
  border: 2px dashed #1f2937;
  border-radius: 8px;
}

.btn-secondary {
  background-color: #1f2937;
  color: #818cf8;
  border: 1px solid #374151;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.85rem;
}

.btn-secondary:hover {
  background-color: #374151;
}

.btn-delete {
  background-color: #1f2937;
  color: #ef4444;
  border: 1px solid #374151;
  height: 38px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.btn-delete:hover {
  background-color: #7f1d1d;
  color: #fff;
}

.btn-submit {
  background-color: #6366f1;
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 14px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-submit:hover {
  background-color: #4f46e5;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.alert {
  padding: 14px;
  border-radius: 8px;
  font-size: 0.9rem;
}

.alert.success {
  background-color: #064e3b;
  border: 1px solid #047857;
  color: #a7f3d0;
}

.alert.error {
  background-color: #7f1d1d;
  border: 1px solid #b91c1c;
  color: #fecaca;
}

@media (max-width: 768px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
  .full-width {
    grid-column: span 1;
  }
  .cast-row {
    grid-template-columns: 1fr;
  }
}
</style>