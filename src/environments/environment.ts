export const environment = {
  production: false,
  aiProvider: 'azure' as 'azure' | 'gemini' | 'openai',
  supabase: {
    url: '', // Paste URL từ Supabase dashboard
    anonKey: '' // Paste anon key từ Supabase dashboard
  }
};
