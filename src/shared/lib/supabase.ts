import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// Auth only — the backend owns the DB and never sees anything but the resulting
// access_token (docs/auth.md). Don't add supabase.from(...) calls here.
//
// createClient throws synchronously on a missing key, which would otherwise crash
// the whole app at import time. SUPABASE_ANON_KEY isn't set yet (docs/auth.md), so
// stay null until it is — public read endpoints don't need a session anyway.
export const supabase: SupabaseClient | null = SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
