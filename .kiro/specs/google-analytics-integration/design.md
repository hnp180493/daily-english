# Design Document: Google Analytics 4 Integration

## Overview

This design document outlines the architecture and implementation strategy for integrating Google Analytics 4 (GA4) into the Daily English learning platform. The integration will provide comprehensive tracking of user behavior, learning progress, and feature usage while maintaining privacy compliance and graceful error handling.

The solution follows a **decoupled architecture** using the **Adapter Pattern** to ensure the analytics implementation can be easily replaced or removed without affecting the core application. The design includes:

1. **Abstract Analytics Interface**: Defines tracking contracts independent of GA4
2. **GA4 Adapter Implementation**: Implements the interface using gtag.js
3. **Analytics Facade Service**: Provides a single entry point for all tracking
4. **Dependency Injection**: Allows swapping implementations via configuration

This architecture ensures that:
- The application code never directly depends on GA4 or gtag.js
- Switching to another analytics provider (e.g., Mixpanel, Amplitude) requires only creating a new adapter
- Removing analytics entirely requires only disabling the service in configuration
- Multiple analytics providers can run simultaneously if needed

## Architecture

### High-Level Architecture (Decoupled Design)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Angular Application                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Components  │  │   Services   │  │    Guards    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                     │
│                   ┌────────▼────────────┐                        │
│                   │  AnalyticsService   │  ← Abstract Interface │
│                   │     (Facade)        │                        │
│                   └────────┬────────────┘                        │
│                            │                                     │
│              ┌─────────────┴─────────────┐                      │
│              │                           │                      │
│     ┌────────▼────────┐        ┌────────▼────────┐            │
│     │ IAnalytics      │        │ IAnalytics      │            │
│     │ Provider        │        │ Provider        │            │
│     │ (Interface)     │        │ (Interface)     │            │
│     └────────┬────────┘        └────────┬────────┘            │
│              │                           │                      │
│     ┌────────▼────────┐        ┌────────▼────────┐            │
│     │ Ga4Analytics    │        │ Future Provider │            │
│     │ Adapter         │        │ (Mixpanel, etc) │            │
│     └────────┬────────┘        └─────────────────┘            │
│              │                                                   │
│     ┌────────▼────────┐                                         │
│     │  Event Queue    │                                         │
│     │  & Validator    │                                         │
│     └────────┬────────┘                                         │
│              │                                                   │
└──────────────┼─────────────────────────────────────────────────┘
               │
      ┌────────▼────────┐
      │   gtag.js       │
      │   (GA4 SDK)     │
      └────────┬────────┘
               │
      ┌────────▼────────┐
      │  Google         │
      │  Analytics 4    │
      └─────────────────┘
```

**Key Architectural Principles:**

1. **Dependency Inversion**: Application depends on abstract interface, not concrete GA4 implementation
2. **Single Responsibility**: Each adapter handles only one analytics provider
3. **Open/Closed**: Easy to add new providers without modifying existing code
4. **Liskov Substitution**: Any analytics adapter can replace another
5. **Interface Segregation**: Clean, focused interface for analytics operations

### Component Interaction Flow

1. **Application Initialization**: Load gtag.js script and initialize GA4 with Measurement ID
2. **Router Events**: Track page views automatically on route changes
3. **User Actions**: Components/services call Ga4AnalyticsService methods to track events
4. **Event Processing**: Service validates, enriches, and queues events
5. **Event Transmission**: Events are sent to GA4 via gtag.js
6. **Error Handling**: Failed events are logged, queued for retry, or dropped gracefully

## Components and Interfaces

### 1. IAnalyticsProvider Interface

The abstract interface that defines the contract for all analytics providers. This ensures complete decoupling from any specific implementation.

```typescript
interface IAnalyticsProvider {
  // Lifecycle
  initialize(config: any): Promise<void>;
  isInitialized(): boolean;
  
  // Page tracking
  trackPageView(path: string, title: string, additionalData?: Record<string, any>): void;
  
  // Event tracking
  trackEvent(eventName: string, eventParams?: Record<string, any>): void;
  
  // User properties
  setUserProperty(propertyName: string, value: string | number): void;
  setUserProperties(properties: Record<string, string | number>): void;
  
  // User identification
  setUserId(userId: string | null): void;
  
  // Configuration
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  setDebugMode(enabled: boolean): void;
}
```

### 2. AnalyticsService (Facade)

The main service that application code interacts with. It delegates to one or more analytics providers.

**Responsibilities:**
- Provide a clean, domain-specific API for the application
- Delegate to registered analytics providers
- Handle provider registration and management
- Provide convenience methods for common tracking scenarios

**Key Methods:**
```typescript
@Injectable({ providedIn: 'root' })
class AnalyticsService {
  private providers: IAnalyticsProvider[] = [];
  
  // Provider management
  registerProvider(provider: IAnalyticsProvider): void;
  removeProvider(provider: IAnalyticsProvider): void;
  
  // Convenience methods that delegate to all providers
  // Page tracking
  trackPageView(path: string, title: string): void
  
  // Exercise events
  trackExerciseStart(exerciseId: string, category: string, level: string, type: string): void
  trackExerciseComplete(exerciseId: string, data: ExerciseCompletionData): void
  trackExerciseSubmit(exerciseId: string, isCorrect: boolean): void
  trackHintUsed(exerciseId: string, hintType: string): void
  trackExerciseAbandoned(exerciseId: string, timeSpent: number, completionPercentage: number): void
  
  // Achievement events
  trackAchievementUnlocked(achievementId: string, achievementName: string): void
  trackModuleCompleted(moduleId: string, completionTime: number, progressPercentage: number): void
  trackStreakMilestone(streakCount: number, milestoneType: string): void
  trackLevelUp(oldLevel: number, newLevel: number, totalPoints: number): void
  trackDailyChallengeCompleted(challengeId: string): void
  
  // AI events
  trackAiRequest(provider: string, model: string, requestType: string): void
  trackAiResponse(provider: string, responseTime: number, tokenCount: number): void
  trackAiError(provider: string, errorType: string): void
  trackAiProviderChanged(oldProvider: string, newProvider: string): void
  trackApiKeyConfigured(provider: string): void
  
  // Authentication events
  trackLogin(method: string, isNewUser: boolean): void
  trackLogout(sessionDuration: number): void
  trackGuestToAuthConversion(): void
  trackAuthError(errorType: string): void
  trackRegistration(): void
  
  // User properties
  setUserProperty(propertyName: string, value: string | number): void
  setUserProperties(properties: Record<string, string | number>): void
  
  // Session tracking
  trackSessionStart(): void
  trackSessionEnd(duration: number, activitiesPerformed: number): void
  trackUserActivity(): void
  
  // Feature-specific events
  trackDictationStart(exerciseId: string): void
  trackDictationComplete(exerciseId: string, accuracy: number): void
  trackReviewSessionStart(): void
  trackReviewSessionEnd(itemsReviewed: number, duration: number): void
  trackCustomExerciseCreated(exerciseMetadata: any): void
  trackDataExport(operationType: string): void
  trackDataImport(operationType: string): void
  trackSettingsChanged(category: string, setting: string): void
  
  // Engagement tracking
  trackScrollDepth(depth: number): void
  trackExternalLinkClick(url: string, linkText: string): void
  trackFileDownload(fileName: string, fileType: string): void
  trackSearch(searchTerm: string, resultCount: number): void
  
  // Conversion tracking
  trackConversion(goalName: string, value?: number): void
  trackFunnelStep(funnelName: string, stepNumber: number, stepName: string): void
  trackFunnelAbandonment(funnelName: string, lastStep: string): void
  
  // Privacy & configuration
  setAnalyticsEnabled(enabled: boolean): void
  isAnalyticsEnabled(): boolean
  setDebugMode(enabled: boolean): void
}
```

### 3. Ga4AnalyticsAdapter

The concrete implementation of IAnalyticsProvider for Google Analytics 4.

**Responsibilities:**
- Implement IAnalyticsProvider interface
- Load and initialize gtag.js library
- Translate generic analytics calls to GA4-specific gtag() calls
- Handle GA4-specific error scenarios
- Manage event queue for offline scenarios

**Implementation:**
```typescript
@Injectable()
class Ga4AnalyticsAdapter implements IAnalyticsProvider {
  private config: Ga4Config;
  private initialized = false;
  private enabled = true;
  private debugMode = false;
  private eventQueue: EventQueueManager;
  
  constructor(private eventQueue: EventQueueManager) {}
  
  async initialize(config: Ga4Config): Promise<void> {
    // Load gtag.js and initialize
  }
  
  trackPageView(path: string, title: string, additionalData?: Record<string, any>): void {
    // Call gtag('event', 'page_view', ...)
  }
  
  trackEvent(eventName: string, eventParams?: Record<string, any>): void {
    // Call gtag('event', eventName, eventParams)
  }
  
  // ... implement other interface methods
}
```

**Key Design Points:**
- Only this adapter knows about gtag.js
- Can be completely removed without affecting application code
- Easy to create alternative adapters (Mixpanel, Amplitude, etc.)
- Can run multiple adapters simultaneously

### 4. Provider Configuration

Configuration system that allows easy switching between providers:

```typescript
// environment.ts
export const environment = {
  analytics: {
    providers: [
      {
        type: 'ga4',
        enabled: true,
        config: {
          measurementId: 'G-XXXXXXXXXX',
          debugMode: true,
          anonymizeIp: true
        }
      }
      // Easy to add more providers:
      // {
      //   type: 'mixpanel',
      //   enabled: false,
      //   config: { token: 'xxx' }
      // }
    ]
  }
};
```

### 5. Event Models

Type-safe interfaces for event data:

```typescript
interface ExerciseCompletionData {
  completionTime: number;
  score: number;
  accuracy: number;
  hintsUsed: number;
}

interface PageViewData {
  path: string;
  title: string;
  referrer?: string;
}

interface UserProperties {
  learningLevel?: string;
  languagePreference?: string;
  accountType?: 'guest' | 'authenticated';
  userCohort?: string;
}

interface SessionData {
  sessionId: string;
  startTime: number;
  lastActivityTime: number;
  activitiesPerformed: number;
}

interface Ga4Event {
  eventName: string;
  eventParams: Record<string, any>;
  timestamp: number;
}
```

### 6. Configuration Interfaces

```typescript
// Generic provider configuration
interface AnalyticsProviderConfig {
  type: string; // 'ga4', 'mixpanel', 'amplitude', etc.
  enabled: boolean;
  config: any; // Provider-specific config
}

// GA4-specific configuration
interface Ga4Config {
  measurementId: string;
  debugMode: boolean;
  anonymizeIp?: boolean;
  cookieFlags?: string;
}

// Main analytics configuration
interface AnalyticsConfig {
  providers: AnalyticsProviderConfig[];
}
```

### 7. Event Queue Manager

Handles offline scenarios and rate limiting:

```typescript
class EventQueueManager {
  private queue: Ga4Event[] = [];
  private maxQueueSize = 100;
  private retryAttempts = 3;
  
  enqueue(event: Ga4Event): void
  dequeue(): Ga4Event | undefined
  flush(): Promise<void>
  clear(): void
  size(): number
}
```

## Data Models

### Event Parameter Standards

Following GA4's recommended event schema:

**Standard Parameters:**
- `page_location`: Full URL
- `page_title`: Page title
- `page_referrer`: Referrer URL
- `engagement_time_msec`: Time spent on page
- `session_id`: Unique session identifier
- `user_id`: User identifier (if authenticated)

**Custom Parameters:**
- `exercise_id`: Unique exercise identifier
- `exercise_category`: Category name
- `exercise_level`: Difficulty level
- `exercise_type`: Type of exercise
- `completion_time`: Time to complete (seconds)
- `accuracy_score`: Percentage accuracy
- `hints_used`: Number of hints used
- `achievement_id`: Achievement identifier
- `ai_provider`: AI provider name
- `ai_model`: Model name
- `response_time`: API response time (ms)
- `token_count`: Number of tokens used

### User Property Schema

```typescript
interface UserPropertySchema {
  learning_level: 'beginner' | 'intermediate' | 'advanced';
  language_preference: 'en' | 'vi';
  account_type: 'guest' | 'authenticated';
  user_cohort: string; // Format: YYYY-MM (first visit month)
  total_exercises_completed: number;
  current_streak: number;
  days_since_registration: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After reviewing all testable properties from the prework analysis, several redundancies were identified:

**Redundant Properties:**
- Properties 2.1-2.5 (exercise events) all test data completeness and can be consolidated into comprehensive exercise tracking properties
- Properties 3.1-3.5 (achievement events) similarly test data completeness and can be consolidated
- Properties 4.1-4.3 (AI events) test data completeness for AI tracking
- Properties 5.1-5.5 (auth events) test data completeness for authentication
- Properties 10.1-10.5 (feature-specific) test data completeness for various features
- Properties 11.1, 11.2, 11.5 all relate to session tracking and timestamp management
- Properties 13.1-13.5 all test engagement event data completeness

**Consolidation Strategy:**
- Combine similar data completeness checks into single comprehensive properties
- Focus on unique validation aspects (privacy, error handling, offline behavior)
- Eliminate properties that test GA4's built-in functionality (automatic collection)

### Correctness Properties

Property 1: Page view events include required data
*For any* route navigation, the page view event sent to GA4 should include page path, page title, timestamp, and session information
**Validates: Requirements 1.1, 1.2**

Property 2: Guest users are tracked anonymously
*For any* user in guest mode, all tracking events should mark the session as anonymous and set appropriate user properties
**Validates: Requirements 1.5, 6.5**

Property 3: Exercise events contain complete metadata
*For any* exercise interaction (start, complete, submit, hint, abandon), the tracking event should include all relevant exercise metadata (ID, category, level, type) and interaction-specific data
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 4: Achievement events contain complete data
*For any* achievement-related event (unlock, module complete, streak, level-up, daily challenge), the tracking event should include all relevant identifiers and metrics
**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

Property 5: AI events contain complete data without exposing secrets
*For any* AI-related event (request, response, error, provider change, API key config), the tracking event should include all relevant metadata but never include actual API keys or sensitive data
**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

Property 6: Authentication events contain complete data without exposing credentials
*For any* authentication event (login, logout, conversion, error, registration), the tracking event should include relevant metadata but never include passwords or other credentials
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

Property 7: User properties are set correctly
*For any* user property change (learning level, language, account type), the service should call the GA4 user property API with the correct property name and value
**Validates: Requirements 6.1, 6.2, 6.3, 6.5**

Property 8: Analytics service handles errors gracefully
*For any* analytics operation that fails (event send failure, invalid parameters, rate limits), the service should log the error without throwing exceptions and should not break application functionality
**Validates: Requirements 8.1, 8.4, 8.5**

Property 9: Events are queued when offline
*For any* tracking event sent while network connectivity is lost, the event should be added to a queue for later transmission
**Validates: Requirements 8.3**

Property 10: Opt-out stops all tracking
*For any* user who opts out of analytics, the service should not send any tracking events and should not load the gtag.js library
**Validates: Requirements 9.1, 9.2**

Property 11: No PII in tracking events
*For any* tracking event sent to GA4, the event parameters should not contain personally identifiable information such as email addresses, phone numbers, or full names
**Validates: Requirements 9.3**

Property 12: Feature-specific events contain complete data
*For any* feature-specific interaction (dictation, review session, custom exercise, data export/import, settings change), the tracking event should include all relevant metadata for that feature
**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

Property 13: Session tracking maintains accurate timestamps
*For any* user interaction during a session, the service should update the last activity timestamp and correctly calculate session duration excluding idle periods longer than 5 minutes
**Validates: Requirements 11.1, 11.2, 11.4, 11.5**

Property 14: Daily active users are identified correctly
*For any* user who returns after 24 hours or more, the service should mark them as a daily active user
**Validates: Requirements 11.3**

Property 15: Engagement events contain complete data
*For any* engagement interaction (scroll depth, external link click, file download, media interaction, search), the tracking event should include all relevant metadata
**Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5**

Property 16: Funnel events track progress correctly
*For any* multi-step funnel, the service should track step completions with step number and name, and track abandonments with the last completed step
**Validates: Requirements 14.2, 14.3**

Property 17: Conversion events contain complete data
*For any* conversion goal completion, the tracking event should include goal name and optional value
**Validates: Requirements 14.4**

Property 18: Return visit calculations are accurate
*For any* returning user, the service should correctly calculate days since last visit and days since first visit
**Validates: Requirements 15.2**

Property 19: User lifecycle classification is correct
*For any* user, the service should correctly classify them as new, returning, or churned based on their visit history
**Validates: Requirements 15.3**

Property 20: Retention milestones are tracked
*For any* user reaching 1-day, 7-day, or 30-day retention milestones, the service should send appropriate retention events
**Validates: Requirements 15.4**

## Error Handling

### Error Handling Strategy

The GA4 integration will implement a multi-layered error handling approach:

1. **Script Loading Errors**
   - Catch gtag.js load failures
   - Fall back to no-op mode
   - Log warning to console
   - Continue application execution

2. **Event Sending Errors**
   - Wrap all gtag() calls in try-catch
   - Log errors without throwing
   - Queue failed events for retry
   - Implement exponential backoff

3. **Invalid Parameter Errors**
   - Validate event parameters before sending
   - Sanitize or reject invalid data
   - Log validation failures
   - Provide helpful error messages

4. **Network Errors**
   - Detect offline state
   - Queue events locally
   - Flush queue when online
   - Limit queue size to prevent memory issues

5. **Rate Limiting**
   - Track request rate
   - Implement exponential backoff
   - Drop events if queue is full
   - Log rate limit warnings

### Error Recovery Mechanisms

```typescript
class ErrorRecoveryManager {
  private retryQueue: Ga4Event[] = [];
  private retryAttempts = new Map<string, number>();
  private maxRetries = 3;
  private backoffMultiplier = 2;
  
  async retryFailedEvent(event: Ga4Event): Promise<void> {
    const eventId = this.generateEventId(event);
    const attempts = this.retryAttempts.get(eventId) || 0;
    
    if (attempts >= this.maxRetries) {
      console.warn('Max retries exceeded for event:', event);
      this.retryAttempts.delete(eventId);
      return;
    }
    
    const delay = Math.pow(this.backoffMultiplier, attempts) * 1000;
    await this.sleep(delay);
    
    try {
      await this.sendEvent(event);
      this.retryAttempts.delete(eventId);
    } catch (error) {
      this.retryAttempts.set(eventId, attempts + 1);
      this.retryQueue.push(event);
    }
  }
}
```

### Graceful Degradation

When GA4 is unavailable or disabled:
- All tracking methods become no-ops
- No errors are thrown
- Application continues normally
- Debug logs indicate tracking is disabled

## Testing Strategy

### Unit Testing

Unit tests will verify:
- Service initialization with different configurations
- Event method calls with various parameters
- User property setting
- Error handling for specific failure scenarios
- Privacy compliance (no PII in events)
- Opt-out functionality
- Debug mode logging

**Testing Framework:** Jasmine (Angular default)

**Example Unit Tests:**
```typescript
describe('Ga4AnalyticsService', () => {
  it('should initialize with measurement ID', () => {
    // Test initialization
  });
  
  it('should track page view with required parameters', () => {
    // Test page view tracking
  });
  
  it('should not include PII in events', () => {
    // Test PII filtering
  });
  
  it('should handle gtag.js load failure gracefully', () => {
    // Test error handling
  });
  
  it('should respect opt-out preference', () => {
    // Test opt-out
  });
});
```

### Property-Based Testing

Property-based tests will verify universal properties across many randomly generated inputs.

**Testing Framework:** fast-check (JavaScript property-based testing library)

**Configuration:** Each property test will run a minimum of 100 iterations to ensure comprehensive coverage.

**Property Test Examples:**

1. **Property 3: Exercise events contain complete metadata**
   - Generate random exercise data (ID, category, level, type)
   - Generate random interaction types (start, complete, submit, hint, abandon)
   - Call appropriate tracking method
   - Verify event contains all required fields

2. **Property 5: AI events never expose secrets**
   - Generate random AI provider configurations with API keys
   - Call AI tracking methods
   - Verify events never contain actual API key values

3. **Property 11: No PII in tracking events**
   - Generate random user data including PII (email, phone, name)
   - Call various tracking methods
   - Verify events never contain PII fields

4. **Property 13: Session tracking maintains accurate timestamps**
   - Generate random user interactions with timestamps
   - Simulate idle periods
   - Verify session duration excludes idle time > 5 minutes

### Integration Testing

Integration tests will verify:
- GA4 script loading in browser environment
- Event transmission to GA4
- Router integration for automatic page view tracking
- Service integration with existing Angular services

### Manual Testing Checklist

- [ ] Verify events appear in GA4 DebugView
- [ ] Test with different browsers
- [ ] Test with ad blockers enabled
- [ ] Test offline/online transitions
- [ ] Verify UTM parameter capture
- [ ] Test opt-out functionality
- [ ] Verify no console errors

## Implementation Notes

### Integration Points (Decoupled)

**Important**: All integration points use the abstract `AnalyticsService` facade, never the concrete GA4 adapter.

1. **App Initialization (app.config.ts)**
   - Register analytics providers based on environment config
   - Initialize registered providers
   - No direct reference to GA4

```typescript
export function initializeAnalytics() {
  return () => {
    const analyticsService = inject(AnalyticsService);
    const config = environment.analytics;
    
    // Register providers based on configuration
    config.providers.forEach(providerConfig => {
      if (providerConfig.enabled) {
        const provider = createProvider(providerConfig.type, providerConfig.config);
        analyticsService.registerProvider(provider);
      }
    });
  };
}
```

2. **Router Integration (app.ts or router service)**
   - Inject `AnalyticsService` (not GA4-specific service)
   - Subscribe to router events
   - Track page views on navigation end

```typescript
constructor(private analytics: AnalyticsService, private router: Router) {
  this.router.events.pipe(
    filter(event => event instanceof NavigationEnd)
  ).subscribe((event: NavigationEnd) => {
    this.analytics.trackPageView(event.urlAfterRedirects, document.title);
  });
}
```

3. **Exercise Components**
   - Inject `AnalyticsService` (abstract)
   - Use domain-specific tracking methods

```typescript
constructor(private analytics: AnalyticsService) {}

ngOnInit() {
  this.analytics.trackExerciseStart(this.exerciseId, this.category, this.level, this.type);
}
```

4. **Achievement Service**
   - Inject `AnalyticsService` (abstract)
   - Track achievements through facade

5. **AI Services**
   - Inject `AnalyticsService` (abstract)
   - Track AI events through facade

6. **Auth Service**
   - Inject `AnalyticsService` (abstract)
   - Track auth events through facade

**Benefits of this approach:**
- Components never know about GA4
- Switching providers requires only configuration change
- Can disable all analytics by not registering any providers
- Can run multiple analytics providers simultaneously
- Easy to mock for testing

### Performance Considerations

1. **Lazy Loading**
   - Load gtag.js asynchronously
   - Don't block application startup

2. **Event Batching**
   - GA4 automatically batches events
   - No additional batching needed

3. **Memory Management**
   - Limit event queue size (100 events max)
   - Clear old events from queue
   - Unsubscribe from observables

4. **Bundle Size**
   - gtag.js is loaded from CDN (not bundled)
   - Service code is minimal (~5KB)

### Privacy Considerations

1. **PII Filtering**
   - Implement PII detection regex
   - Filter email, phone, credit card patterns
   - Sanitize user-generated content

2. **Consent Management**
   - Check opt-out preference before tracking
   - Provide clear opt-out mechanism
   - Persist preference in localStorage

3. **Data Minimization**
   - Only track necessary data
   - Avoid tracking sensitive information
   - Use anonymized user IDs

4. **Regional Compliance**
   - Support GDPR requirements
   - Support CCPA requirements
   - Configurable data retention

### Environment Configuration (Provider-Agnostic)

Add to `environment.ts`:

```typescript
export const environment = {
  production: false,
  analytics: {
    providers: [
      {
        type: 'ga4',
        enabled: true,
        config: {
          measurementId: 'G-XXXXXXXXXX', // Development measurement ID
          debugMode: true,
          anonymizeIp: true
        }
      }
      // Easy to add more providers in the future:
      // {
      //   type: 'mixpanel',
      //   enabled: false,
      //   config: {
      //     token: 'your-mixpanel-token',
      //     debugMode: true
      //   }
      // }
    ]
  },
  // ... existing config
};
```

Add to `environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  analytics: {
    providers: [
      {
        type: 'ga4',
        enabled: true,
        config: {
          measurementId: 'G-YYYYYYYYYY', // Production measurement ID
          debugMode: false,
          anonymizeIp: true
        }
      }
    ]
  },
  // ... existing config
};
```

**To disable all analytics:**
```typescript
analytics: {
  providers: [] // Empty array = no analytics
}
```

**To switch to a different provider:**
```typescript
analytics: {
  providers: [
    {
      type: 'mixpanel', // Just change the type and config
      enabled: true,
      config: { token: 'xxx' }
    }
  ]
}
```

### gtag.js Script Loading

The service will dynamically inject the gtag.js script:

```typescript
private loadGtagScript(measurementId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window['gtag']) {
      resolve();
      return;
    }
    
    // Create script element
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    
    script.onload = () => {
      // Initialize gtag
      window['dataLayer'] = window['dataLayer'] || [];
      window['gtag'] = function() {
        window['dataLayer'].push(arguments);
      };
      window['gtag']('js', new Date());
      window['gtag']('config', measurementId, {
        anonymize_ip: this.config.anonymizeIp,
        send_page_view: false // We'll handle page views manually
      });
      resolve();
    };
    
    script.onerror = () => {
      console.warn('Failed to load Google Analytics');
      reject(new Error('Failed to load gtag.js'));
    };
    
    document.head.appendChild(script);
  });
}
```

## Dependencies

### New Dependencies

- **fast-check**: Property-based testing library
  ```bash
  npm install --save-dev fast-check @types/fast-check
  ```

### Existing Dependencies

- Angular Core (already installed)
- Angular Router (already installed)
- RxJS (already installed)
- TypeScript (already installed)

### External Dependencies

- **gtag.js**: Loaded from Google CDN at runtime
  - No npm package needed
  - Loaded asynchronously
  - ~45KB gzipped

## Migration Strategy

Since this is a new feature, no migration is needed. However, the implementation will:

1. **Not interfere with existing analytics**
   - The existing `AnalyticsService` (internal) will be renamed to `InternalAnalyticsService`
   - New `AnalyticsService` (facade) will be the main entry point
   - Both can coexist during transition

2. **Gradual rollout**
   - Start with page view tracking
   - Add exercise tracking
   - Add achievement tracking
   - Add remaining features

3. **Feature flags**
   - Can be disabled via environment config (empty providers array)
   - Can be disabled by user opt-out
   - Debug mode for testing

4. **Easy removal**
   - To remove GA4: Remove from providers array in environment config
   - To remove all analytics: Empty the providers array
   - No code changes needed in components/services

## Decoupling Benefits Summary

**Why this architecture matters:**

1. **Vendor Independence**
   - Not locked into GA4
   - Can switch to Mixpanel, Amplitude, Plausible, etc. with minimal effort
   - Can run multiple providers simultaneously

2. **Easy Removal**
   - Remove GA4: Just remove from config
   - Remove all analytics: Empty providers array
   - No code changes in application

3. **Testability**
   - Easy to mock IAnalyticsProvider for tests
   - Can create NoOpAnalyticsProvider for testing
   - No need to mock gtag.js

4. **Maintainability**
   - Clear separation of concerns
   - Provider-specific code isolated in adapters
   - Application code stays clean

5. **Flexibility**
   - Can add custom analytics providers
   - Can create composite providers (e.g., log to console + send to GA4)
   - Can implement sampling, filtering, or transformation logic in facade

## Security Considerations

1. **API Key Protection**
   - Measurement ID is public (safe to expose)
   - No secret keys in client code
   - API keys for AI providers never sent to GA4

2. **XSS Prevention**
   - Sanitize all user-generated content
   - Use Angular's built-in sanitization
   - Validate event parameters

3. **Data Privacy**
   - No PII in events
   - Anonymize IP addresses
   - Respect user opt-out
   - Comply with privacy regulations

4. **Content Security Policy**
   - Allow gtag.js from googletagmanager.com
   - Allow connections to google-analytics.com
   - Update CSP headers if needed

## Monitoring and Debugging

### Debug Mode

When debug mode is enabled:
- Log all events to console
- Log initialization status
- Log error details
- Show event parameters

### GA4 DebugView

Use GA4's built-in DebugView for real-time event monitoring:
1. Enable debug mode in environment config
2. Open GA4 property
3. Navigate to DebugView
4. See events in real-time

### Console Logging

Example debug output:
```
[GA4] Initialized with measurement ID: G-XXXXXXXXXX
[GA4] Page view: /exercises/beginner/daily-life
[GA4] Event: exercise_start { exercise_id: 'ex-001', category: 'daily-life', level: 'beginner' }
[GA4] Event: exercise_complete { exercise_id: 'ex-001', score: 85, accuracy: 90, hints_used: 1 }
```

### Error Monitoring

Errors will be logged with context:
```
[GA4 Error] Failed to send event: exercise_start
[GA4 Error] Details: Network error
[GA4 Error] Event queued for retry
```

## Future Enhancements

1. **Enhanced E-commerce Tracking**
   - If subscription features are added
   - Track purchases and subscriptions

2. **Custom Dimensions**
   - Add more custom dimensions as needed
   - Track additional user attributes

3. **BigQuery Integration**
   - Export raw data to BigQuery
   - Enable advanced analytics

4. **A/B Testing Integration**
   - Integrate with Google Optimize
   - Track experiment variants

5. **Predictive Metrics**
   - Use GA4's predictive metrics
   - Identify likely churners
   - Predict purchase probability

6. **Cross-Platform Tracking**
   - If mobile apps are developed
   - Unified user tracking across platforms
