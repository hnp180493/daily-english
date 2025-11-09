// Copy this file to environment.ts and fill in your API keys
export const environment = {
  production: false,
  
  // Azure OpenAI Configuration
  azureOpenAI: {
    endpoint: 'YOUR_AZURE_OPENAI_ENDPOINT', // e.g., 'https://your-resource.openai.azure.com/'
    apiKey: 'YOUR_AZURE_OPENAI_API_KEY',
    deploymentName: 'YOUR_DEPLOYMENT_NAME', // e.g., 'gpt-4'
  },
  
  // Google Gemini Configuration
  gemini: {
    apiKey: 'YOUR_GEMINI_API_KEY',
  },
  
  // Supabase Configuration (if using)
  supabase: {
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
  },
};
