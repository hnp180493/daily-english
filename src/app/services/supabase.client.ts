import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export const supabaseClient: SupabaseClient = createClient(
  environment.supabase.url,
  environment.supabase.anonKey,
  {
    auth: {
      persistSession: true,        // ✅ Bắt buộc để lưu session vào localStorage
      autoRefreshToken: true,      // ✅ Tự động refresh token khi hết hạn
      detectSessionInUrl: true,    // ✅ Tự động đọc token từ URL sau redirect
      flowType: 'pkce',            // ✅ Sử dụng PKCE flow cho bảo mật tốt hơn
      storage: {
        getItem: (key: string) => {
          const value = localStorage.getItem(key);
          console.log('[Storage] GET:', key, value ? 'found' : 'not found');
          return value;
        },
        setItem: (key: string, value: string) => {
          console.log('[Storage] SET:', key, value.substring(0, 50) + '...');
          localStorage.setItem(key, value);
        },
        removeItem: (key: string) => {
          console.log('[Storage] REMOVE:', key);
          localStorage.removeItem(key);
        }
      },
      debug: true  // Enable debug mode
    }
  }
);
