# Design Document

## Overview

The Translation Dictation Practice feature extends the existing exercise system to allow learners to practice dictation using their own translated text. This feature leverages the existing TTS (Text-to-Speech) infrastructure and exercise UI components while introducing new data models and services to manage dictation practice sessions separately from translation exercises.

The design follows the existing Angular standalone component architecture and integrates seamlessly with the current exercise flow, progress tracking, and achievement systems.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Exercise Detail Component                 │
│  (Existing - Modified to show dictation practice option)    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─────────────────────────────────────────────┐
                 │                                             │
                 ▼                                             ▼
┌────────────────────────────────┐    ┌──────────────────────────────────┐
│  Translation Exercise Mode     │    │  Dictation Practice Mode (NEW)   │
│  (Existing)                    │    │  (New Component)                 │
└────────────────────────────────┘    └──────────────┬───────────────────┘
                                                      │
                                      ┌───────────────┼───────────────┐
                                      │               │               │
                                      ▼               ▼               ▼
                        ┌──────────────────┐  ┌─────────────┐  ┌──────────────┐
                        │ TTS Service      │  │ Progress    │  │ Dictation    │
                        │ (Existing)       │  │ Service     │  │ Practice     │
                        │                  │  │ (Modified)  │  │ Service      │
                        └──────────────────┘  └─────────────┘  │ (NEW)        │
                                                                └──────────────┘
```

### Component Structure

```
src/app/
├── components/
│   ├── exercise-detail/                    # Modified to add dictation option
│   │   ├── exercise-detail.ts
│   │   ├── exercise-detail.html
│   │   └── exercise-detail.scss
│   ├── dictation-practice/                 # NEW - Main dictation practice component
│   │   ├── dictation-practice.ts
│   │   ├── dictation-practice.html
│   │   └── dictation-practice.scss
│   └── dictation-feedback/                 # NEW - Feedback display for dictation
│       ├── dictation-feedback.ts
│       ├── dictation-feedback.html
│       └── dictation-feedback.scss
├── models/
│   └── dictation.model.ts                  # NEW - Dictation practice data models
├── services/
│   ├── dictation-practice.service.ts       # NEW - Manages dictation sessions
│   ├── progress.service.ts                 # Modified to track dictation attempts
│   └── tts.service.ts                      # Existing - No changes needed
└── app.routes.ts                           # Modified to add dictation route
```

## Components and Interfaces

### 1. Dictation Practice Component

**Purpose**: Main component for dictation practice mode, similar to exercise-detail but focused on listening and typing.

**Key Features**:
- Audio playback controls (play, pause, replay, speed adjustment)
- Sentence-by-sentence navigation
- Real-time input comparison
- Progress tracking
- Accuracy scoring

**Component Structure**:
```typescript
@Component({
  selector: 'app-dictation-practice',
  imports: [CommonModule, FormsModule, DictationFeedbackComponent, TTSSettings],
  templateUrl: './dictation-practice.html',
  styleUrl: './dictation-practice.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DictationPracticeComponent implements OnInit, OnDestroy {
  // Injected services
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dictationService = inject(DictationPracticeService);
  private ttsService = inject(TTSService);
  private progressService = inject(ProgressService);
  
  // Signals for reactive state
  exercise = signal<Exercise | null>(null);
  translatedText = signal<string>('');
  sentences = signal<DictationSentence[]>([]);
  currentSentenceIndex = signal<number>(0);
  userInput = signal<string>('');
  isPlaying = signal<boolean>(false);
  isPaused = signal<boolean>(false);
  playbackSpeed = signal<number>(1.0);
  showFeedback = signal<boolean>(false);
  currentAccuracy = signal<number>(0);
  
  // Computed values
  currentSentence = computed(() => this.sentences()[this.currentSentenceIndex()]);
  progressPercentage = computed(() => {
    const completed = this.sentences().filter(s => s.isCompleted).length;
    return (completed / this.sentences().length) * 100;
  });
  isComplete = computed(() => this.sentences().every(s => s.isCompleted));
}
```

### 2. Dictation Feedback Component

**Purpose**: Display accuracy feedback and differences between user input and original text.

**Features**:
- Character-level diff visualization
- Word-level accuracy metrics
- Mistake categorization (missing, extra, misspelled)
- Visual highlighting of errors

### 3. Modified Exercise Detail Component

**Changes**:
- Add "Practice Dictation" button in review mode
- Store completed translations for dictation access
- Navigate to dictation practice route with exercise ID

## Data Models

### Dictation Practice Models

```typescript
// New file: src/app/models/dictation.model.ts

export interface DictationSentence {
  original: string;           // The translated text to dictate
  userInput: string;          // What user typed
  isCompleted: boolean;       // Whether sentence is completed
  accuracyScore: number;      // 0-100 accuracy score
  attempts: number;           // Number of attempts for this sentence
  feedback: DictationFeedback | null;
}

export interface DictationFeedback {
  differences: TextDifference[];
  characterAccuracy: number;  // Percentage of correct characters
  wordAccuracy: number;       // Percentage of correct words
  mistakes: MistakeCategory;
}

export interface TextDifference {
  type: 'match' | 'insert' | 'delete' | 'replace';
  originalText: string;
  userText: string;
  startIndex: number;
  endIndex: number;
}

export interface MistakeCategory {
  missingWords: string[];
  extraWords: string[];
  misspelledWords: Array<{ original: string; typed: string }>;
}

export interface DictationPracticeAttempt {
  exerciseId: string;
  translatedText: string;     // The full translated text used
  attemptNumber: number;
  sentenceAttempts: DictationSentence[];
  overallAccuracy: number;
  timeSpent: number;          // Seconds
  timestamp: Date;
  playbackSpeed: number;
}

export interface DictationProgress {
  [exerciseId: string]: DictationPracticeAttempt;
}
```

### Modified UserProgress Model

```typescript
// Add to existing src/app/models/exercise.model.ts

export interface UserProgress {
  exerciseHistory: { [exerciseId: string]: ExerciseAttempt };
  dictationHistory: { [exerciseId: string]: DictationPracticeAttempt }; // NEW
  totalCredits: number;
  totalPoints: number;
  lastActivityDate: Date;
  currentStreak: number;
  longestStreak: number;
  lastStreakDate: string;
  achievements: string[];
}
```

## Services

### 1. DictationPracticeService (NEW)

**Purpose**: Manages dictation practice sessions, scoring, and persistence.

**Key Methods**:

```typescript
@Injectable({ providedIn: 'root' })
export class DictationPracticeService {
  private databaseService = inject(DatabaseService);
  private authService = inject(AuthService);
  
  // Get translated text for an exercise
  getTranslatedText(exerciseId: string): Observable<string | null>;
  
  // Initialize dictation session
  initializeDictationSession(exerciseId: string, translatedText: string): DictationSentence[];
  
  // Calculate accuracy between user input and original text
  calculateAccuracy(original: string, userInput: string): DictationFeedback;
  
  // Save dictation attempt
  saveDictationAttempt(attempt: DictationPracticeAttempt): Observable<void>;
  
  // Load dictation history
  loadDictationHistory(): Observable<DictationProgress>;
  
  // Get best dictation attempt for an exercise
  getBestDictationAttempt(exerciseId: string): Observable<DictationPracticeAttempt | null>;
}
```

**Implementation Details**:

1. **Text Splitting**: Use regex to split translated text into sentences (similar to existing sentence splitting logic)

2. **Accuracy Calculation**: 
   - Use Levenshtein distance algorithm for character-level comparison
   - Tokenize into words for word-level accuracy
   - Normalize text (trim, lowercase) before comparison
   - Calculate percentage: `(1 - (distance / maxLength)) * 100`

3. **Difference Detection**:
   - Implement diff algorithm (similar to git diff)
   - Categorize changes as: match, insert, delete, replace
   - Track position indices for highlighting

4. **Storage**:
   - Store dictation attempts in Firestore under `users/{userId}/dictationProgress`
   - Keep only the latest attempt per exercise (similar to exerciseHistory)
   - Include timestamp for tracking

### 2. Modified ProgressService

**Changes**:
- Add `dictationHistory` field to UserProgress
- Add method `recordDictationAttempt(attempt: DictationPracticeAttempt)`
- Update streak calculation to include dictation practice
- Add dictation-specific achievements

**New Achievements**:
- `first-dictation`: Complete first dictation practice
- `dictation-master`: Complete 10 dictation practices with 90%+ accuracy
- `perfect-dictation`: Complete dictation with 100% accuracy

### 3. TTSService (Existing - No Changes)

The existing TTSService already provides all necessary functionality:
- Text-to-speech conversion using Web Speech API
- Playback controls (play, pause, stop)
- Speed adjustment (0.5x - 2.0x)
- Voice selection
- Sentence-by-sentence playback

## User Flow

### Starting Dictation Practice

```
1. User completes translation exercise
   ↓
2. Exercise Detail shows "Practice Dictation" button in review mode
   ↓
3. User clicks "Practice Dictation"
   ↓
4. Navigate to /exercises/:id/dictation
   ↓
5. DictationPracticeComponent loads
   ↓
6. Retrieve translated text from exercise history
   ↓
7. Split text into sentences
   ↓
8. Initialize dictation session
   ↓
9. Display first sentence with audio controls
```

### Dictation Practice Session

```
1. User clicks play button
   ↓
2. TTS speaks current sentence
   ↓
3. User types what they hear
   ↓
4. User clicks "Check" or presses Enter
   ↓
5. Calculate accuracy and show feedback
   ↓
6. If accuracy >= 75%:
   - Mark sentence as complete
   - Auto-advance to next sentence
   ↓
7. If accuracy < 75%:
   - Show retry option
   - Allow user to try again or skip
   ↓
8. Repeat until all sentences complete
   ↓
9. Show final results and save attempt
```

### Accessing Previous Translations

```
1. User navigates to exercise history or favorites
   ↓
2. Exercise cards show "Dictation Practice" badge if translation exists
   ↓
3. User clicks "Practice Dictation" on exercise card
   ↓
4. Load most recent translation for that exercise
   ↓
5. Start dictation practice session
```

## UI/UX Design

### Dictation Practice Interface

**Layout** (similar to exercise-detail):
```
┌─────────────────────────────────────────────────────┐
│  Header: Exercise Title | Progress: 3/10 (30%)      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Audio Controls:                                     │
│  [◄◄] [▶/⏸] [►►] [🔊] Speed: [0.5x|1x|1.5x|2x]    │
│                                                      │
│  Sentence 3 of 10:                                   │
│  [Audio waveform visualization]                      │
│                                                      │
│  Your answer:                                        │
│  ┌────────────────────────────────────────────────┐ │
│  │ [Text input area]                              │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  [Check Answer] [Replay Audio] [Skip]               │
│                                                      │
│  ┌─ Feedback (if shown) ─────────────────────────┐ │
│  │ Accuracy: 85%                                  │ │
│  │                                                │ │
│  │ Original: The quick brown fox jumps           │ │
│  │ You typed: The quik brown fox jumps           │ │
│  │           ^^^^                                 │ │
│  │ Mistakes: 1 misspelled word                   │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  [Next Sentence →]                                   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Visual Design Consistency**:
- Use same color scheme as exercise-detail
- Reuse existing button styles and components
- Maintain consistent spacing and typography
- Use same feedback panel styling

### Exercise Detail Modifications

**Add to Review Mode**:
```html
<div class="review-actions">
  <button (click)="onPracticeAgain()">Practice Again</button>
  <button (click)="onPracticeDictation()">Practice Dictation</button>
  <button (click)="onQuit()">Back to Exercises</button>
</div>
```

**Styling**:
- "Practice Dictation" button with distinct color (e.g., purple accent)
- Icon: 🎧 or 🎤 to indicate audio practice
- Tooltip: "Practice listening and typing your translation"

## Routing

### New Route

```typescript
// Add to src/app/app.routes.ts

{
  path: 'exercises/:id/dictation',
  component: DictationPracticeComponent,
  title: 'Dictation Practice'
}
```

### Navigation

```typescript
// From exercise-detail component
onPracticeDictation(): void {
  const ex = this.exercise();
  if (!ex) return;
  
  this.router.navigate(['/exercises', ex.id, 'dictation']);
}
```

## Error Handling

### Scenarios and Solutions

1. **No Translation Available**
   - Check: Verify translation exists in exercise history
   - Error: Display message "Complete the translation exercise first"
   - Action: Redirect to exercise page

2. **TTS Not Supported**
   - Check: Verify `window.speechSynthesis` exists
   - Error: Display message "Text-to-speech not supported in your browser"
   - Action: Show text-only mode option

3. **Audio Playback Fails**
   - Check: Monitor TTS error events
   - Error: Display message "Audio playback failed. Please try again."
   - Action: Provide retry button and text display

4. **Save Attempt Fails**
   - Check: Monitor Firestore save errors
   - Error: Display message "Failed to save progress. Check your connection."
   - Action: Retry save, cache locally if offline

5. **Invalid Exercise ID**
   - Check: Verify exercise exists
   - Error: Display 404 message
   - Action: Redirect to exercises list

## Testing Strategy

### Unit Tests

1. **DictationPracticeService**
   - Test accuracy calculation with various inputs
   - Test sentence splitting logic
   - Test difference detection algorithm
   - Test mistake categorization
   - Mock Firestore operations

2. **DictationPracticeComponent**
   - Test sentence navigation
   - Test input validation
   - Test completion detection
   - Test progress calculation
   - Mock service dependencies

3. **DictationFeedbackComponent**
   - Test feedback rendering
   - Test difference highlighting
   - Test accuracy display
   - Test mistake categorization display

### Integration Tests

1. **Complete Dictation Flow**
   - Navigate from exercise to dictation
   - Complete all sentences
   - Verify attempt saved
   - Verify progress updated

2. **TTS Integration**
   - Test audio playback
   - Test speed adjustment
   - Test pause/resume
   - Test sentence-by-sentence playback

3. **Progress Tracking**
   - Verify dictation attempts saved
   - Verify streak updated
   - Verify achievements unlocked
   - Verify points awarded

### Manual Testing Checklist

- [ ] Audio plays correctly for all sentences
- [ ] Speed adjustment works (0.5x, 1x, 1.5x, 2x)
- [ ] Accuracy calculation is correct
- [ ] Feedback displays properly
- [ ] Navigation between sentences works
- [ ] Progress saves and loads correctly
- [ ] Completion triggers properly
- [ ] UI is responsive on mobile
- [ ] Dark mode styling is correct
- [ ] Keyboard shortcuts work
- [ ] Error messages display appropriately

## Performance Considerations

### Optimization Strategies

1. **Audio Caching**
   - Browser automatically caches TTS utterances
   - No additional caching needed for Web Speech API

2. **Text Processing**
   - Pre-split sentences on component init
   - Cache accuracy calculations
   - Debounce input comparison (300ms)

3. **Firestore Queries**
   - Load dictation history once on init
   - Use local state during session
   - Batch save at completion

4. **Component Rendering**
   - Use OnPush change detection
   - Use signals for reactive state
   - Minimize template complexity

### Performance Targets

- Initial load: < 500ms
- Audio playback start: < 200ms
- Accuracy calculation: < 100ms
- Save attempt: < 1s
- Navigation between sentences: < 100ms

## Accessibility

### WCAG AA Compliance

1. **Keyboard Navigation**
   - Tab through all interactive elements
   - Enter to submit answer
   - Space to play/pause audio
   - Arrow keys for sentence navigation

2. **Screen Reader Support**
   - ARIA labels for all buttons
   - ARIA live regions for feedback
   - Descriptive alt text for icons
   - Announce progress updates

3. **Visual Design**
   - Color contrast ratio >= 4.5:1
   - Focus indicators on all interactive elements
   - Text size adjustable
   - No color-only indicators

4. **Audio Controls**
   - Visual indicators for audio state
   - Text alternatives for audio content
   - Volume control accessible
   - Speed control accessible

## Security Considerations

1. **Data Access**
   - Verify user owns the translation before loading
   - Use Firestore security rules to restrict access
   - Validate exercise ID on server side

2. **Input Validation**
   - Sanitize user input before comparison
   - Limit input length to prevent abuse
   - Validate sentence indices

3. **Rate Limiting**
   - Limit dictation attempts per exercise per day
   - Prevent rapid-fire submissions
   - Monitor for abuse patterns

## Future Enhancements

### Phase 2 Features (Not in Current Scope)

1. **Multiple Translation Selection**
   - Allow users to choose which translation to practice
   - Show history of all translations for an exercise

2. **Difficulty Modes**
   - Easy: Show first letter of each word
   - Medium: Show word count
   - Hard: No hints

3. **Collaborative Features**
   - Share translations with friends
   - Practice dictation on friend's translations
   - Leaderboards for dictation accuracy

4. **Advanced Analytics**
   - Track common mistakes
   - Identify weak areas
   - Personalized recommendations

5. **Offline Support**
   - Cache translations for offline practice
   - Sync attempts when back online
   - Download audio for offline playback

6. **Custom Audio**
   - Upload custom audio files
   - Use different TTS voices
   - Adjust pronunciation

## Implementation Notes

### Development Phases

**Phase 1: Core Functionality**
- Create data models
- Implement DictationPracticeService
- Build DictationPracticeComponent
- Add routing

**Phase 2: UI/UX**
- Build DictationFeedbackComponent
- Add audio controls
- Implement progress tracking
- Style components

**Phase 3: Integration**
- Modify ExerciseDetailComponent
- Update ProgressService
- Add achievements
- Integrate with existing UI

**Phase 4: Testing & Polish**
- Write unit tests
- Perform integration testing
- Fix bugs
- Optimize performance

### Dependencies

**Existing**:
- Angular 20
- RxJS 7.8
- Firestore (via DatabaseService)
- Web Speech API (via TTSService)

**New**:
- Levenshtein distance library (e.g., `fast-levenshtein`)
- Diff algorithm library (e.g., `diff` or custom implementation)

### Estimated Effort

- Data models: 2 hours
- DictationPracticeService: 8 hours
- DictationPracticeComponent: 12 hours
- DictationFeedbackComponent: 6 hours
- Integration: 6 hours
- Testing: 8 hours
- **Total: ~42 hours**
