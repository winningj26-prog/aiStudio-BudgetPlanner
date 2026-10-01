import { createClient } from '@supabase/supabase-js';

const runtimeEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const supabaseUrl = runtimeEnv.VITE_SUPABASE_URL;
const supabasePublishableKey = runtimeEnv.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn('Supabase Auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
}

export const supabase = createClient(
  supabaseUrl || 'https://invalid.supabase.co',
  supabasePublishableKey || 'missing-publishable-key',
);
