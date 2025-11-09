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
      flowType: 'pkce'             // ✅ Sử dụng PKCE flow cho bảo mật tốt hơn
    }
  }
);
