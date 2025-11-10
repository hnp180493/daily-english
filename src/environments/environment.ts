export const environment = {
  production: false,
  aiProvider: 'azure' as 'azure' | 'gemini' | 'openai',
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
