// src/storage/persistentStore.ts

import { writable, get, type Writable } from 'svelte/store'
import type { IStorageAdapter } from './IStorageAdapter'
import { defaultStorageAdapter } from './IStorageAdapter'

/**
 * Simple debounce implementation
 */
function debounce<F extends (...args: any[]) => void>(fn: F, delay: number): F {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: any[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as F
}

/**
 * Svelte store persistente em chrome.storage.sync (ou outro adapter configurado).
 */
export function persistentStore<T>(
  key: string,
  initialValue: T,
  adapter: IStorageAdapter = defaultStorageAdapter
): Writable<T> {
  const store = writable<T>(initialValue)
  let initialized = false
  let lastSaved = initialValue

  const isStorageAvailable =
    typeof chrome !== 'undefined' &&
    chrome.storage !== undefined &&
    chrome.storage.sync !== undefined

  if (!isStorageAvailable) {
    console.warn(
      `Omni Max [PersistentStore]: Chrome storage.sync API not available for key "${key}". Store will operate in-memory only for this session.`
    )
    initialized = true
    return store
  }

  // Load initial value from storage
  adapter
    .get<T>(key)
    .then(saved => {
      if (saved !== undefined) {
        store.set(saved)
        lastSaved = saved
      }
    })
    .catch(err => console.warn(`Error reading ${key}:`, err))
    .finally(() => {
      initialized = true
    })

  // Debounced save
  const save = debounce((v: T) => {
    // evita gravação se não mudou
    try {
      if (JSON.stringify(v) === JSON.stringify(lastSaved)) return
    } catch {
      // noop
    }
    adapter
      .set(key, v)
      .then(() => {
        lastSaved = v
      })
      .catch(err => console.warn(`Error saving ${key}:`, err))
  }, 1000)

  // Subscribe after init only
  store.subscribe(value => {
    if (!initialized) return
    save(value)
  })

  // Listen to external changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && Object.hasOwn(changes, key)) {
      const { newValue } = changes[key]
      const currentValue = get(store)
      try {
        if (JSON.stringify(newValue) !== JSON.stringify(currentValue)) {
          store.set(newValue)
          lastSaved = newValue
        }
      } catch {
        store.set(newValue)
        lastSaved = newValue
      }
    }
  })

  return store
}
