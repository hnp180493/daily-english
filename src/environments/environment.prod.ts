export const environment = {
  production: false,
  aiProvider: 'azure' as 'azure' | 'gemini' | 'openai',
  azure: {
    endpoint: '',
    apiKey: '',
    apiVersion: '',
    deploymentName: 'gpt-4'
  },
  gemini: {
    apiKey: '',
    modelName: 'gemini-2.5-pro'
  },
  openai: {
    apiKey: '',
    modelName: 'gpt-5'
  },
  supabase: {
    url: '', // Paste URL từ Supabase dashboard
    anonKey: '' // Paste anon key từ Supabase dashboard
  }
};
