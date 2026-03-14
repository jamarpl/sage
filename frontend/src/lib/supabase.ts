import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/** Redirect URL for magic link. If you host docs/supabase-auth-redirect.html, set EXPO_PUBLIC_SUPABASE_REDIRECT_URL to that URL so tokens are passed as query (works on iOS). */
export function getSupabaseRedirectUrl(): string {
  const hosted = process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL ?? '';
  if (hosted && hosted.startsWith('http')) return hosted.trim();
  return 'traverse://auth/callback';
}
