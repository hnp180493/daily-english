export const environment = {
  production: true,
  aiProvider: 'azure' as 'azure' | 'gemini' | 'openai',
  supabase: {
    url: '',
    anonKey: ''
  },
  seo: {
    googleSiteVerification: '7JzL97lfcCS6JB8NHzOdxfhO20y2H8tkScCfogsuMbY', // Add your Google Search Console verification code here
    bingWebmasterVerification: 'BA4A095D9E10222EBB9CEE67833C52BB', // Add your Bing Webmaster Tools verification code here
  }
};
