# Technology Stack

## Framework & Core

- **Angular 20**: Modern standalone components (no NgModules)
- **TypeScript 5.9**: Strict mode enabled with comprehensive type checking
- **RxJS 7.8**: Reactive programming for async operations
- **Zone.js**: Change detection

## Styling

- **SCSS**: Component-scoped styles
- **Tailwind CSS 3.4**: Utility-first CSS framework
- **Custom theme colors**: primary (#4F46E5), secondary (#10B981), dark (#1F2937)

## AI Integration

- **Azure OpenAI**: GPT-4 for translation feedback
- **Google Gemini**: Alternative AI provider (gemini-pro)
- Configurable via `src/environments/environment.ts`

## Build & Development

- **Angular CLI**: Project scaffolding and build system
- **Karma + Jasmine**: Testing framework
- **Prettier**: Code formatting (printWidth: 100, singleQuote: true)

## Common Commands

```bash
# Development
npm start                    # Start dev server (localhost:4200)
ng serve                     # Alternative start command

# Build
npm run build               # Production build
ng build                    # Build with Angular CLI
npm run watch               # Development build with watch mode

# Testing
npm test                    # Run unit tests
ng test                     # Run tests with Angular CLI

# Code Quality
npx prettier --write "src/**/*.{ts,html,scss}"  # Format code
```

## TypeScript Configuration

- Strict mode enabled
- No implicit returns
- No fallthrough cases in switch
- Experimental decorators enabled
- Strict Angular templates
- Target: ES2022

## Browser Support

Chrome, Firefox, Safari, Edge (latest versions)
