
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('CRITICAL ERROR: Supabase environment variables are missing!');
    console.error('Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env or Vercel settings.');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage,
            // @ts-ignore - Disable Web Locks API to prevent mobile LockManager timeouts
            lockType: 'none'
        }
    }
);
