import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export const supabaseClient: SupabaseClient = createClient(
  environment.supabase.url,
  environment.supabase.anonKey
);
