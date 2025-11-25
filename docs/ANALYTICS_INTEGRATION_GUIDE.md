# Google Analytics 4 Integration Guide

## Overview

This application integrates Google Analytics 4 (GA4) for comprehensive user behavior tracking while respecting user privacy and following best practices.

## Architecture

The analytics system follows a **provider pattern** with these key components:

- **AnalyticsService**: Main facade that application code uses
- **IAnalyticsProvider**: Interface that all analytics providers implement
- **Ga4AnalyticsAdapter**: GA4-specific implementation
- **EventQueueManager**: Handles offline event queuing
- **PrivacyService**: Manages opt-out and PII filtering

## Quick Start

### 1. Configuration

Add your GA4 measurement ID to the environment files:

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  analytics: {
    providers: [
      {
        type: 'ga4',
        enabled: true,
        config: {
          measurementId: 'G-XXXXXXXXXX'
        }
      }
    ],
    debug: true
  }
};
```

### 2. Basic Usage

The AnalyticsService is automatically initialized in `app.config.ts`. Simply inject it where needed:

```typescript
import { AnalyticsService } from './services/analytics.service';

export class MyComponent {
  private analytics = inject(AnalyticsService);

  ngOnInit() {
    // Track page view (automatic via router)
    
    // Track custom event
    this.analytics.trackExerciseStart('ex123', 'grammar', 'beginner', 'multiple-choice');
  }
}
```

## Available Tracking Methods

### Page Tracking
```typescript
trackPageView(path: string, title: string): void
```

### Exercise Events
```typescript
trackExerciseStart(exerciseId, category, level, type): void
trackExerciseComplete(exerciseId, completionData): void
trackExerciseSubmit(exerciseId, isCorrect): void
trackHintUsed(exerciseId, hintType): void
trackExerciseAbandoned(exerciseId, timeSpent, completionPercentage): void
```

### Achievement Events
```typescript
trackAchievementUnlocked(achievementId, achievementName): void
trackModuleCompleted(moduleId, completionTime, progressPercentage): void
trackStreakMilestone(streakCount, milestoneType): void
trackLevelUp(oldLevel, newLevel, totalPoints): void
trackDailyChallengeCompleted(challengeId): void
```

### AI Events
```typescript
trackAiRequest(provider, model, requestType): void
trackAiResponse(provider, responseTime, tokenCount): void
trackAiError(provider, errorType): void
trackAiProviderChanged(oldProvider, newProvider): void
trackApiKeyConfigured(provider): void
```

### Authentication Events
```typescript
trackLogin(method, isNewUser): void
trackLogout(sessionDuration): void
trackGuestToAuthConversion(): void
trackAuthError(errorType): void
trackRegistration(): void
```

### User Properties
```typescript
setUserProperty(propertyName, value): void
setUserProperties(properties): void
setUserId(userId): void
```

## Privacy Features

### Opt-Out

Users can opt out of analytics tracking:

```typescript
import { PrivacyService } from './services/privacy.service';

export class SettingsComponent {
  private privacy = inject(PrivacyService);

  toggleAnalytics() {
    if (this.privacy.isAnalyticsEnabled()) {
      this.privacy.disableAnalytics();
    } else {
      this.privacy.enableAnalytics();
    }
  }
}
```

### PII Filtering

The PrivacyService automatically filters personally identifiable information:

- Email addresses
- Phone numbers
- Credit card numbers
- Social Security numbers
- IP addresses

```typescript
const filtered = privacyService.filterPii('Contact me at test@example.com');
// Result: 'Contact me at [EMAIL_REDACTED]'
```

## Offline Support

Events are automatically queued when offline and sent when connection is restored. The EventQueueManager handles:

- Event queuing with size limits
- Retry logic with exponential backoff
- Automatic flush when online

## Debug Mode

Enable debug mode to see all tracking calls in the console:

```typescript
// In environment.ts
analytics: {
  debug: true
}
```

## Adding New Analytics Providers

To add a new analytics provider (e.g., Mixpanel, Amplitude):

1. Create a new adapter class implementing `IAnalyticsProvider`
2. Add the provider type to `AnalyticsProviderFactory`
3. Configure in environment files

Example:

```typescript
export class MixpanelAdapter implements IAnalyticsProvider {
  initialize(config: any): Promise<void> {
    // Initialize Mixpanel
  }

  trackEvent(eventName: string, params: Record<string, any>): void {
    // Track with Mixpanel
  }

  // Implement other interface methods...
}
```

## Best Practices

1. **Never track PII**: Use PrivacyService to filter sensitive data
2. **Respect opt-out**: Always check privacy preferences
3. **Use semantic event names**: Follow GA4 naming conventions
4. **Include context**: Add relevant parameters to events
5. **Test in debug mode**: Verify events before production

## Testing

Property tests are available in `src/app/services/analytics-*.spec.ts`:

```bash
npm test -- --include="**/analytics*.spec.ts"
```

## Troubleshooting

### Events not appearing in GA4

1. Check that `measurementId` is correct
2. Verify analytics is enabled (not opted out)
3. Enable debug mode to see console logs
4. Check browser console for errors

### Privacy concerns

- All PII is automatically filtered
- Users can opt out at any time
- No tracking occurs when opted out
- API keys and credentials are never sent

## Resources

- [GA4 Documentation](https://developers.google.com/analytics/devguides/collection/ga4)
- [Event Reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
- [Privacy Best Practices](https://support.google.com/analytics/answer/9019185)
