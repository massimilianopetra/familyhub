import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

// Versione mostrata nella sezione "Info" dell'app: presa dall'ultimo tag git
// (es. "v2.0" in una build fatta esattamente su quel tag, "v2.0-3-gabc1234"
// se ci sono commit successivi). Così la versione si aggiorna da sola ad
// ogni build/deploy senza dover editare un numero a mano — basta taggare.
function getAppVersion() {
  try {
    return execSync('git describe --tags --always --dirty').toString().trim()
  } catch {
    return 'dev'
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(getAppVersion()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // manifest.json è già gestito a mano in public/ e linkato in index.html
      // (icone/nome/colori) — il plugin si occupa solo del service worker.
      manifest: false,
      workbox: {
        // precache dell'app shell: JS/CSS/HTML + asset statici, per aprire
        // l'app anche offline. I giochi in public/giochi/ e gli asset delle
        // carte sono inclusi automaticamente (sono file .html precaricati,
        // quindi il service worker li serve dalla cache senza bisogno di
        // regole particolari — questa app non ha un router SPA).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
  base: command === 'build' ? '/familyhub/' : '/',
}))
