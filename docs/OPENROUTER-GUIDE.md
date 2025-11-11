# OpenRouter Integration Guide

## Overview

OpenRouter provides unified access to multiple AI models through a single API. This guide covers setup, configuration, and model selection for the English learning application.

## Setup Instructions

### 1. Get Your API Key

1. Visit [OpenRouter](https://openrouter.ai/)
2. Sign up or log in to your account
3. Navigate to [API Keys](https://openrouter.ai/keys)
4. Create a new API key
5. Copy the key (starts with `sk-or-v1-...`)

### 2. Configure the Application

Update your environment configuration file:

**For Development** (`src/environments/environment.ts`):
```typescript
export const environment = {
  production: false,
  aiProvider: 'openrouter',
  aiConfig: {
    provider: 'openrouter',
    openrouter: {
      apiKey: 'sk-or-v1-your-api-key-here',
      modelName: 'meta-llama/llama-3.1-8b-instruct:free',
      siteUrl: 'https://your-app-url.com',  // Optional
      siteName: 'English Learning App'       // Optional
    }
  }
};
```

**For Production** (`src/environments/environment.prod.ts`):
```typescript
export const environment = {
  production: true,
  aiProvider: 'openrouter',
  aiConfig: {
    provider: 'openrouter',
    openrouter: {
      apiKey: process.env['OPENROUTER_API_KEY'] || '',
      modelName: 'meta-llama/llama-3.1-8b-instruct:free',
      siteUrl: 'https://your-production-url.com',
      siteName: 'English Learning App'
    }
  }
};
```

## Free Models Reference

OpenRouter provides multiple free models. Here are the most reliable ones for language learning:

### ⭐ Recommended Free Models

### 1. Llama 3.2 3B Instruct (Best for Speed)
- **Model ID**: `meta-llama/llama-3.2-3b-instruct:free`
- **Context Window**: 128,000 tokens
- **Strengths**: 
  - Very fast response times (1-2 seconds)
  - Good for basic feedback
  - Low latency
  - Reliable availability
- **Best For**: Quick feedback, beginner-level translations, rapid iteration
- **Why Recommended**: Most stable free model with consistent availability

### 2. Llama 3.1 8B Instruct (Best for Quality)
- **Model ID**: `meta-llama/llama-3.1-8b-instruct:free`
- **Context Window**: 128,000 tokens
- **Strengths**:
  - Better quality than 3B
  - Detailed analysis
  - Consistent output format
  - Large context window
- **Best For**: General purpose translation analysis, all difficulty levels
- **Note**: May have limited availability during peak times

### 3. Gemma 2 9B IT (Grammar Focus)
- **Model ID**: `google/gemma-2-9b-it:free`
- **Context Window**: 8,192 tokens
- **Strengths**:
  - Excellent language understanding
  - Strong grammar analysis
  - Natural explanations
- **Best For**: Grammar and style feedback, intermediate to advanced exercises
- **Limitations**: Smaller context window, occasional availability issues

### 4. Phi-3 Mini 128K (Large Context)
- **Model ID**: `microsoft/phi-3-mini-128k-instruct:free`
- **Context Window**: 128,000 tokens
- **Strengths**:
  - Very large context window
  - Efficient processing
  - Good reasoning capabilities
- **Best For**: Long text analysis with full context, complex exercises
- **Note**: Excellent for exercises with extensive surrounding context

### 5. Mistral 7B Instruct (Balanced)
- **Model ID**: `mistralai/mistral-7b-instruct:free`
- **Context Window**: 32,768 tokens
- **Strengths**:
  - Reliable and well-balanced
  - Clear explanations
  - Consistent quality
- **Best For**: Comprehensive feedback with detailed explanations
- **Note**: Popular choice for educational applications

### 🚀 Powerful Free Models (Limited Availability)

### 6. Hermes 3 Llama 405B (Most Powerful)
- **Model ID**: `nousresearch/hermes-3-llama-3.1-405b:free`
- **Context Window**: 128,000 tokens
- **Strengths**:
  - Extremely powerful (405B parameters)
  - Excellent reasoning
  - High-quality feedback
- **Best For**: Complex translations, advanced exercises
- **Note**: May have rate limits or availability restrictions

### 7. Liquid LFM 40B
- **Model ID**: `liquid/lfm-40b:free`
- **Context Window**: 32,000 tokens
- **Strengths**:
  - Good balance of size and quality
  - Fast for its size
- **Best For**: General purpose use
- **Note**: Newer model, availability may vary

## ⚠️ Important Notes

**Model Availability**: Free models on OpenRouter can have varying availability:
- Some models may be temporarily unavailable during peak usage
- Model endpoints can change as OpenRouter updates their offerings
- Always check [OpenRouter Models Page](https://openrouter.ai/models) for current status

**Recommended Strategy**:
1. Start with **Llama 3.2 3B** (most reliable)
2. Try **Llama 3.1 8B** if you need better quality
3. Use **Hermes 3 405B** for difficult translations (if available)
4. Have a paid model as backup for production use

## Model Comparison Table

| Model | Size | Context | Speed | Quality | Availability | Best Use Case |
|-------|------|---------|-------|---------|--------------|---------------|
| Llama 3.2 3B ⭐ | 3B | 128K | ⚡⚡⚡ | ⭐⭐⭐ | 🟢 High | Quick feedback (Recommended) |
| Llama 3.1 8B | 8B | 128K | ⚡⚡ | ⭐⭐⭐⭐ | 🟡 Medium | Better quality |
| Gemma 2 9B | 9B | 8K | ⚡⚡ | ⭐⭐⭐⭐ | 🟡 Medium | Grammar analysis |
| Phi-3 Mini | 3.8B | 128K | ⚡⚡⚡ | ⭐⭐⭐ | 🟢 High | Long context |
| Mistral 7B | 7B | 32K | ⚡⚡ | ⭐⭐⭐⭐ | 🟡 Medium | Detailed feedback |
| Hermes 3 405B | 405B | 128K | ⚡ | ⭐⭐⭐⭐⭐ | 🔴 Limited | Most powerful |
| Liquid LFM 40B | 40B | 32K | ⚡⚡ | ⭐⭐⭐⭐ | 🟡 Medium | Balanced |

**Legend**:
- 🟢 High: Consistently available
- 🟡 Medium: Usually available, may have occasional limits
- 🔴 Limited: May have rate limits or peak-time restrictions

## Configuration Examples

### Example 1: Recommended Default (Most Reliable)
```typescript
openrouter: {
  apiKey: 'sk-or-v1-...',
  modelName: 'meta-llama/llama-3.2-3b-instruct:free'
}
```

### Example 2: Better Quality
```typescript
openrouter: {
  apiKey: 'sk-or-v1-...',
  modelName: 'meta-llama/llama-3.1-8b-instruct:free'
}
```

### Example 3: Grammar Focus
```typescript
openrouter: {
  apiKey: 'sk-or-v1-...',
  modelName: 'google/gemma-2-9b-it:free'
}
```

### Example 4: Most Powerful (When Available)
```typescript
openrouter: {
  apiKey: 'sk-or-v1-...',
  modelName: 'nousresearch/hermes-3-llama-3.1-405b:free'
}
```

### Example 5: With Optional Tracking
```typescript
openrouter: {
  apiKey: 'sk-or-v1-...',
  modelName: 'meta-llama/llama-3.2-3b-instruct:free',
  siteUrl: 'https://your-app.com',
  siteName: 'English Learning App'
}
```

## Features

### Translation Analysis
- Real-time streaming feedback
- Accuracy scoring (0-100)
- Detailed feedback items with categories
- Overall comments and suggestions

### Hint Generation
- Progressive hints (3 levels)
- Context-aware suggestions
- Maintains previous hint history
- Encourages learning without giving away answers

### Error Handling
- User-friendly error messages
- Automatic retry for transient errors
- Detailed logging for debugging
- Graceful fallback behavior

## Checking Model Availability

Before using a model, you can check its current status:

### Method 1: OpenRouter Models Page
Visit [https://openrouter.ai/models](https://openrouter.ai/models) and:
1. Search for the model name
2. Check if it shows "Free" badge
3. Look for availability status
4. Check rate limits and restrictions

### Method 2: Test in Application
1. Configure the model in Profile settings
2. Try a simple translation
3. If you get a 404 error, the model is not available
4. Switch to an alternative model

### Recommended Fallback Strategy
```typescript
// Primary: Fast and reliable
modelName: 'meta-llama/llama-3.2-3b-instruct:free'

// Fallback 1: Better quality
modelName: 'meta-llama/llama-3.1-8b-instruct:free'

// Fallback 2: Alternative provider
modelName: 'microsoft/phi-3-mini-128k-instruct:free'

// Fallback 3: Paid but cheap
modelName: 'openai/gpt-4o-mini'
```

## Troubleshooting

### Model Not Found (404 Error)
**Error**: `{"error": {"message": "No endpoints found for [model-name]", "code": 404}}`

**Solutions**:
1. Check [OpenRouter Models](https://openrouter.ai/models) for current model list
2. Verify the model ID is exactly correct (case-sensitive)
3. Try an alternative free model from the dropdown
4. Some models may be temporarily unavailable - try again later
5. Consider using a paid model for guaranteed availability

### Invalid API Key Error
**Error**: "Invalid API key. Please check your OpenRouter configuration."

**Solutions**:
1. Verify your API key is correct and starts with `sk-or-v1-`
2. Check that the key is properly set in environment configuration
3. Ensure no extra spaces or quotes around the key
4. Verify the key hasn't been revoked at [OpenRouter Keys](https://openrouter.ai/keys)

### Rate Limit Exceeded
**Error**: "Rate limit exceeded. Please try again in a moment."

**Solutions**:
1. Wait 60 seconds before retrying
2. Consider upgrading to a paid plan for higher limits
3. Implement request throttling in your application
4. Check [OpenRouter Limits](https://openrouter.ai/docs#limits) for current quotas

### Service Temporarily Unavailable
**Error**: "Service temporarily unavailable. Please try again later."

**Solutions**:
1. Check [OpenRouter Status](https://status.openrouter.ai/)
2. Wait a few minutes and retry
3. Try a different model
4. Configure a fallback provider (Azure, OpenAI, or Gemini)

### Network Connection Error
**Error**: "Network error, please check your connection."

**Solutions**:
1. Verify internet connectivity
2. Check firewall settings
3. Ensure `openrouter.ai` is not blocked
4. Try disabling VPN if applicable

### Model Not Available
**Error**: Model-specific error or timeout

**Solutions**:
1. Verify the model ID is correct
2. Check if the model is currently available
3. Try an alternative free model
4. Visit [OpenRouter Models](https://openrouter.ai/models) for status

### Slow Response Times
**Issue**: Responses taking longer than expected

**Solutions**:
1. Switch to a smaller, faster model (Llama 3.2 3B)
2. Reduce context length if possible
3. Check your network latency
4. Consider using non-streaming mode for simpler requests

## Best Practices

### 1. Model Selection
- **Start with Llama 3.2 3B** - Most reliable and consistently available
- **Upgrade to Llama 3.1 8B** when you need better quality
- **Try Hermes 3 405B** for difficult translations (when available)
- **Use Gemma 2 9B** for grammar-focused feedback
- **Have a backup model** ready in case primary is unavailable
- **Consider paid models** (GPT-4o-mini, Claude) for production use

### 2. API Key Security
- Never commit API keys to version control
- Use environment variables for production
- Rotate keys periodically
- Monitor usage at [OpenRouter Dashboard](https://openrouter.ai/activity)

### 3. Error Handling
- Always implement retry logic for transient errors
- Provide clear user feedback for all error types
- Log errors for debugging but don't expose sensitive details
- Have a fallback provider configured

### 4. Performance Optimization
- Use streaming for better user experience
- Cache responses for identical requests
- Implement request debouncing for user input
- Monitor response times and adjust models accordingly

### 5. Cost Management
- Free tier is generous but has limits
- Monitor usage at [OpenRouter Activity](https://openrouter.ai/activity)
- Consider paid tier for production applications
- Implement rate limiting on client side

## Advanced Configuration

### Optional Headers
```typescript
openrouter: {
  apiKey: 'sk-or-v1-...',
  modelName: 'meta-llama/llama-3.1-8b-instruct:free',
  siteUrl: 'https://your-app.com',    // For usage tracking
  siteName: 'Your App Name'            // Displayed in OpenRouter dashboard
}
```

These optional headers help OpenRouter:
- Track usage by application
- Provide better analytics
- Potentially improve service quality

### Temperature Settings
The application uses temperature 0.7 by default, which provides:
- Balanced creativity and consistency
- Natural language responses
- Reliable feedback quality

You can adjust this in the provider implementation if needed.

## Migration from Other Providers

### From Azure OpenAI
```typescript
// Before
aiConfig: {
  provider: 'azure',
  azure: { ... }
}

// After
aiConfig: {
  provider: 'openrouter',
  openrouter: {
    apiKey: 'sk-or-v1-...',
    modelName: 'meta-llama/llama-3.1-8b-instruct:free'
  }
}
```

### From Google Gemini
```typescript
// Before
aiConfig: {
  provider: 'gemini',
  gemini: { ... }
}

// After
aiConfig: {
  provider: 'openrouter',
  openrouter: {
    apiKey: 'sk-or-v1-...',
    modelName: 'google/gemma-2-9b-it:free'  // Similar to Gemini
  }
}
```

## Resources

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [OpenRouter Models](https://openrouter.ai/models)
- [OpenRouter API Reference](https://openrouter.ai/docs#api-reference)
- [OpenRouter Status](https://status.openrouter.ai/)
- [OpenRouter Discord](https://discord.gg/openrouter)

## Support

For issues specific to OpenRouter integration:
1. Check this guide's troubleshooting section
2. Review [OpenRouter Documentation](https://openrouter.ai/docs)
3. Check application logs for detailed error messages
4. Visit [OpenRouter Discord](https://discord.gg/openrouter) for community support

For application-specific issues:
1. Check application documentation
2. Review console logs
3. Verify configuration is correct
4. Try with a different AI provider to isolate the issue
