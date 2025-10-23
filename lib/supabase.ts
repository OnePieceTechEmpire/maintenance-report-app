// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for client-side (with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client for server-side (bypasses RLS)
export const getSupabaseServer = () => {
  if (!supabaseServiceKey) {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found, using anon key')
    return supabase
  }
  return createClient(supabaseUrl, supabaseServiceKey)
}