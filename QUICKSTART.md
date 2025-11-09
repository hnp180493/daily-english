# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure AI Provider

Open `src/environments/environment.ts` and add your API credentials:

**For Azure OpenAI:**
```typescript
export const environment = {
  production: false,
  aiProvider: 'azure',
  azure: {
    endpoint: 'https://your-resource.openai.azure.com/',
    apiKey: 'your-api-key-here',
    deploymentName: 'gpt-4'
  },
  gemini: {
    apiKey: '',
    modelName: 'gemini-pro'
  }
};
```

**For Google Gemini:**
```typescript
export const environment = {
  production: false,
  aiProvider: 'gemini',
  azure: {
    endpoint: '',
    apiKey: '',
    deploymentName: 'gpt-4'
  },
  gemini: {
    apiKey: 'your-gemini-api-key-here',
    modelName: 'gemini-pro'
  }
};
```

### 3. Start the Development Server
```bash
npm start
```

Then open your browser to `http://localhost:4200/`

## 📝 How to Use

1. **Select Your Level**: Choose Beginner, Intermediate, or Advanced
2. **Pick a Category**: Select from 20 different topics
3. **Start an Exercise**: Read the source text and translate the highlighted sentence
4. **Get AI Feedback**: Submit your translation and receive detailed feedback
5. **Track Progress**: Build streaks, earn credits, and unlock achievements

## 🔑 Getting API Keys

### Azure OpenAI
1. Visit [Azure Portal](https://portal.azure.com/)
2. Create an Azure OpenAI resource
3. Deploy a model (GPT-4 recommended)
4. Copy endpoint and API key from "Keys and Endpoint"

### Google Gemini
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key

## 🛠️ Build for Production
```bash
npm run build
```

Output will be in `dist/english-practice/`

## ⚠️ Important Notes

- **Never commit API keys** to version control
- The app uses localStorage to save progress
- Exercises are loaded from `public/data/exercises.json`
- You can add more exercises by editing the JSON file

## 🐛 Troubleshooting

**Build Errors?**
- Make sure you have Node.js 18+ installed
- Run `npm install` again
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

**AI Not Working?**
- Check your API credentials are correct
- Verify you have API quota available
- Check browser console for error messages

**Exercises Not Loading?**
- Verify `public/data/exercises.json` exists
- Check the JSON is valid (no syntax errors)

## 📚 Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Add your own exercises to `public/data/exercises.json`
- Customize the styling in `src/styles.scss`
- Deploy to your hosting platform of choice

## 🎉 You're Ready!

The app is now running at `http://localhost:4200/`

Happy learning! 🚀
