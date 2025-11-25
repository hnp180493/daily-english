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
  production: false,
  aiProvider: 'azure',
  // OpenRouter Configuration Example:
  // To use OpenRouter, set aiProvider to 'openrouter' and configure:
  // openrouter: {
  //   apiKey: 'sk-or-v1-...',  // Get your API key from https://openrouter.ai/keys
  //   modelName: 'meta-llama/llama-3.1-8b-instruct:free',  // Recommended free model
  //   siteUrl: 'https://your-app-url.com',  // Optional: for usage tracking
  //   siteName: 'Your App Name'  // Optional: for usage tracking
  // },
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
        enabled: true, // Set to true to enable GA4 tracking in development
        config: {
          measurementId: 'G-MZH6Q7FGWX', // Replace with your development GA4 Measurement ID
          debugMode: true, // Enable debug mode for development
          anonymizeIp: true // Anonymize IP addresses for privacy
        }
      }
      // Easy to add more providers in the future:
      // {
      //   type: 'mixpanel',
      //   enabled: false,
      //   config: {
      //     token: 'your-mixpanel-token',
      //     debugMode: true
      //   }
      // }
    ]
  }
};
