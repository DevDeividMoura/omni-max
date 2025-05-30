// src/storage/persistentStore.ts

import { writable, get, type Writable } from 'svelte/store'
import type { IStorageAdapter } from './IStorageAdapter'
import { defaultStorageAdapter } from './IStorageAdapter'

/**
 * Svelte store persistente em chrome.storage.sync (ou outro adapter configurado).
 */
export function persistentStore<T>(
  key: string,
  initialValue: T,
  adapter: IStorageAdapter = defaultStorageAdapter
): Writable<T> {
  const store = writable<T>(initialValue)

  const isStorageAvailable =
    typeof chrome !== 'undefined' &&
    chrome.storage !== undefined &&
    chrome.storage.sync !== undefined

  if (!isStorageAvailable) {
    console.warn(
      `Omni Max [PersistentStore]: Chrome storage.sync API not available for key "${key}". Store will operate in-memory only for this session.`
    )
    return store
  }

  // Load initial value from storage
  adapter
    .get<T>(key)
    .then(saved => {
      if (saved !== undefined) store.set(saved)
    })
    .catch(err => console.warn(`Error reading ${key}:`, err))

  // Persist on local store updates
  store.subscribe(value => {
    adapter.set(key, value).catch(err => console.warn(`Error saving ${key}:`, err))
  })

  // Listen to external changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && Object.hasOwn(changes, key)) {
      const { newValue } = changes[key]
      const currentValue = get(store)
      try {
        if (JSON.stringify(newValue) !== JSON.stringify(currentValue)) {
          store.set(newValue)
        }
      } catch {
        store.set(newValue)
      }
    }
  })

  return store
}
