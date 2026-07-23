/**
 * Storage abstraction layer for Capacitor migration.
 *
 * In native apps (iOS/Android), uses @capacitor/preferences for encrypted,
 * native-backed key-value storage. Falls back to localStorage in browser dev.
 *
 * Usage:
 *   import { getItem, setItem, removeItem } from './storage';
 *   const token = await getItem('travelbae_token');
 *   await setItem('travelbae_token', tokenValue);
 */

import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

/**
 * Get a value from storage. Returns null if not found.
 */
export async function getItem(key) {
  if (isNative) {
    const { value } = await Preferences.get({ key });
    return value;
  }
  return localStorage.getItem(key);
}

/**
 * Set a value in storage.
 */
export async function setItem(key, value) {
  if (isNative) {
    await Preferences.set({ key, value });
  } else {
    try {
      localStorage.setItem(key, value);
    } catch {
      // localStorage may be full or unavailable; silently ignore
    }
  }
}

/**
 * Remove a value from storage.
 */
export async function removeItem(key) {
  if (isNative) {
    await Preferences.remove({ key });
  } else {
    localStorage.removeItem(key);
  }
}

/**
 * Clear all app-prefixed storage keys.
 * Only clears keys starting with 'travelbae_' or 'tb_'.
 */
export async function clearAll() {
  if (isNative) {
    const { keys } = await Preferences.keys();
    const appKeys = keys.filter(k => k.startsWith('travelbae_') || k.startsWith('tb_'));
    for (const k of appKeys) {
      await Preferences.remove({ key: k });
    }
  } else {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('travelbae_') || k.startsWith('tb_'))) {
        toRemove.push(k);
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  }
}

/**
 * Migrate existing localStorage data to Preferences (run once on first launch).
 */
export async function migrateFromLocalStorage() {
  if (!isNative) return;
  const { keys } = await Preferences.keys();
  // Only migrate if Preferences is empty (first launch)
  if (keys.length > 0) return;

  const toMigrate = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('travelbae_') || key.startsWith('tb_'))) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        toMigrate.push({ key, value });
      }
    }
  }
  for (const { key, value } of toMigrate) {
    await Preferences.set({ key, value });
  }
}
