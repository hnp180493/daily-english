# Design Document: Firebase to Supabase Migration

## Overview

Migration này chuyển đổi backend của English Practice application từ Firebase sang Supabase, bao gồm authentication và database. Thiết kế tận dụng database abstraction layer có sẵn (IDatabase interface) để minimize code changes và maintain backward compatibility.

**Key Design Principles:**
- Leverage existing abstraction layer (IDatabase interface)
- Maintain same public APIs to avoid breaking changes
- Implement feature parity with Firebase
- Enable easy rollback if needed
- Follow Angular best practices with standalone components and signals

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Angular Application                      │
├─────────────────────────────────────────────────────────────┤
│  Components (Header, Exercise, Profile, etc.)               │
├─────────────────────────────────────────────────────────────┤
│  Services Layer                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ AuthService  │  │DatabaseService│  │Other Services│     │
│  │ (Modified)   │  │  (Unchanged)  │  │ (Unchanged)  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘     │
│         │                  │                                 │
│         │                  │                                 │
│  ┌──────▼──────────────────▼──────────┐                    │
│  │   Supabase Client (New)            │                    │
│  │   - Auth Module                     │                    │
│  │   - Database Module                 │                    │
│  │   - Realtime Module                 │                    │
│  └────────────────┬────────────────────┘                    │
└───────────────────┼─────────────────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │   Supabase Backend   │
         │  - PostgreSQL DB     │
         │  - Auth Service      │
         │  - Realtime Service  │
         └──────────────────────┘
```

### Database Schema Design

```sql
-- Users table (replaces Firebase Auth user data)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ DEFAULT NOW()
);

-- User progress (replaces users/{userId}/data/progress)
CREATE TABLE user_progress (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User favorites (replaces users/{userId}/data/favorites)
CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

-- Custom exercises (replaces users/{userId}/customExercises/{exerciseId})
CREATE TABLE custom_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements (replaces users/{userId}/data/achievements)
CREATE TABLE user_achievements (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User rewards (replaces users/{userId}/data/rewards)
CREATE TABLE user_rewards (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  themes TEXT[] DEFAULT '{}',
  hints INTEGER DEFAULT 0,
  avatar_frames TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_custom_exercises_user_id ON custom_exercises(user_id);
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User progress policies
CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- User favorites policies
CREATE POLICY "Users can view own favorites"
  ON user_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON user_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON user_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Custom exercises policies
CREATE POLICY "Users can view own exercises"
  ON custom_exercises FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercises"
  ON custom_exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercises"
  ON custom_exercises FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercises"
  ON custom_exercises FOR DELETE
  USING (auth.uid() = user_id);

-- User achievements policies
CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievements"
  ON user_achievements FOR UPDATE
  USING (auth.uid() = user_id);

-- User rewards policies
CREATE POLICY "Users can view own rewards"
  ON user_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rewards"
  ON user_rewards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rewards"
  ON user_rewards FOR UPDATE
  USING (auth.uid() = user_id);
```

## Components and Interfaces

### 1. Supabase Client Configuration

**File:** `src/app/services/supabase.client.ts`

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export const supabaseClient: SupabaseClient = createClient(
  environment.supabase.url,
  environment.supabase.anonKey
);
```

### 2. SupabaseDatabase Service

**File:** `src/app/services/database/supabase-database.service.ts`

Implements IDatabase interface với Supabase operations:

```typescript
@Injectable({
  providedIn: 'root'
})
export class SupabaseDatabase implements IDatabase {
  private supabase = supabaseClient;

  // Implement all IDatabase methods using Supabase client
  // - Use supabase.from() for CRUD operations
  // - Use supabase.channel() for realtime subscriptions
  // - Handle data transformations between Supabase and app models
}
```

**Key Implementation Details:**

- **CRUD Operations:** Use `supabase.from(table).select/insert/update/delete`
- **Realtime Subscriptions:** Use `supabase.channel().on('postgres_changes', ...)`
- **Data Transformation:** Convert between PostgreSQL types and TypeScript models
- **Error Handling:** Wrap operations in try-catch and return appropriate Observables

### 3. Updated AuthService

**File:** `src/app/services/auth.service.ts`

Modified to use Supabase Auth instead of Firebase Auth:

```typescript
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase = supabaseClient;
  
  currentUser = signal<User | null>(null);
  isAuthenticated = signal(false);

  constructor() {
    // Initialize auth state
    this.initializeAuth();
  }

  private async initializeAuth() {
    // Get initial session
    const { data: { session } } = await this.supabase.auth.getSession();
    this.updateUserState(session?.user);

    // Subscribe to auth changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.updateUserState(session?.user);
    });
  }

  signInWithGoogle(): Observable<void> {
    // Use supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  signOut(): Observable<void> {
    // Use supabase.auth.signOut()
  }

  // Maintain same public API
}
```

**Key Changes:**

- Replace Firebase Auth imports with Supabase client
- Use `signInWithOAuth` for Google login
- Use `onAuthStateChange` for session monitoring
- Maintain same signal-based API for components
- Map Supabase User type to match existing interface

### 4. Updated DatabaseService

**File:** `src/app/services/database/database.service.ts`

Minimal changes - just swap the injected database:

```typescript
@Injectable({
  providedIn: 'root'
})
export class DatabaseService implements IDatabase {
  private authService = inject(AuthService);
  private database = inject(SupabaseDatabase); // Changed from FirebaseDatabase

  // All other code remains unchanged
}
```

### 5. Updated App Configuration

**File:** `src/app/app.config.ts`

Remove Firebase providers, add Supabase providers:

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    // Remove Firebase providers
    // Add Supabase providers if needed (client is singleton)
  ]
};
```

## Data Models

### User Type Mapping

```typescript
// Supabase User → App User
interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
}

// Map to existing User interface
interface User {
  uid: string;              // from id
  email: string | null;     // from email
  displayName: string | null; // from user_metadata.full_name
  photoURL: string | null;  // from user_metadata.avatar_url
  isAnonymous: boolean;     // always false (Supabase doesn't support anonymous)
}
```

### Data Transformation Examples

**UserProgress:**
```typescript
// Save to Supabase
await supabase
  .from('user_progress')
  .upsert({
    user_id: userId,
    data: progress,
    updated_at: new Date().toISOString()
  });

// Load from Supabase
const { data } = await supabase
  .from('user_progress')
  .select('data')
  .eq('user_id', userId)
  .single();

return data?.data as UserProgress;
```

**Favorites:**
```typescript
// Save to Supabase (replace all)
await supabase
  .from('user_favorites')
  .delete()
  .eq('user_id', userId);

await supabase
  .from('user_favorites')
  .insert(
    favorites.map(f => ({
      user_id: userId,
      exercise_id: f.exerciseId,
      added_at: f.addedAt.toISOString()
    }))
  );

// Load from Supabase
const { data } = await supabase
  .from('user_favorites')
  .select('*')
  .eq('user_id', userId);

return data?.map(row => ({
  exerciseId: row.exercise_id,
  addedAt: new Date(row.added_at)
}));
```

## Error Handling

### Error Handling Strategy

1. **Network Errors:** Retry with exponential backoff (already implemented in DatabaseService)
2. **Auth Errors:** Show user-friendly messages and redirect to login
3. **Permission Errors:** Log and show appropriate error messages
4. **Data Validation Errors:** Validate before sending to Supabase

### Error Types

```typescript
enum SupabaseErrorType {
  AUTH_ERROR = 'auth_error',
  PERMISSION_ERROR = 'permission_error',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error'
}

// Handle errors in SupabaseDatabase
private handleError(error: any): Observable<never> {
  console.error('[SupabaseDatabase] Error:', error);
  
  if (error.code === 'PGRST301') {
    // Permission error
    return throwError(() => new Error('Permission denied'));
  }
  
  if (error.message?.includes('network')) {
    // Network error - will be retried by DatabaseService
    return throwError(() => error);
  }
  
  return throwError(() => new Error('Database operation failed'));
}
```

## Testing Strategy

### Unit Testing

**AuthService Tests:**
- Test signInWithGoogle initiates OAuth flow
- Test signOut clears session
- Test auth state change updates signals
- Test getUserId returns correct user ID

**SupabaseDatabase Tests:**
- Test each CRUD operation
- Test data transformations
- Test error handling
- Test realtime subscriptions
- Mock Supabase client responses

**Integration Tests:**
- Test full auth flow (login → save data → logout)
- Test data persistence across sessions
- Test realtime sync between tabs

### Manual Testing Checklist

- [ ] Google login works and redirects correctly
- [ ] User profile is created on first login
- [ ] Progress is saved and loaded correctly
- [ ] Favorites sync in realtime
- [ ] Custom exercises CRUD operations work
- [ ] Achievements are saved and loaded
- [ ] Rewards are saved and loaded
- [ ] Logout clears session
- [ ] RLS policies prevent unauthorized access
- [ ] Data persists across browser sessions

## Migration Path

### Phase 1: Setup Supabase
1. Create Supabase project
2. Run database schema SQL
3. Configure Google OAuth in Supabase dashboard
4. Update environment.ts with Supabase credentials

### Phase 2: Implement Supabase Services
1. Install @supabase/supabase-js
2. Create supabase.client.ts
3. Implement SupabaseDatabase service
4. Update AuthService to use Supabase Auth

### Phase 3: Switch Implementation
1. Update DatabaseService to inject SupabaseDatabase
2. Update app.config.ts to remove Firebase providers
3. Test all features

### Phase 4: Cleanup
1. Remove @angular/fire and firebase packages
2. Remove FirebaseDatabase service
3. Remove Firebase config from environment.ts
4. Update documentation

### Rollback Plan

If issues occur, rollback is simple:
1. Change `private database = inject(SupabaseDatabase)` back to `inject(FirebaseDatabase)`
2. Restore Firebase providers in app.config.ts
3. No other code changes needed (thanks to abstraction layer)

## Performance Considerations

### Optimization Strategies

1. **Batch Operations:** Use Supabase batch insert/update when possible
2. **Selective Queries:** Only select needed columns
3. **Indexes:** Already defined in schema for common queries
4. **Connection Pooling:** Handled by Supabase automatically
5. **Realtime Channels:** Reuse channels for multiple subscriptions

### Caching Strategy

- Keep existing local caching in services
- Use Supabase realtime to invalidate cache
- No changes needed to existing caching logic

## Security Considerations

### Authentication Security

- Use Supabase OAuth flow (secure by default)
- Store tokens in httpOnly cookies (Supabase default)
- Implement PKCE flow for OAuth
- No sensitive data in localStorage

### Database Security

- RLS policies enforce user isolation
- All queries automatically filtered by auth.uid()
- No direct database access from client
- Use Supabase anon key (safe for client-side)

### Data Privacy

- User data encrypted at rest (Supabase default)
- HTTPS for all connections
- No PII in logs
- Comply with GDPR requirements

## Dependencies

### New Dependencies

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  }
}
```

### Removed Dependencies

```json
{
  "dependencies": {
    "@angular/fire": "^20.0.1",  // Remove
    "firebase": "^11.10.0"        // Remove
  }
}
```

## Configuration

### Environment Configuration

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  // ... other config
  supabase: {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key'
  }
  // Remove firebase config after migration
};
```

### Supabase Dashboard Configuration

1. **Authentication:**
   - Enable Google provider
   - Configure OAuth redirect URLs
   - Set site URL to localhost:4200 (dev) or production URL

2. **Database:**
   - Run schema SQL in SQL Editor
   - Verify RLS policies are active
   - Enable Realtime for required tables

3. **API:**
   - Copy project URL and anon key
   - Configure CORS if needed
