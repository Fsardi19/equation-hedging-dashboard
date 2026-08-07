import type { DataStore } from './store'
import { LocalDataStore } from './local-store'

/**
 * Punto unico de seleccion de backend de datos.
 * MVP local -> LocalDataStore (archivo JSON).
 * Al migrar a Supabase, cambiar esta linea por: new SupabaseDataStore().
 */
export const store: DataStore = new LocalDataStore()

export type { DataStore } from './store'
