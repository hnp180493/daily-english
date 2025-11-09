// Copy this file to environment.ts and environment.prod.ts
// Then add your actual API credentials

export const environment = {
  production: false,
  aiProvider: 'azure' as 'azure' | 'gemini', // Change to 'gemini' if using Google Gemini
  azure: {
    endpoint: 'https://your-resource.openai.azure.com/', // Your Azure OpenAI endpoint
    apiKey: 'your-azure-api-key-here', // Your Azure OpenAI API key
    deploymentName: 'gpt-4' // Your deployment name
  },
  gemini: {
    apiKey: 'your-gemini-api-key-here', // Your Google Gemini API key
    modelName: 'gemini-pro' // Model name
  }
};
