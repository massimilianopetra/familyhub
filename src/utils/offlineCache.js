// Cache locale (IndexedDB) delle righe Supabase, usata come fallback in
// sola lettura quando l'app è offline. Strategia "cache-first in lettura":
// ad ogni fetch riuscita salviamo lo snapshot qui; se la fetch fallisce
// (offline) mostriamo l'ultimo snapshot salvato invece di uno schermo vuoto.
// Le scritture restano online-only, non c'è coda di sync qui dentro.

const DB_NAME = 'familyhub-cache'
const DB_VERSION = 1
const STORES = ['loyalty_cards', 'calendar_events', 'medicines']

let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' })
        }
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

// Sostituisce l'intero snapshot di una tabella con le righe passate.
export async function saveCache(storeName, rows) {
  if (!('indexedDB' in window)) return
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      tx.objectStore(storeName).clear()
      for (const row of rows) tx.objectStore(storeName).put(row)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.warn(`[offlineCache] salvataggio "${storeName}" fallito:`, err)
  }
}

export async function loadCache(storeName) {
  if (!('indexedDB' in window)) return []
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const req = tx.objectStore(storeName).getAll()
      req.onsuccess = () => resolve(req.result ?? [])
      req.onerror = () => reject(req.error)
    })
  } catch (err) {
    console.warn(`[offlineCache] lettura "${storeName}" fallita:`, err)
    return []
  }
}
