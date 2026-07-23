import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function isPlaceholder(val) {
  return !val || val === 'placeholder-key' || val.includes('placeholder');
}

function createStubClient() {
  const noop = () => Promise.resolve({ data: null, error: new Error('Supabase not configured') });
  return {
    from: () => ({ select: noop, insert: noop, update: noop, delete: noop, eq: () => this }),
    auth: { getSession: noop, signInWithPassword: noop, signOut: noop, onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) },
    storage: { from: () => ({ upload: noop, getPublicUrl: () => ({ data: { publicUrl: '' } }) }) }
  };
}

let supabase;
if (isPlaceholder(supabaseUrl) || isPlaceholder(supabaseAnonKey)) {
  console.warn(
    '[Supabase] Placeholder credentials detected in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'The app will run in offline mode. Set real credentials in .env.local for full functionality.'
  );
  supabase = createStubClient();
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
}

export { supabase };
