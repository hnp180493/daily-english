# Project Structure & Conventions

## File Organization

```
src/app/
├── components/          # UI components (standalone)
├── models/             # TypeScript interfaces and enums
├── services/           # Business logic and data services
│   └── ai/            # AI provider implementations
├── app.config.ts      # Application configuration
├── app.routes.ts      # Route definitions
└── app.ts             # Root component
```

## Component Structure

Each component follows this pattern:
- `component-name.ts` - Component class
- `component-name.html` - Template
- `component-name.scss` - Styles
- No `.component` suffix in filenames

Example: `header/header.ts`, `header/header.html`, `header/header.scss`

## Naming Conventions

### Components
- **Class names**: PascalCase without "Component" suffix (e.g., `Header`, `ExerciseDetail`)
- **Selectors**: kebab-case with `app-` prefix (e.g., `app-header`)
- **Files**: kebab-case (e.g., `exercise-detail.ts`)

### Services
- **Class names**: PascalCase with "Service" suffix (e.g., `ExerciseService`)
- **Files**: kebab-case with `.service.ts` suffix

### Models
- **Interfaces**: PascalCase (e.g., `Exercise`, `FeedbackItem`)
- **Enums**: PascalCase (e.g., `DifficultyLevel`, `ExerciseCategory`)
- **Files**: kebab-case with `.model.ts` suffix

## Angular Patterns

### Standalone Components
All components use standalone architecture (no NgModules):
```typescript
@Component({
  selector: 'app-component-name',
  imports: [CommonModule, RouterModule, ...],
  templateUrl: './component-name.html',
  styleUrl: './component-name.scss'
})
```

### Dependency Injection
Use constructor injection with `inject()` function or constructor parameters

### Routing
Routes defined in `app.routes.ts` using functional routing

## Code Style

### TypeScript
- Single quotes for strings
- Strict typing (no `any` unless absolutely necessary)
- Explicit return types on functions
- Use enums for fixed sets of values

### Templates
- Angular template syntax
- Prettier formatting with 100 character line width
- Use structural directives (`*ngIf`, `*ngFor`)

### Styling
- Tailwind utility classes preferred
- Component-scoped SCSS for custom styles
- Use theme colors from `tailwind.config.js`

## Key Directories

- `public/data/` - Static JSON data files (exercises)
- `src/environments/` - Environment-specific configuration
- `.angular/cache/` - Build cache (gitignored)
- `dist/` - Production build output

## Configuration Files

- `angular.json` - Angular workspace configuration
- `tsconfig.json` - TypeScript compiler options
- `tailwind.config.js` - Tailwind theme customization
- `package.json` - Dependencies and scripts
