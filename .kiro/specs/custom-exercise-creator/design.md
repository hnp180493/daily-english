# Design Document

## Overview

The Custom Exercise Creator feature extends the existing AI-Powered English Writing Practice Platform by enabling users to create, manage, and practice personalized exercises. The design integrates seamlessly with the current Angular 20 standalone component architecture, leveraging signals for reactive state management, Firestore for cloud persistence, and the existing AI services for content generation and feedback.

This feature introduces three main components: an Exercise Creator interface with rich text editing and AI generation capabilities, a Custom Exercise Library for management, and integration points with the existing exercise practice workflow. The design maintains consistency with the platform's modern Angular patterns while adding new data models and services to support custom content.

## Architecture

### High-Level Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                      Home Component                          │
│  (Modified to show "Custom" category when applicable)       │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼──────────┐    ┌────────▼─────────────┐
│ Exercise List    │    │ Custom Exercise      │
│ Component        │    │ Library Component    │
│ (Existing)       │    │ (New)                │
└───────┬──────────┘    └────────┬─────────────┘
        │                        │
        │                ┌───────▼──────────────┐
        │                │ Exercise Creator     │
        │                │ Component (New)      │
        │                └───────┬──────────────┘
        │                        │
        └────────────┬───────────┘
                     │
        ┌────────────▼────────────┐
        │ Exercise Detail         │
        │ Component (Modified)    │
        └─────────────────────────┘
```

### Service Layer Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Component Layer                            │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│                    Service Layer                              │
│                                                               │
│  ┌─────────────────────┐    ┌──────────────────────────┐    │
│  │ Custom Exercise     │    │ Exercise Service         │    │
│  │ Service (New)       │◄───┤ (Modified)               │    │
│  └──────┬──────────────┘    └──────────────────────────┘    │
│         │                                                     │
│  ┌──────▼──────────────┐    ┌──────────────────────────┐    │
│  │ Firestore Sync      │    │ AI Service               │    │
│  │ Service (Modified)  │    │ (OpenAI/Gemini)          │    │
│  └─────────────────────┘    └──────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│                    Data Layer                                 │
│  ┌─────────────────────┐    ┌──────────────────────────┐    │
│  │ LocalStorage        │    │ Firestore                │    │
│  │ (Custom Exercises)  │    │ (Cloud Sync)             │    │
│  └─────────────────────┘    └──────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Exercise Creator Component

**Location:** `src/app/components/exercise-creator/exercise-creator.ts`

**Purpose:** Provides the interface for creating and editing custom exercises with rich text editing and AI generation capabilities.

**Key Features:**
- Rich text editor integration (Quill)
- AI content generation from prompts
- Sentence highlighting for translation targets
- Difficulty level selection
- Custom category and tag management
- Form validation and error handling

**Component Structure:**
```typescript
@Component({
  selector: 'app-exercise-creator',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, QuillModule],
  templateUrl: './exercise-creator.html',
  styleUrl: './exercise-creator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExerciseCreatorComponent {
  // Services
  private customExerciseService = inject(CustomExerciseService);
  private aiService = inject(AIService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  // State signals
  exerciseId = signal<string | null>(null);
  isEditMode = computed(() => this.exerciseId() !== null);
  isGenerating = signal(false);
  isSaving = signal(false);
  
  // Form signals
  title = signal('');
  sourceText = signal('');
  difficulty = signal<DifficultyLevel>(DifficultyLevel.BEGINNER);
  customCategories = signal<string[]>([]);
  tags = signal<string[]>([]);
  highlightedSentences = signal<string[]>([]);
  
  // AI generation
  aiPrompt = signal('');
  generationError = signal<string | null>(null);
  
  // Quill editor config
  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean']
    ]
  };
  
  // Methods
  generateWithAI(): void;
  highlightSentence(sentence: string): void;
  removeHighlight(index: number): void;
  addCategory(category: string): void;
  removeCategory(index: number): void;
  addTag(tag: string): void;
  removeTag(index: number): void;
  saveExercise(): void;
  cancel(): void;
}
```

**Template Features:**
- Two-tab interface: "Manual Entry" and "AI Generate"
- Rich text editor with formatting toolbar
- Visual sentence highlighting with click-to-select
- Chip-based category and tag management
- Real-time validation feedback
- Loading states for AI generation and saving

### 2. Custom Exercise Library Component

**Location:** `src/app/components/custom-exercise-library/custom-exercise-library.ts`

**Purpose:** Displays and manages the user's collection of custom exercises with search, filter, and CRUD operations.

**Component Structure:**
```typescript
@Component({
  selector: 'app-custom-exercise-library',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './custom-exercise-library.html',
  styleUrl: './custom-exercise-library.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomExerciseLibraryComponent {
  // Services
  private customExerciseService = inject(CustomExerciseService);
  private router = inject(Router);
  
  // State signals
  exercises = toSignal(this.customExerciseService.getCustomExercises());
  searchQuery = signal('');
  selectedDifficulty = signal<DifficultyLevel | null>(null);
  selectedCategory = signal<string | null>(null);
  selectedTags = signal<string[]>([]);
  
  // Computed signals
  filteredExercises = computed(() => {
    let result = this.exercises() || [];
    
    // Apply search filter
    const query = this.searchQuery().toLowerCase();
    if (query) {
      result = result.filter(ex => 
        ex.title.toLowerCase().includes(query) ||
        ex.sourceText.toLowerCase().includes(query) ||
        ex.customCategories?.some(c => c.toLowerCase().includes(query)) ||
        ex.tags?.some(t => t.toLowerCase().includes(query))
      );
    }
    
    // Apply difficulty filter
    const difficulty = this.selectedDifficulty();
    if (difficulty) {
      result = result.filter(ex => ex.level === difficulty);
    }
    
    // Apply category filter
    const category = this.selectedCategory();
    if (category) {
      result = result.filter(ex => 
        ex.customCategories?.includes(category)
      );
    }
    
    // Apply tag filter
    const tags = this.selectedTags();
    if (tags.length > 0) {
      result = result.filter(ex =>
        tags.every(tag => ex.tags?.includes(tag))
      );
    }
    
    return result;
  });
  
  allCategories = computed(() => {
    const exercises = this.exercises() || [];
    const categories = new Set<string>();
    exercises.forEach(ex => {
      ex.customCategories?.forEach(c => categories.add(c));
    });
    return Array.from(categories).sort();
  });
  
  allTags = computed(() => {
    const exercises = this.exercises() || [];
    const tags = new Set<string>();
    exercises.forEach(ex => {
      ex.tags?.forEach(t => tags.add(t));
    });
    return Array.from(tags).sort();
  });
  
  // Methods
  createNew(): void;
  editExercise(id: string): void;
  deleteExercise(id: string): void;
  practiceExercise(id: string): void;
  clearFilters(): void;
}
```

**Template Features:**
- Search bar with real-time filtering
- Filter chips for difficulty, categories, and tags
- Grid/list view of exercises with preview cards
- Action buttons: Edit, Delete, Practice
- Empty state with "Create First Exercise" CTA
- Confirmation dialog for deletions

### 3. Modified Home Component

**Location:** `src/app/components/home/home.ts` (existing, to be modified)

**Modifications:**
- Add "Custom" category to the category list when user has custom exercises
- Filter custom category by selected difficulty level
- Navigate to Custom Exercise Library when "Custom" category is selected

**New Computed Signal:**
```typescript
hasCustomExercises = computed(() => {
  const exercises = this.customExerciseService.getCustomExercisesByLevel(
    this.selectedLevel()
  );
  return exercises.length > 0;
});

displayCategories = computed(() => {
  const baseCategories = Object.values(ExerciseCategory);
  if (this.hasCustomExercises()) {
    return [...baseCategories, 'custom'];
  }
  return baseCategories;
});
```

### 4. Modified Exercise Detail Component

**Location:** `src/app/components/exercise-detail/exercise-detail.ts` (existing, to be modified)

**Modifications:**
- Support loading custom exercises by ID
- Display custom exercise indicator in UI
- Track attempts for custom exercises using existing progress system

**Modified Exercise Loading:**
```typescript
ngOnInit(): void {
  this.route.params.subscribe(params => {
    const id = params['id'];
    
    // Try loading from regular exercises first
    this.exerciseService.getExerciseById(id).subscribe(exercise => {
      if (exercise) {
        this.exercise.set(exercise);
        this.isCustomExercise.set(false);
      } else {
        // Try loading from custom exercises
        this.customExerciseService.getCustomExerciseById(id).subscribe(customEx => {
          if (customEx) {
            this.exercise.set(customEx);
            this.isCustomExercise.set(true);
          }
        });
      }
    });
  });
}
```

## Data Models

### Extended Exercise Interface

```typescript
export interface CustomExercise extends Exercise {
  isCustom: true;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  customCategories?: string[];
  tags?: string[];
  generatedByAI?: boolean;
  aiPrompt?: string;
}
```

### AI Generation Request

```typescript
export interface ExerciseGenerationRequest {
  prompt: string;
  difficulty: DifficultyLevel;
  targetLanguage?: string;
  sourceLanguage?: string;
}

export interface ExerciseGenerationResponse {
  title: string;
  sourceText: string;
  suggestedSentences: string[];
  category?: string;
}
```

### Storage Schema

**LocalStorage Key:** `custom_exercises_{userId}`

**Structure:**
```typescript
{
  exercises: CustomExercise[];
  lastModified: string; // ISO timestamp
}
```

**Firestore Collection:** `users/{userId}/customExercises`

**Document Structure:**
```typescript
{
  id: string;
  title: string;
  level: string;
  category: string; // Always "custom" for custom exercises
  description: string;
  sourceText: string;
  highlightedSentences: string[];
  hints: string[];
  customCategories: string[];
  tags: string[];
  isCustom: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  userId: string;
  generatedByAI: boolean;
  aiPrompt?: string;
}
```

## Services

### Custom Exercise Service

**Location:** `src/app/services/custom-exercise.service.ts`

**Responsibilities:**
- CRUD operations for custom exercises
- LocalStorage persistence
- Firestore synchronization
- Exercise validation
- AI content generation coordination

**Interface:**
```typescript
@Injectable({
  providedIn: 'root'
})
export class CustomExerciseService {
  private authService = inject(AuthService);
  private firestoreSync = inject(FirestoreSyncService);
  private aiService = inject(AIService);
  private http = inject(HttpClient);
  
  private exercises$ = new BehaviorSubject<CustomExercise[]>([]);
  
  // Observable streams
  getCustomExercises(): Observable<CustomExercise[]>;
  getCustomExerciseById(id: string): Observable<CustomExercise | undefined>;
  getCustomExercisesByLevel(level: DifficultyLevel): Observable<CustomExercise[]>;
  getCustomExercisesByCategory(category: string): Observable<CustomExercise[]>;
  getCustomExercisesByTags(tags: string[]): Observable<CustomExercise[]>;
  
  // CRUD operations
  createExercise(exercise: Partial<CustomExercise>): Observable<CustomExercise>;
  updateExercise(id: string, updates: Partial<CustomExercise>): Observable<CustomExercise>;
  deleteExercise(id: string): Observable<void>;
  
  // AI generation
  generateExerciseContent(request: ExerciseGenerationRequest): Observable<ExerciseGenerationResponse>;
  
  // Utility methods
  extractSentences(text: string): string[];
  validateExercise(exercise: Partial<CustomExercise>): ValidationResult;
  
  // Private methods
  private loadFromLocalStorage(): CustomExercise[];
  private saveToLocalStorage(exercises: CustomExercise[]): void;
  private syncToFirestore(exercise: CustomExercise): Observable<void>;
  private generateExerciseId(): string;
}
```

### Modified Firestore Sync Service

**Location:** `src/app/services/firestore-sync.service.ts` (existing, to be modified)

**New Methods:**
```typescript
// Custom exercise sync methods
saveCustomExercise(exercise: CustomExercise): Observable<void>;
loadCustomExercises(): Observable<CustomExercise[]>;
deleteCustomExercise(exerciseId: string): Observable<void>;
subscribeToCustomExercises(callback: (exercises: CustomExercise[]) => void): Unsubscribe;
```

### Modified Exercise Service

**Location:** `src/app/services/exercise.service.ts` (existing, to be modified)

**New Methods:**
```typescript
// Check if exercise is custom
isCustomExercise(id: string): boolean;

// Get exercise from either source
getExerciseByIdUnified(id: string): Observable<Exercise | CustomExercise | undefined>;
```

### AI Content Generation Service

**Location:** `src/app/services/ai/exercise-generator.service.ts` (new)

**Purpose:** Specialized service for generating exercise content using AI providers.

**Interface:**
```typescript
@Injectable({
  providedIn: 'root'
})
export class ExerciseGeneratorService {
  private configService = inject(ConfigService);
  private openaiService = inject(OpenAIService);
  private geminiService = inject(GeminiService);
  
  generateExercise(request: ExerciseGenerationRequest): Observable<ExerciseGenerationResponse>;
  
  private buildGenerationPrompt(request: ExerciseGenerationRequest): string;
  private parseGenerationResponse(response: string): ExerciseGenerationResponse;
  private getCurrentProvider(): AIProvider;
}
```

**Generation Prompt Template:**
```
You are an English language teacher creating practice exercises for students.

Generate a translation exercise based on this prompt: {prompt}

Requirements:
- Difficulty level: {difficulty}
- Source language: {sourceLanguage}
- Target language: English
- Create a short paragraph (3-5 sentences) in the source language
- Identify 2-3 key sentences that would be good for translation practice
- Provide a descriptive title for the exercise

Format your response as JSON:
{
  "title": "Exercise title",
  "sourceText": "Full paragraph in source language",
  "suggestedSentences": ["sentence 1", "sentence 2"],
  "category": "suggested category"
}
```

## Error Handling

### Client-Side Validation

**Exercise Creator Validation:**
- Title: Required, 3-100 characters
- Source Text: Required, minimum 10 characters
- Highlighted Sentences: At least 1 required, must exist in source text
- Difficulty Level: Required
- Custom Categories: Optional, max 5, each 2-50 characters
- Tags: Optional, max 10, each 2-30 characters

**Validation Feedback:**
- Real-time validation with visual indicators
- Error messages displayed inline
- Prevent form submission until valid
- Highlight invalid fields

### AI Generation Error Handling

**Error Scenarios:**
1. API key not configured
2. Network failure
3. Rate limiting
4. Invalid response format
5. Content policy violations

**Error Recovery:**
- Display user-friendly error messages
- Provide retry option
- Fallback to manual entry
- Log errors for debugging

**Example Error Messages:**
```typescript
const ERROR_MESSAGES = {
  NO_API_KEY: 'AI generation is not configured. Please enter content manually.',
  NETWORK_ERROR: 'Failed to connect to AI service. Please check your connection and try again.',
  RATE_LIMIT: 'AI service rate limit reached. Please try again in a few minutes.',
  INVALID_RESPONSE: 'AI generated invalid content. Please try again or enter manually.',
  CONTENT_POLICY: 'Content violates AI service policies. Please modify your prompt.'
};
```

### Storage Error Handling

**LocalStorage Errors:**
- Quota exceeded: Prompt user to delete old exercises
- Parse errors: Reset to empty state with user notification
- Access denied: Inform user of browser restrictions

**Firestore Errors:**
- Authentication required: Redirect to login
- Permission denied: Display error and continue with local-only mode
- Network errors: Queue changes for retry
- Conflict resolution: Use last-write-wins strategy with timestamp comparison

## Testing Strategy

### Unit Tests

**Custom Exercise Service Tests:**
- CRUD operations return correct data
- Validation logic catches invalid inputs
- LocalStorage read/write operations work correctly
- Exercise ID generation is unique
- Filtering and search logic returns correct results

**Exercise Generator Service Tests:**
- Prompt building includes all required parameters
- Response parsing handles various formats
- Error scenarios are handled gracefully
- Provider selection works correctly

**Component Tests:**
- Exercise Creator form validation works
- Sentence highlighting adds/removes correctly
- Category and tag management functions properly
- AI generation triggers correct service calls
- Save/cancel navigation works as expected

### Integration Tests

**End-to-End Workflows:**
1. Create custom exercise manually → Save → Verify in library
2. Generate exercise with AI → Edit → Save → Practice
3. Filter exercises by difficulty → Verify correct results
4. Search exercises by keyword → Verify matches
5. Delete exercise → Confirm removal from library
6. Edit existing exercise → Verify updates persist

**Firestore Sync Tests:**
- Create exercise → Verify sync to cloud
- Update exercise → Verify cloud update
- Delete exercise → Verify cloud deletion
- Login on new device → Verify exercises load
- Offline changes → Verify sync when online

### Accessibility Tests

**WCAG AA Compliance:**
- Keyboard navigation through all forms and controls
- Screen reader announcements for dynamic content
- Focus management in modals and dialogs
- Color contrast meets 4.5:1 ratio
- Form labels and error messages are accessible
- ARIA attributes for custom controls

**Testing Tools:**
- Axe DevTools for automated scanning
- Manual keyboard navigation testing
- Screen reader testing (NVDA/JAWS)
- Color contrast analyzer

## Performance Considerations

### Optimization Strategies

**Component Performance:**
- OnPush change detection for all components
- Computed signals for derived state
- Virtual scrolling for large exercise lists
- Lazy loading of rich text editor
- Debounced search input (300ms)

**Data Loading:**
- Load custom exercises on demand
- Cache exercises in memory
- Paginate library view (20 items per page)
- Preload next page on scroll

**AI Generation:**
- Show loading indicator immediately
- Stream responses when possible
- Cancel in-flight requests on navigation
- Cache generation results temporarily

**Storage:**
- Batch Firestore writes
- Compress large text content
- Limit stored exercise count (max 100 per user)
- Clean up old exercises automatically

### Bundle Size

**Rich Text Editor:**
- Use Quill (lightweight, ~50KB gzipped)
- Load editor module lazily
- Tree-shake unused features

**Total Impact:**
- Estimated bundle increase: ~80KB gzipped
- Lazy-loaded routes minimize initial load
- Code splitting by feature

## Security Considerations

### Data Validation

**Input Sanitization:**
- Sanitize HTML from rich text editor
- Validate all user inputs on client and server
- Prevent XSS attacks in custom content
- Limit text length to prevent abuse

**Firestore Security Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/customExercises/{exerciseId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null 
        && request.auth.uid == userId
        && request.resource.data.userId == userId
        && request.resource.data.title is string
        && request.resource.data.title.size() >= 3
        && request.resource.data.title.size() <= 100
        && request.resource.data.sourceText is string
        && request.resource.data.sourceText.size() >= 10
        && request.resource.data.highlightedSentences is list
        && request.resource.data.highlightedSentences.size() >= 1;
    }
  }
}
```

### AI Service Security

**API Key Protection:**
- Store keys in environment variables
- Never expose keys in client code
- Use server-side proxy for AI calls (future enhancement)
- Rotate keys regularly

**Content Filtering:**
- Validate AI-generated content
- Check for inappropriate content
- Limit generation frequency per user
- Monitor for abuse patterns

### User Data Privacy

**Data Ownership:**
- Users own their custom exercises
- Exercises are private by default
- Clear data deletion on account removal
- Export functionality for data portability

**Compliance:**
- GDPR-compliant data handling
- Clear privacy policy
- User consent for AI processing
- Data retention policies

## Migration and Rollout

### Phase 1: Core Functionality (MVP)
- Exercise Creator component with manual entry
- Custom Exercise Library with basic CRUD
- LocalStorage persistence
- Integration with existing practice workflow

### Phase 2: AI Generation
- AI content generation service
- Exercise Generator integration
- Error handling and retry logic

### Phase 3: Enhanced Features
- Firestore synchronization
- Advanced search and filtering
- Category and tag management
- Bulk operations

### Phase 4: Polish and Optimization
- Performance optimizations
- Accessibility improvements
- User feedback integration
- Analytics and monitoring

### Backward Compatibility

**Existing Data:**
- No changes to existing exercise data structure
- Custom exercises stored separately
- Existing progress tracking unchanged
- No migration required for current users

**Feature Flags:**
- Enable custom exercises per user
- Gradual rollout capability
- A/B testing support
- Easy rollback if needed
