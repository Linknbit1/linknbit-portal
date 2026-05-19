import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — check your .env.local')
}

// Purge any tokens left by a previous build that had persistSession: true.
// This runs once at module load; after this, nothing auth-related touches localStorage.
Object.keys(localStorage)
  .filter((k) => k.startsWith('sb-'))
  .forEach((k) => localStorage.removeItem(k))

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,    // nothing written to localStorage or sessionStorage
    autoRefreshToken: false,  // AuthContext handles refresh via the BFF Edge Function
    detectSessionInUrl: true, // captures invite / password-reset tokens from the URL
  },
})
