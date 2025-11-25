export const environment: {
  production: boolean;
  aiProvider: 'azure' | 'gemini' | 'openai' | 'openrouter';
  supabase: { url: string; anonKey: string };
  seo: {
    googleSiteVerification: string;
    bingWebmasterVerification: string;
    cocCocVerification: string;
    vietnameseKeywordsEnabled: boolean;
    zaloAppId: string;
  };
  analytics: {
    providers: Array<{
      type: string;
      enabled: boolean;
      config: Record<string, any>;
    }>;
  };
} = {
  production: true,
  aiProvider: 'azure',
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
  },
  
  // Analytics Configuration
  analytics: {
    providers: [
      {
        type: 'ga4',
        enabled: true, // Enable GA4 tracking in production
        config: {
          measurementId: 'G-MZH6Q7FGWX', // Replace with your production GA4 Measurement ID
          debugMode: false, // Disable debug mode in production
          anonymizeIp: true // Anonymize IP addresses for privacy
        }
      }
      // Easy to add more providers:
      // {
      //   type: 'mixpanel',
      //   enabled: true,
      //   config: {
      //     token: 'your-production-mixpanel-token',
      //     debugMode: false
      //   }
      // }
    ]
  }
};
