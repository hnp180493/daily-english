import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

// Main Supabase client - User data, achievements, favorites, reviews, etc.
export const supabaseClient: SupabaseClient = createClient(
  environment.supabase.url,
  environment.supabase.anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      debug: false
    }
  }
);

/**
 * Get the current JWT access token from main Supabase client.
 * This token is used to authenticate requests to the tracking database.
 */
async function getMainAccessToken(): Promise<string | null> {
  const { data } = await supabaseClient.auth.getSession();
  return data.session?.access_token || null;
}

// Tracking Supabase client - Exercise history, daily challenges, weekly goals
// This is a separate database to distribute storage load
// Uses JWT from main Supabase via x-auth-token header for RLS policies
// (x-auth-token bypasses PostgREST's JWT verification which expects tracking DB's key)
export const supabaseTrackingClient: SupabaseClient = createClient(
  environment.supabaseTracking.url,
  environment.supabaseTracking.anonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      fetch: async (url, options = {}) => {
        const headers = new Headers(options.headers);

        // Get JWT from main Supabase and inject into x-auth-token header
        // This custom header is read by get_auth_user_id() function in tracking DB
        const accessToken = await getMainAccessToken();
        if (accessToken) {
          headers.set('x-auth-token', accessToken);
        }

        return fetch(url, { ...options, headers });
      }
    }
  }
);
