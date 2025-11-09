// This file will be generated during GitHub Actions deployment
// For local production builds, copy environment.example.ts and fill in your values
export const environment = {
  production: true,
  aiProvider: 'azure' as 'azure' | 'gemini' | 'openai',
  supabase: {
    url: '',
    anonKey: ''
  }
};
