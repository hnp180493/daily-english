export const environment = {
  production: false,
  aiProvider: 'azure' as 'azure' | 'gemini' | 'openai',
  supabase: {
    url: '',
    anonKey: ''
  },
  seo: {
    googleSiteVerification: '', // Add your Google Search Console verification code here
    bingWebmasterVerification: '', // Add your Bing Webmaster Tools verification code here
  }
};
