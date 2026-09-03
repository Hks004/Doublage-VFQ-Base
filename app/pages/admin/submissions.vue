<template>
  <div class="admin-container">
    <div class="admin-header-row">
      <h1>Modération des soumissions VFQ</h1>
      <button @click="handleLogout" class="btn-logout">Déconnexion</button>
    </div>

    <!-- Section Tutoriel Déroulable -->
    <div class="tutorial-box">
      <button type="button" @click="showTutorial = !showTutorial" class="tutorial-toggle">
        <span>📖 Guide et consignes de modération (À lire avant de publier)</span>
        <span class="arrow" :class="{ open: showTutorial }">▼</span>
      </button>
      
      <div v-if="showTutorial" class="tutorial-content">
        <p>Bienvenue sur l'espace de modération. Avant de valider et de publier une fiche dans le catalogue, veuillez suivre scrupuleusement ces consignes pour garder une base de données propre :</p>
        <ul>
          <li><strong>Vérification des doublons :</strong> Assurez-vous que les noms des Acteurs Originaux et des Doubleurs Québécois (voix VFQ) correspondent exactement à l'orthographe déjà utilisée sur notre site <strong>DoublageVFQ</strong> afin d'éviter de créer des fiches en double.</li>
          <li><strong>Sources de référence officielles :</strong> En cas de doute sur l'orthographe ou les crédits, validez les informations sur ces plateformes de référence :
            <ul>
              <li><a href="https://andp.ca/" target="_blank" rel="noopener">ANDP (Association nationale des doubleurs professionnels)</a></li>
              <li><a href="https://fr.wikipedia.org" target="_blank" rel="noopener">Wikipédia</a></li>
              <li><a href="https://doublagequebecois.forum-canada.net/" target="_blank" rel="noopener">Forum de doublage Québec (DoublageQuébécois)</a></li>
            </ul>
          </li>
          <li><strong>Vérification finale :</strong> Relisez bien les crédits de production, les titres et le casting avant de cliquer sur "Publier dans le catalogue".</li>
          <li><strong>Ne publiez rien si vous ne trouvez aucune information crédible concernant une fiche soumise.</strong></li>
        </ul>
      </div>
    </div>

    <div v-if="loading" class="loading">Chargement des soumissions...</div>

    <div v-else-if="submissions.length === 0" class="no-submissions">
      Aucune soumission en attente pour le moment.
    </div>

    <div v-else class="admin-layout">
      <!-- Liste des soumissions à gauche -->
      <div class="submissions-list">
        <ul>
          <li 
            v-for="sub in submissions" 
            :key="sub.id"
            :class="{ active: selectedSubmission?.id === sub.id }"
            @click="selectSubmission(sub)"
          >
            <span class="sub-title">{{ sub.translated_name || 'Sans titre' }}</span>
            <span class="sub-sub">{{ sub.original_name }}</span>
            <span class="sub-date">{{ formatDate(sub.created_at) }}</span>
          </li>
        </ul>
      </div>

      <!-- Détails et validation à droite -->
      <div class="submission-details" v-if="selectedSubmission">
        <h2>Détails de la soumission</h2>
        
        <!-- Section Film -->
        <div class="detail-section">
          <h3>🎬 Informations du film</h3>
          <div class="field-group">
            <label>Titre VFQ :</label>
            <input type="text" v-model="selectedSubmission.translated_name" />
          </div>
          <div class="field-group">
            <label>Titre original :</label>
            <input type="text" v-model="selectedSubmission.original_name" />
          </div>
          <div class="field-group">
            <label>Poster Path :</label>
            <input type="text" v-model="selectedSubmission.poster_path" />
          </div>
          <div class="field-group">
            <label>Synopsis :</label>
            <textarea v-model="selectedSubmission.description" rows="3"></textarea>
          </div>
        </div>

        <!-- Section Extra Data -->
        <div class="detail-section" v-if="selectedSubmission.extra_data">
          <h3>🎙️ Crédits & Production</h3>
          <div class="grid-2">
            <div class="field-group">
              <label>Studio :</label>
              <input type="text" v-model="selectedSubmission.extra_data.studio" />
            </div>
            <div class="field-group">
              <label>Type de projet :</label>
              <input type="text" v-model="selectedSubmission.extra_data.projectType" />
            </div>
            <div class="field-group">
              <label>Adaptateur :</label>
              <input type="text" v-model="selectedSubmission.extra_data.adapter" />
            </div>
            <div class="field-group">
              <label>Direction artistique :</label>
              <input type="text" v-model="selectedSubmission.extra_data.director" />
            </div>
            <div class="field-group">
              <label>Distributeur :</label>
              <input type="text" v-model="selectedSubmission.extra_data.distributor" />
            </div>
            <div class="field-group">
              <label>Producteur :</label>
              <input type="text" v-model="selectedSubmission.extra_data.producer" />
            </div>
            <div class="field-group">
              <label>Sortie en salle :</label>
              <input type="text" v-model="selectedSubmission.extra_data.theatricalRelease" />
            </div>
            <div class="field-group">
              <label>Sortie DVD :</label>
              <input type="text" v-model="selectedSubmission.extra_data.dvdRelease" />
            </div>
          </div>
        </div>

        <!-- Section Casting -->
        <div class="detail-section">
          <div class="section-header-flex">
            <h3>👥 Distribution (Casting)</h3>
            <button type="button" @click="addAdminCastMember" class="btn-secondary">+ Ajouter</button>
          </div>
          
          <div class="cast-list-admin">
            <div v-for="(item, index) in selectedSubmission.cast_data" :key="index" class="cast-row-admin">
              <input v-model="item.actor" type="text" placeholder="Acteur original" />
              <input v-model="item.voice" type="text" placeholder="Voix VFQ" />
              <input v-model="item.character" type="text" placeholder="Personnage" />
              <button type="button" @click="removeAdminCastMember(index)" class="btn-delete">✕</button>
            </div>
            <div v-if="!selectedSubmission.cast_data || selectedSubmission.cast_data.length === 0" class="empty-cast">
              Aucun acteur dans cette soumission.
            </div>
          </div>
        </div>

        <!-- Actions de validation -->
        <div class="actions">
          <button class="btn-publish" @click="publishSubmission(selectedSubmission)">
            Publier dans le catalogue
          </button>
          <button class="btn-delete-sub" @click="deleteSubmission(selectedSubmission.id)">
            Rejeter / Supprimer
          </button>
        </div>
      </div>

      <div class="submission-details placeholder" v-else>
        <p>Sélectionne une soumission dans la liste pour l'inspecter et la modifier.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const supabase = useSupabaseClient()
const router = useRouter()

const submissions = ref([])
const selectedSubmission = ref(null)
const loading = ref(true)
const showTutorial = ref(false)

const fetchSubmissions = async () => {
  loading.value = true

  const userSession = await supabase.auth.getSession()
  console.log("Session utilisateur active :", userSession.data.session)

  if (!userSession.data.session) {
    router.push('/login')
    return
  }

  const { data, error } = await supabase
    .from('movie_submissions')
    .select('*')
    .order('created_at', { ascending: false })

  console.log("Données reçues de Supabase :", data)
  console.log("Erreur éventuelle :", error)

  if (error) {
    console.error('Erreur chargement soumissions:', error)
  } else {
    submissions.value = data || []
    if (submissions.value.length > 0 && !selectedSubmission.value) {
      selectedSubmission.value = JSON.parse(JSON.stringify(submissions.value[0]))
      if (!selectedSubmission.value.extra_data) selectedSubmission.value.extra_data = {}
      if (!selectedSubmission.value.cast_data) selectedSubmission.value.cast_data = []
    }
  }
  loading.value = false
}

onMounted(() => {
  fetchSubmissions()
})

const selectSubmission = (sub) => {
  selectedSubmission.value = JSON.parse(JSON.stringify(sub))
  if (!selectedSubmission.value.extra_data) selectedSubmission.value.extra_data = {}
  if (!selectedSubmission.value.cast_data) selectedSubmission.value.cast_data = []
}

const addAdminCastMember = () => {
  if (!selectedSubmission.value.cast_data) {
    selectedSubmission.value.cast_data = []
  }
  selectedSubmission.value.cast_data.push({ actor: '', voice: '', character: '' })
}

const removeAdminCastMember = (index) => {
  selectedSubmission.value.cast_data.splice(index, 1)
}

const publishSubmission = async (sub) => {
  try {
    // 1. Récupération du plus grand movie_id actuel pour assurer la suite logique
    const { data: lastMovie, error: fetchError } = await supabase
      .from('fiches_vfq')
      .select('movie_id')
      .order('movie_id', { ascending: false })
      .limit(1)

    if (fetchError) throw fetchError

    let nextMovieId = 1
    if (lastMovie && lastMovie.length > 0 && lastMovie[0].movie_id != null) {
      nextMovieId = Number(lastMovie[0].movie_id) + 1
    }

    // 2. Insertion dans fiches_vfq avec le movie_id calculé et incrémenté
    const { error: insertError } = await supabase
      .from('fiches_vfq')
      .insert([
        {
          movie_id: nextMovieId,
          translated_name: sub.translated_name,
          original_name: sub.original_name,
          description: sub.description,
          poster_path: sub.poster_path,
          cast_data: sub.cast_data,
          extra_data: sub.extra_data
        }
      ])

    if (insertError) throw insertError

    // 3. Suppression de la soumission validée
    await deleteSubmission(sub.id, false)
    alert(`Film publié avec succès ! Attribué au movie_id : ${nextMovieId}`)

  } catch (err) {
    alert('Erreur lors de la publication : ' + err.message)
    console.error(err)
  }
}

const deleteSubmission = async (id, notify = true) => {
  const { error } = await supabase
    .from('movie_submissions')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erreur suppression:', error)
  } else {
    if (notify) alert('Soumission rejetée/supprimée.')
    selectedSubmission.value = null
    fetchSubmissions()
  }
}

const handleLogout = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-CA')
}
</script>

<style scoped>
.admin-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  color: #fff;
  font-family: system-ui, -apple-system, sans-serif;
}

.admin-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.btn-logout {
  background: #262626;
  color: #ef4444;
  border: 1px solid #444;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.btn-logout:hover {
  background: #7f1d1d;
  color: #fff;
}

/* Styles pour le bloc tutoriel déroulant */
.tutorial-box {
  background: #151515;
  border: 1px solid #333;
  border-radius: 8px;
  margin-bottom: 20px;
  overflow: hidden;
}

.tutorial-toggle {
  width: 100%;
  background: #1a1a1a;
  color: #818cf8;
  border: none;
  padding: 12px 16px;
  font-size: 0.95rem;
  font-weight: bold;
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.2s;
}

.tutorial-toggle:hover {
  background: #222;
}

.arrow {
  font-size: 0.8rem;
  transition: transform 0.3s ease;
}

.arrow.open {
  transform: rotate(180deg);
}

.tutorial-content {
  padding: 16px 20px;
  background: #151515;
  border-top: 1px solid #262626;
  color: #ccc;
  font-size: 0.9rem;
  line-height: 1.5;
}

.tutorial-content p {
  margin: 0 0 10px 0;
}

.tutorial-content ul {
  margin: 0;
  padding-left: 20px;
}

.tutorial-content li {
  margin-bottom: 8px;
}

.tutorial-content a {
  color: #818cf8;
  text-decoration: underline;
}

.tutorial-content a:hover {
  color: #a5b4fc;
}

.admin-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 20px;
  margin-top: 20px;
}

.submissions-list {
  background: #151515;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 10px;
  max-height: 80vh;
  overflow-y: auto;
}

.submissions-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.submissions-list li {
  padding: 12px;
  margin-bottom: 8px;
  background: #1a1a1a;
  border: 1px solid #262626;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 3px;
  transition: background 0.2s;
}

.submissions-list li:hover {
  background: #222;
}

.submissions-list li.active {
  background: var(--primary, #2563eb);
  border-color: var(--primary, #2563eb);
}

.sub-title {
  font-weight: bold;
  color: white;
  font-size: 0.95rem;
}

.sub-sub {
  font-size: 0.8rem;
  color: #aaa;
  font-style: italic;
}

.sub-date {
  font-size: 0.75rem;
  color: #777;
  margin-top: 4px;
}

.submissions-list li.active .sub-sub,
.submissions-list li.active .sub-date {
  color: rgba(255, 255, 255, 0.85);
}

.submission-details {
  background: #151515;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 80vh;
  overflow-y: auto;
}

.submission-details.placeholder {
  justify-content: center;
  align-items: center;
  color: #666;
  height: 400px;
}

.detail-section {
  background: #1a1a1a;
  border: 1px solid #262626;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-section h3 {
  font-size: 1rem;
  color: #818cf8;
  margin: 0 0 5px 0;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-group label {
  color: #aaa;
  font-size: 0.8rem;
  font-weight: 600;
}

.field-group input,
.field-group textarea {
  padding: 8px 12px;
  background: #111;
  border: 1px solid #333;
  border-radius: 4px;
  color: white;
  font-family: inherit;
  font-size: 0.9rem;
}

.field-group input:focus,
.field-group textarea:focus {
  border-color: #818cf8;
  outline: none;
}

.section-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cast-list-admin {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cast-row-admin {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 36px;
  gap: 8px;
  align-items: center;
}

.empty-cast {
  text-align: center;
  padding: 15px;
  color: #666;
  font-size: 0.85rem;
  border: 1px dashed #333;
  border-radius: 6px;
}

.btn-secondary {
  background: #262626;
  color: #818cf8;
  border: 1px solid #444;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
}

.btn-secondary:hover {
  background: #333;
}

.btn-delete {
  background: #262626;
  color: #ef4444;
  border: 1px solid #444;
  height: 34px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.btn-delete:hover {
  background: #7f1d1d;
  color: #fff;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 10px;
  padding-top: 15px;
  border-top: 1px solid #262626;
}

.btn-publish {
  background: #10b981;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  font-size: 0.95rem;
}

.btn-publish:hover {
  background: #059669;
}

.btn-delete-sub {
  background: #ef4444;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  font-size: 0.95rem;
}

.btn-delete-sub:hover {
  background: #dc2626;
}

.loading, .no-submissions {
  color: #888;
  margin-top: 20px;
}
</style>