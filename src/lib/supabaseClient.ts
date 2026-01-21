import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lpgamnbjkeigacvwbcwn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwZ2FtbmJqa2VpZ2FjdndiY3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NjAyMTQsImV4cCI6MjA4NDUzNjIxNH0.W8zDPKciIMZHLCXSpdA0uc-c5SyOVAhhUJupOER0E_k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
});
