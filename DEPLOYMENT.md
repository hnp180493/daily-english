# Deployment Guide

## 🚀 Deploy Your English Practice Platform

This guide covers deploying your application to popular hosting platforms.

## Prerequisites

- Build the application: `npm run build`
- Output will be in `dist/english-practice/browser/`
- Configure your production API keys in `src/environments/environment.prod.ts`

## Option 1: Vercel (Recommended)

### Quick Deploy
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts

### Manual Deploy
1. Go to [vercel.com](https://vercel.com)
2. Import your Git repository
3. Framework Preset: Angular
4. Build Command: `npm run build`
5. Output Directory: `dist/english-practice/browser`
6. Add environment variables in Vercel dashboard

## Option 2: Netlify

### Quick Deploy
1. Install Netlify CLI: `npm i -g netlify-cli`
2. Run: `netlify deploy --prod`
3. Publish directory: `dist/english-practice/browser`

### Manual Deploy
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop `dist/english-practice/browser` folder
3. Or connect your Git repository
4. Build command: `npm run build`
5. Publish directory: `dist/english-practice/browser`

## Option 3: Firebase Hosting

### Setup
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
```

### Configuration
Select:
- Public directory: `dist/english-practice/browser`
- Single-page app: Yes
- Automatic builds: Optional

### Deploy
```bash
npm run build
firebase deploy
```

## Option 4: GitHub Pages

### Setup
1. Install: `npm install -g angular-cli-ghpages`
2. Build: `npm run build -- --base-href=/your-repo-name/`
3. Deploy: `npx angular-cli-ghpages --dir=dist/english-practice/browser`

## Option 5: AWS S3 + CloudFront

### Setup
1. Create S3 bucket
2. Enable static website hosting
3. Upload `dist/english-practice/browser` contents
4. Create CloudFront distribution
5. Point to S3 bucket

### Using AWS CLI
```bash
aws s3 sync dist/english-practice/browser s3://your-bucket-name
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

## Environment Variables

### For Vercel/Netlify
Add these in the dashboard:
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_KEY`
- `AZURE_DEPLOYMENT_NAME`
- `GEMINI_API_KEY`

### Update environment.prod.ts
```typescript
export const environment = {
  production: true,
  aiProvider: 'azure',
  azure: {
    endpoint: process.env['AZURE_OPENAI_ENDPOINT'] || '',
    apiKey: process.env['AZURE_OPENAI_KEY'] || '',
    deploymentName: process.env['AZURE_DEPLOYMENT_NAME'] || 'gpt-4'
  },
  gemini: {
    apiKey: process.env['GEMINI_API_KEY'] || '',
    modelName: 'gemini-pro'
  }
};
```

## Security Considerations

### ⚠️ Important: API Key Security

**Client-Side Limitation**: Since this is a client-side Angular app, API keys will be visible in the browser. For production use, consider:

1. **Backend Proxy** (Recommended)
   - Create a backend API (Node.js, Python, etc.)
   - Store API keys on the server
   - Proxy AI requests through your backend
   - Add rate limiting and authentication

2. **Serverless Functions**
   - Use Vercel/Netlify serverless functions
   - Keep API keys in environment variables
   - Call functions from your Angular app

3. **API Gateway**
   - Use AWS API Gateway or similar
   - Add authentication (JWT, OAuth)
   - Implement usage quotas

### Example Backend Proxy (Node.js)
```javascript
// server.js
const express = require('express');
const app = express();

app.post('/api/analyze', async (req, res) => {
  const { userInput, sourceText, context } = req.body;
  
  // Call Azure OpenAI with server-side API key
  const response = await fetch(process.env.AZURE_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': process.env.AZURE_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [/* ... */]
    })
  });
  
  res.json(await response.json());
});

app.listen(3000);
```

## Post-Deployment Checklist

- [ ] Test all routes work correctly
- [ ] Verify AI feedback is working
- [ ] Check responsive design on mobile
- [ ] Test exercise loading
- [ ] Verify progress tracking
- [ ] Check browser console for errors
- [ ] Test on different browsers
- [ ] Set up monitoring/analytics
- [ ] Configure custom domain (optional)
- [ ] Set up SSL certificate

## Custom Domain

### Vercel
1. Go to project settings
2. Add domain
3. Update DNS records

### Netlify
1. Go to domain settings
2. Add custom domain
3. Configure DNS

## Monitoring

### Recommended Tools
- **Sentry**: Error tracking
- **Google Analytics**: User analytics
- **LogRocket**: Session replay
- **Hotjar**: User behavior

## Performance Optimization

### After Deployment
1. Enable gzip compression
2. Set up CDN
3. Configure caching headers
4. Optimize images
5. Enable HTTP/2

## Troubleshooting

### Build Fails
- Check Node.js version (18+)
- Clear cache: `rm -rf .angular/cache`
- Reinstall: `rm -rf node_modules && npm install`

### Routes Don't Work
- Configure server for SPA routing
- Add `_redirects` file for Netlify:
  ```
  /*    /index.html   200
  ```
- Add `vercel.json` for Vercel:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```

### API Keys Not Working
- Check environment variables are set
- Verify API key format
- Check API quota/limits
- Review CORS settings

## Support

For deployment issues:
1. Check platform documentation
2. Review build logs
3. Test locally first
4. Check browser console

## 🎉 You're Live!

Once deployed, share your English practice platform with learners worldwide!
