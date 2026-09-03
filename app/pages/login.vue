<template>
  <div class="login-container">
    <div class="login-card">
      <h1>Connexion Admin</h1>
      <p class="subtitle">Accès réservé à la modération VFQ</p>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="field-group">
          <label>Courriel</label>
          <input type="email" v-model="email" placeholder="admin@vfq.com" required />
        </div>

        <div class="field-group">
          <label>Mot de passe</label>
          <input type="password" v-model="password" placeholder="••••••••" required />
        </div>

        <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>

        <button type="submit" class="btn-login" :disabled="loading">
          {{ loading ? 'Connexion en cours...' : 'Se connecter' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const supabase = useSupabaseClient()
const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

const handleLogin = async () => {
  loading.value = true
  errorMessage.value = ''

  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })

  if (error) {
    errorMessage.value = "Erreur : " + error.message
    loading.value = false
  } else {
    // Redirection vers la page admin après une connexion réussie
    router.push('/admin/submissions') // Ajuste ce chemin si ta page admin a un autre nom/dossier
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
  padding: 20px;
}

.login-card {
  background: #151515;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 30px;
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.login-card h1 {
  margin: 0;
  font-size: 1.5rem;
  color: white;
}

.subtitle {
  color: #888;
  font-size: 0.9rem;
  margin: 0 0 15px 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-group label {
  font-size: 0.85rem;
  color: #aaa;
  font-weight: 600;
}

.field-group input {
  padding: 10px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  color: white;
  font-size: 1rem;
}

.field-group input:focus {
  border-color: var(--primary);
  outline: none;
}

.error-msg {
  color: #dc3545;
  font-size: 0.85rem;
  margin: 0;
}

.btn-login {
  background: var(--primary);
  color: white;
  border: none;
  padding: 12px;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.2s;
  margin-top: 10px;
}

.btn-login:hover {
  opacity: 0.9;
}

.btn-login:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>