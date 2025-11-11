export const environment = {
  production: true,
  aiProvider: 'azure' as 'azure' | 'gemini' | 'openai' | 'openrouter',
  // OpenRouter Configuration Example:
  // To use OpenRouter, set aiProvider to 'openrouter' and configure:
  // openrouter: {
  //   apiKey: 'sk-or-v1-...',  // Get your API key from https://openrouter.ai/keys
  //   modelName: 'meta-llama/llama-3.1-8b-instruct:free',  // Recommended free model
  //   siteUrl: 'https://your-app-url.com',  // Optional: for usage tracking
  //   siteName: 'Your App Name'  // Optional: for usage tracking
  // },
  // Available free models:
  // - meta-llama/llama-3.2-3b-instruct:free (fast, basic feedback)
  // - meta-llama/llama-3.1-8b-instruct:free (balanced, recommended)
  // - google/gemma-2-9b-it:free (language understanding)
  // - microsoft/phi-3-mini-128k-instruct:free (large context)
  // - mistralai/mistral-7b-instruct:free (reliable, well-balanced)
  // - qwen/qwen-2-7b-instruct:free (multilingual)
  // - huggingfaceh4/zephyr-7b-beta:free (beginner-friendly)
  supabase: {
    url: '',
    anonKey: ''
  },
  seo: {
    googleSiteVerification: '7JzL97lfcCS6JB8NHzOdxfhO20y2H8tkScCfogsuMbY', // Add your Google Search Console verification code here
    bingWebmasterVerification: 'BA4A095D9E10222EBB9CEE67833C52BB', // Add your Bing Webmaster Tools verification code here
    cocCocVerification: '', // Add your Cốc Cốc verification code here (obtain from https://webmaster.coccoc.com/)
    vietnameseKeywordsEnabled: true, // Enable Vietnamese keyword optimization
    zaloAppId: '', // Add your Zalo App ID for social sharing integration
  }
};
