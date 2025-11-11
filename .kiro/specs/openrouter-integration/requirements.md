# Requirements Document

## Introduction

This feature adds OpenRouter as a new AI provider to the English learning application, enabling access to multiple free AI models through a unified API. OpenRouter aggregates various AI models and provides a consistent interface, allowing users to leverage different models for translation feedback, hints, and exercise generation without managing multiple API keys.

## Glossary

- **OpenRouter**: An AI model aggregation service that provides unified API access to multiple AI providers
- **AI Provider**: A service that implements the BaseAIProvider interface to generate AI responses
- **Translation Analysis**: The process of evaluating user's English translation against the source text
- **Hint Generation**: AI-generated progressive hints to help users improve their translations
- **Exercise Context**: Metadata about the current exercise including difficulty, category, and surrounding text
- **Streaming Response**: Real-time delivery of AI responses as they are generated, chunk by chunk
- **Model Configuration**: Settings that specify which AI model to use and its parameters

## Requirements

### Requirement 1

**User Story:** As a user, I want to use OpenRouter's free AI models for translation feedback, so that I can get quality feedback without requiring paid API keys

#### Acceptance Criteria

1. WHEN the user configures OpenRouter as the AI provider, THE Application SHALL send translation analysis requests to OpenRouter's API endpoint
2. WHEN OpenRouter returns a response, THE Application SHALL parse the response into the standard AIResponse format with accuracyScore and feedback items
3. IF OpenRouter API returns an error, THEN THE Application SHALL display a user-friendly error message and log the technical details
4. THE Application SHALL support at least 7 free AI models optimized for English language learning tasks
5. WHEN the user submits a translation, THE Application SHALL use the configured OpenRouter model to analyze the translation quality

### Requirement 2

**User Story:** As a developer, I want OpenRouter to integrate seamlessly with the existing AI provider architecture, so that switching between providers requires minimal code changes

#### Acceptance Criteria

1. THE OpenRouter Provider SHALL extend the BaseAIProvider abstract class
2. THE OpenRouter Provider SHALL implement the generateText method for basic text generation
3. THE OpenRouter Provider SHALL implement the analyzeText method for translation analysis
4. THE OpenRouter Provider SHALL implement the analyzeTextStream method for real-time streaming responses
5. THE OpenRouter Provider SHALL implement the generateHint method for progressive hint generation
6. THE AIProviderFactory SHALL register the OpenRouter provider and make it available through getProvider method
7. WHEN the environment configuration specifies 'openrouter' as the provider, THE Application SHALL use the OpenRouter provider for all AI operations

### Requirement 3

**User Story:** As a user, I want to receive streaming feedback from OpenRouter models, so that I can see analysis results progressively as they are generated

#### Acceptance Criteria

1. WHEN the user submits a translation, THE Application SHALL establish a streaming connection to OpenRouter's API
2. WHEN OpenRouter streams the accuracy score, THE Application SHALL emit a score chunk immediately
3. WHEN OpenRouter streams individual feedback items, THE Application SHALL emit each feedback item as it becomes complete
4. WHEN the stream completes, THE Application SHALL emit a complete chunk with the full parsed response
5. IF the streaming connection fails, THEN THE Application SHALL emit an error and fall back gracefully

### Requirement 4

**User Story:** As a developer, I want to configure OpenRouter with API key and model selection, so that I can control which models are used for different tasks

#### Acceptance Criteria

1. THE Environment Configuration SHALL include an openrouter section with apiKey and modelName properties
2. THE OpenRouter Provider SHALL validate that apiKey and modelName are present before making API calls
3. THE OpenRouter Provider SHALL return false from isConfigured method when required configuration is missing
4. WHERE the configuration includes a specific model name, THE OpenRouter Provider SHALL use that model for all requests
5. THE Application SHALL support configuration of different models for different environments (development, production)

### Requirement 5

**User Story:** As a user, I want access to multiple free AI models through OpenRouter, so that I can choose the best model for my learning needs

#### Acceptance Criteria

1. THE Application SHALL support the following free OpenRouter models optimized for English learning:
   - meta-llama/llama-3.2-3b-instruct:free
   - meta-llama/llama-3.1-8b-instruct:free
   - google/gemma-2-9b-it:free
   - microsoft/phi-3-mini-128k-instruct:free
   - mistralai/mistral-7b-instruct:free
   - qwen/qwen-2-7b-instruct:free
   - huggingfaceh4/zephyr-7b-beta:free
2. THE Configuration Documentation SHALL list each model with its strengths for language learning tasks
3. THE OpenRouter Provider SHALL send the configured model name in the API request
4. WHEN a model is not available, THE OpenRouter Provider SHALL return a clear error message indicating the model status

### Requirement 6

**User Story:** As a user, I want OpenRouter to provide consistent hint generation, so that I receive helpful progressive hints when I'm stuck

#### Acceptance Criteria

1. WHEN the user requests a hint, THE OpenRouter Provider SHALL send a hint generation request with the source text and user input
2. THE OpenRouter Provider SHALL include previous hints in the request to ensure progressive difficulty
3. THE OpenRouter Provider SHALL use the PromptService to build the hint prompt with proper context
4. WHEN OpenRouter returns a hint, THE Application SHALL display it to the user immediately
5. THE Hint Generation SHALL use a temperature of 0.7 to balance creativity and consistency

### Requirement 7

**User Story:** As a developer, I want OpenRouter to handle API errors gracefully, so that users receive helpful feedback when issues occur

#### Acceptance Criteria

1. WHEN OpenRouter API returns a 401 error, THE Application SHALL display "Invalid API key" message
2. WHEN OpenRouter API returns a 429 error, THE Application SHALL display "Rate limit exceeded" message
3. WHEN OpenRouter API returns a 500 error, THE Application SHALL display "Service temporarily unavailable" message
4. WHEN the network connection fails, THE Application SHALL display "Network error, please check your connection" message
5. THE Application SHALL log all API errors with full details to the console for debugging
6. IF an error occurs during streaming, THEN THE Application SHALL emit the error through the Observable error channel

### Requirement 8

**User Story:** As a user, I want OpenRouter requests to use appropriate temperature settings, so that I receive consistent and reliable feedback

#### Acceptance Criteria

1. THE OpenRouter Provider SHALL use temperature 0.7 for translation analysis to balance accuracy and natural language
2. THE OpenRouter Provider SHALL use temperature 0.7 for hint generation to provide varied but helpful hints
3. THE OpenRouter Provider SHALL allow temperature to be overridden through the AIRequest parameter
4. THE OpenRouter Provider SHALL include temperature in all API requests to ensure consistent behavior
5. WHERE a model has specific temperature requirements, THE OpenRouter Provider SHALL respect those constraints
