# Design Document: Achievement System

## Overview

The Achievement System transforms the English Practice application into a gamified learning platform that motivates users through recognition, rewards, and progress visualization. This feature implements a comprehensive badge system with four achievement types (Milestone, Streak, Performance, Category Master), four rarity levels (Common, Rare, Epic, Legendary), and an integrated reward system that unlocks themes, credits, hints, and avatar customizations.

The design leverages the existing `ProgressService` and extends it with a new `AchievementService` that evaluates achievement criteria in real-time. The system uses Angular signals for reactive state management, ensuring efficient updates and optimal performance. All achievement data persists in LocalStorage with user-specific keys, maintaining consistency with the existing data architecture.

## Architecture

### Component Hierarchy

```
AchievementsComponent (new)
├── AchievementGridComponent (new)
│   ├── AchievementCardComponent (new)
│   └── AchievementDetailModalComponent (new)
├── AchievementFiltersComponent (new)
├── AchievementShowcaseComponent (new - for profile)
└── AchievementNotificationComponent (new)

ProfileComponent (existing - enhanced)
└── AchievementShowcaseComponent (integrated)

HeaderComponent (existing - enhanced)
└── Achievement badge count indicator
```

### Service Layer

```
AchievementService (new)
├── evaluateAchievements()
├── unlockAchievement()
├── getAchievementProgress()
├── getUnlockedAchievements()
├── getLockedAchievements()
├── getAchievementById()
├── grantRewards()
├── shareAchievement()
└── exportAchievements()

ProgressService (existing - minor integration)
├── recordAttempt() [enhanced to trigger achievement evaluation]
└── getUserProgress() [existing]

NotificationService (new)
├── showAchievementNotification()
├── queueNotification()
└── dismissNotification()

RewardService (new)
├── unlockTheme()
├── grantCredits()
├── unlockHints()
└── unlockAvatarFrame()
```

### Data Flow

```
User Action (Complete Exercise)
    ↓
ProgressService.recordAttempt()
    ↓
AchievementService.evaluateAchievements()
    ↓
Check all relevant criteria
    ↓
If unlocked → grantRewards() + showNotification()
    ↓
Update LocalStorage + Update Signals
    ↓
UI Updates Reactively
```


## Components and Interfaces

### 1. AchievementsComponent

**Purpose**: Main container for displaying all achievements with filtering and search capabilities

**Signals**:
```typescript
achievements = computed(() => this.achievementService.getAllAchievements());
unlockedAchievements = computed(() => this.achievementService.getUnlockedAchievements());
lockedAchievements = computed(() => this.achievementService.getLockedAchievements());
selectedType = signal<AchievementType | 'all'>('all');
selectedStatus = signal<'all' | 'unlocked' | 'locked' | 'in-progress'>('all');
selectedRarity = signal<RarityLevel | 'all'>('all');
filteredAchievements = computed(() => this.applyFilters());
selectedAchievement = signal<Achievement | null>(null);
```

**Template Structure**:
```html
<div class="achievements-container">
  <header class="achievements-header">
    <h1>Achievements</h1>
    <div class="achievement-summary">
      <span>{{ unlockedAchievements().length }} / {{ achievements().length }} Unlocked</span>
      <span>{{ calculateCompletionPercentage() }}%</span>
    </div>
  </header>

  <app-achievement-filters
    [selectedType]="selectedType()"
    [selectedStatus]="selectedStatus()"
    [selectedRarity]="selectedRarity()"
    (typeChange)="selectedType.set($event)"
    (statusChange)="selectedStatus.set($event)"
    (rarityChange)="selectedRarity.set($event)" />

  <div class="achievements-grid">
    @for (achievement of filteredAchievements(); track achievement.id) {
      <app-achievement-card
        [achievement]="achievement"
        [progress]="getProgress(achievement)"
        (click)="showDetails(achievement)" />
    }
  </div>

  @if (selectedAchievement()) {
    <app-achievement-detail-modal
      [achievement]="selectedAchievement()!"
      [progress]="getProgress(selectedAchievement()!)"
      (close)="selectedAchievement.set(null)"
      (share)="shareAchievement($event)" />
  }
</div>
```

**Routing**:
- Path: `/achievements`
- Lazy loaded for performance
- Accessible from main navigation and profile


---

### 2. AchievementCardComponent

**Purpose**: Displays individual achievement with progress indicator and visual styling

**Inputs**:
```typescript
achievement = input.required<Achievement>();
progress = input.required<AchievementProgress>();
```

**Template Structure**:
```html
<div 
  class="achievement-card"
  [class.locked]="!achievement().unlocked"
  [class.common]="achievement().rarity === 'common'"
  [class.rare]="achievement().rarity === 'rare'"
  [class.epic]="achievement().rarity === 'epic'"
  [class.legendary]="achievement().rarity === 'legendary'"
  [attr.aria-label]="getAriaLabel()">
  
  @if (!achievement().unlocked) {
    <div class="lock-overlay">
      <span class="lock-icon">🔒</span>
    </div>
  }

  <div class="achievement-icon">
    <img [src]="achievement().iconUrl" [alt]="achievement().name" />
  </div>

  <div class="achievement-content">
    <h3>{{ achievement().name }}</h3>
    <p class="achievement-description">{{ achievement().description }}</p>
    
    <div class="rarity-badge" [class]="achievement().rarity">
      {{ achievement().rarity | titlecase }}
    </div>

    @if (!achievement().unlocked && progress().percentage < 100) {
      <div class="progress-container">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            [style.width.%]="progress().percentage">
          </div>
        </div>
        <span class="progress-text">{{ progress().current }} / {{ progress().required }}</span>
      </div>
    }

    @if (achievement().unlocked) {
      <div class="unlock-date">
        <span class="icon">✓</span>
        <span>Unlocked {{ formatDate(achievement().unlockedAt!) }}</span>
      </div>
    }
  </div>
</div>
```

**Styling Considerations**:
- Locked achievements: 50% opacity with grayscale filter
- Rarity colors: Common (gray), Rare (blue), Epic (purple), Legendary (gold)
- Hover effects: Scale up slightly, show glow effect
- Progress bar: Animated fill with gradient


---

### 3. AchievementDetailModalComponent

**Purpose**: Shows detailed information about an achievement including criteria, rewards, and tips

**Inputs**:
```typescript
achievement = input.required<Achievement>();
progress = input.required<AchievementProgress>();
```

**Outputs**:
```typescript
close = output<void>();
share = output<Achievement>();
```

**Template Structure**:
```html
<div class="modal-overlay" (click)="close.emit()">
  <div class="modal-content" (click)="$event.stopPropagation()">
    <button class="close-button" (click)="close.emit()" aria-label="Close modal">×</button>

    <div class="modal-header" [class]="achievement().rarity">
      <div class="achievement-icon-large">
        <img [src]="achievement().iconUrl" [alt]="achievement().name" />
      </div>
      <h2>{{ achievement().name }}</h2>
      <div class="rarity-badge" [class]="achievement().rarity">
        {{ achievement().rarity | titlecase }}
      </div>
    </div>

    <div class="modal-body">
      <section class="description-section">
        <h3>Description</h3>
        <p>{{ achievement().description }}</p>
      </section>

      <section class="criteria-section">
        <h3>How to Unlock</h3>
        <ul class="criteria-list">
          @for (criterion of achievement().criteria; track criterion) {
            <li>{{ criterion }}</li>
          }
        </ul>
      </section>

      @if (!achievement().unlocked) {
        <section class="progress-section">
          <h3>Your Progress</h3>
          <div class="progress-details">
            <div class="progress-bar-large">
              <div class="progress-fill" [style.width.%]="progress().percentage"></div>
            </div>
            <p class="progress-text">
              {{ progress().current }} / {{ progress().required }} 
              ({{ progress().percentage }}%)
            </p>
            <p class="progress-description">{{ progress().description }}</p>
          </div>
        </section>

        @if (achievement().tips && achievement().tips.length > 0) {
          <section class="tips-section">
            <h3>💡 Tips</h3>
            <ul class="tips-list">
              @for (tip of achievement().tips; track tip) {
                <li>{{ tip }}</li>
              }
            </ul>
          </section>
        }
      }

      @if (achievement().unlocked) {
        <section class="unlock-section">
          <div class="unlock-info">
            <span class="icon">🎉</span>
            <p>Unlocked on {{ formatDate(achievement().unlockedAt!) }}</p>
          </div>
        </section>
      }

      <section class="rewards-section">
        <h3>Rewards</h3>
        <div class="rewards-grid">
          @for (reward of achievement().rewards; track reward.type) {
            <div class="reward-item">
              <span class="reward-icon">{{ getRewardIcon(reward.type) }}</span>
              <span class="reward-text">{{ reward.description }}</span>
            </div>
          }
        </div>
      </section>
    </div>

    <div class="modal-footer">
      @if (achievement().unlocked) {
        <button class="share-button" (click)="share.emit(achievement())">
          Share Achievement
        </button>
      }
      <button class="close-button-text" (click)="close.emit()">Close</button>
    </div>
  </div>
</div>
```


---

### 4. AchievementNotificationComponent

**Purpose**: Displays toast notifications when achievements are unlocked

**Signals**:
```typescript
notificationQueue = signal<AchievementNotification[]>([]);
currentNotification = signal<AchievementNotification | null>(null);
isVisible = signal(false);
```

**Template Structure**:
```html
@if (isVisible() && currentNotification()) {
  <div 
    class="achievement-notification"
    [class]="currentNotification()!.rarity"
    [@slideIn]
    role="alert"
    aria-live="polite">
    
    <div class="notification-content">
      <div class="notification-icon">
        <img [src]="currentNotification()!.iconUrl" [alt]="currentNotification()!.name" />
      </div>
      
      <div class="notification-text">
        <h4>Achievement Unlocked!</h4>
        <p class="achievement-name">{{ currentNotification()!.name }}</p>
        <p class="achievement-rarity">{{ currentNotification()!.rarity | titlecase }}</p>
      </div>

      <button 
        class="view-button" 
        (click)="viewAchievement()"
        aria-label="View achievement details">
        View
      </button>

      <button 
        class="close-button" 
        (click)="dismiss()"
        aria-label="Dismiss notification">
        ×
      </button>
    </div>

    <div class="notification-progress">
      <div class="progress-bar" [style.animation-duration.ms]="5000"></div>
    </div>
  </div>
}
```

**Animation**:
```typescript
trigger('slideIn', [
  transition(':enter', [
    style({ transform: 'translateY(-100%)', opacity: 0 }),
    animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
  ]),
  transition(':leave', [
    animate('300ms ease-in', style({ transform: 'translateY(-100%)', opacity: 0 }))
  ])
])
```

**Behavior**:
- Auto-dismiss after 5 seconds
- Queue multiple notifications with 1 second delay
- Click "View" to navigate to achievements page
- Click "×" to dismiss immediately
- Pause auto-dismiss on hover


---

### 5. AchievementShowcaseComponent

**Purpose**: Displays featured achievements in user profile

**Inputs**:
```typescript
userId = input<string>();
maxDisplay = input<number>(3);
```

**Signals**:
```typescript
recentAchievements = computed(() => 
  this.achievementService.getUnlockedAchievements()
    .sort((a, b) => b.unlockedAt!.getTime() - a.unlockedAt!.getTime())
    .slice(0, this.maxDisplay())
);
totalUnlocked = computed(() => this.achievementService.getUnlockedAchievements().length);
totalAchievements = computed(() => this.achievementService.getAllAchievements().length);
completionPercentage = computed(() => 
  Math.round((this.totalUnlocked() / this.totalAchievements()) * 100)
);
rarityDistribution = computed(() => this.calculateRarityDistribution());
hasLegendary = computed(() => 
  this.achievementService.getUnlockedAchievements()
    .some(a => a.rarity === 'legendary')
);
```

**Template Structure**:
```html
<div class="achievement-showcase">
  <div class="showcase-header">
    <h3>Achievements</h3>
    @if (hasLegendary()) {
      <span class="elite-badge" title="Has unlocked at least one Legendary achievement">
        ⭐ Elite Learner
      </span>
    }
  </div>

  <div class="showcase-stats">
    <div class="stat">
      <span class="stat-value">{{ totalUnlocked() }}</span>
      <span class="stat-label">Unlocked</span>
    </div>
    <div class="stat">
      <span class="stat-value">{{ completionPercentage() }}%</span>
      <span class="stat-label">Complete</span>
    </div>
  </div>

  <div class="rarity-distribution">
    @for (rarity of rarityDistribution(); track rarity.level) {
      <div class="rarity-count" [class]="rarity.level">
        <span class="count">{{ rarity.count }}</span>
        <span class="label">{{ rarity.level | titlecase }}</span>
      </div>
    }
  </div>

  <div class="recent-achievements">
    <h4>Recent Achievements</h4>
    <div class="achievements-list">
      @for (achievement of recentAchievements(); track achievement.id) {
        <div class="showcase-achievement" [class]="achievement.rarity">
          <img [src]="achievement.iconUrl" [alt]="achievement.name" />
          <div class="achievement-info">
            <span class="name">{{ achievement.name }}</span>
            <span class="date">{{ formatDate(achievement.unlockedAt!) }}</span>
          </div>
        </div>
      }
    </div>
  </div>

  <a routerLink="/achievements" class="view-all-link">
    View All Achievements →
  </a>
</div>
```


---

## Data Models

### Achievement Interface

```typescript
export interface Achievement {
  id: string;
  name: string;
  description: string;
  type: AchievementType;
  rarity: RarityLevel;
  iconUrl: string;
  criteria: string[];
  tips?: string[];
  rewards: Reward[];
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: AchievementProgress;
}

export enum AchievementType {
  MILESTONE = 'milestone',
  STREAK = 'streak',
  PERFORMANCE = 'performance',
  CATEGORY_MASTER = 'category-master'
}

export enum RarityLevel {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}
```

### AchievementProgress Interface

```typescript
export interface AchievementProgress {
  achievementId: string;
  current: number;
  required: number;
  percentage: number;
  description: string;
  lastUpdated: Date;
}
```

### Reward Interface

```typescript
export interface Reward {
  type: RewardType;
  value: number | string;
  description: string;
}

export enum RewardType {
  CREDITS = 'credits',
  THEME = 'theme',
  HINTS = 'hints',
  AVATAR_FRAME = 'avatar-frame'
}
```

### AchievementNotification Interface

```typescript
export interface AchievementNotification {
  achievement: Achievement;
  name: string;
  rarity: RarityLevel;
  iconUrl: string;
  timestamp: Date;
}
```

### UserAchievementData Interface

```typescript
export interface UserAchievementData {
  userId: string;
  unlockedAchievements: {
    achievementId: string;
    unlockedAt: Date;
  }[];
  progress: {
    [achievementId: string]: AchievementProgress;
  };
  lastEvaluated: Date;
}
```


---

## Achievement Definitions

### Milestone Achievements

```typescript
const MILESTONE_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-step',
    name: 'First Step',
    description: 'Complete your first exercise',
    type: AchievementType.MILESTONE,
    rarity: RarityLevel.COMMON,
    iconUrl: '/assets/achievements/first-step.svg',
    criteria: ['Complete 1 exercise'],
    rewards: [
      { type: RewardType.CREDITS, value: 50, description: '50 Bonus Credits' }
    ],
    unlocked: false
  },
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Complete 10 exercises',
    type: AchievementType.MILESTONE,
    rarity: RarityLevel.COMMON,
    iconUrl: '/assets/achievements/getting-started.svg',
    criteria: ['Complete 10 exercises'],
    tips: ['Practice regularly to reach this milestone faster'],
    rewards: [
      { type: RewardType.CREDITS, value: 50, description: '50 Bonus Credits' }
    ],
    unlocked: false
  },
  {
    id: 'dedicated-learner',
    name: 'Dedicated Learner',
    description: 'Complete 50 exercises',
    type: AchievementType.MILESTONE,
    rarity: RarityLevel.RARE,
    iconUrl: '/assets/achievements/dedicated-learner.svg',
    criteria: ['Complete 50 exercises'],
    tips: ['Try exercises from different categories to diversify your learning'],
    rewards: [
      { type: RewardType.CREDITS, value: 100, description: '100 Bonus Credits' },
      { type: RewardType.THEME, value: 'ocean-blue', description: 'Ocean Blue Theme' }
    ],
    unlocked: false
  },
  {
    id: 'master-student',
    name: 'Master Student',
    description: 'Complete 100 exercises',
    type: AchievementType.MILESTONE,
    rarity: RarityLevel.EPIC,
    iconUrl: '/assets/achievements/master-student.svg',
    criteria: ['Complete 100 exercises'],
    rewards: [
      { type: RewardType.CREDITS, value: 250, description: '250 Bonus Credits' },
      { type: RewardType.HINTS, value: 3, description: '3 Exclusive Hints' }
    ],
    unlocked: false
  },
  {
    id: 'legend',
    name: 'Legend',
    description: 'Complete 500 exercises',
    type: AchievementType.MILESTONE,
    rarity: RarityLevel.LEGENDARY,
    iconUrl: '/assets/achievements/legend.svg',
    criteria: ['Complete 500 exercises'],
    rewards: [
      { type: RewardType.CREDITS, value: 500, description: '500 Bonus Credits' },
      { type: RewardType.AVATAR_FRAME, value: 'golden-frame', description: 'Golden Avatar Frame' }
    ],
    unlocked: false
  }
];
```

### Streak Achievements

```typescript
const STREAK_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'week-warrior',
    name: 'Week Warrior',
    description: 'Practice for 7 consecutive days',
    type: AchievementType.STREAK,
    rarity: RarityLevel.RARE,
    iconUrl: '/assets/achievements/week-warrior.svg',
    criteria: ['Complete at least 1 exercise per day for 7 consecutive days'],
    tips: ['Set a daily reminder to maintain your streak'],
    rewards: [
      { type: RewardType.CREDITS, value: 100, description: '100 Bonus Credits' },
      { type: RewardType.THEME, value: 'fire-red', description: 'Fire Red Theme' }
    ],
    unlocked: false
  },
  {
    id: 'month-master',
    name: 'Month Master',
    description: 'Practice for 30 consecutive days',
    type: AchievementType.STREAK,
    rarity: RarityLevel.EPIC,
    iconUrl: '/assets/achievements/month-master.svg',
    criteria: ['Complete at least 1 exercise per day for 30 consecutive days'],
    tips: ['Consistency is key - even one exercise per day counts!'],
    rewards: [
      { type: RewardType.CREDITS, value: 250, description: '250 Bonus Credits' },
      { type: RewardType.HINTS, value: 3, description: '3 Exclusive Hints' }
    ],
    unlocked: false
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Practice for 100 consecutive days',
    type: AchievementType.STREAK,
    rarity: RarityLevel.LEGENDARY,
    iconUrl: '/assets/achievements/unstoppable.svg',
    criteria: ['Complete at least 1 exercise per day for 100 consecutive days'],
    rewards: [
      { type: RewardType.CREDITS, value: 500, description: '500 Bonus Credits' },
      { type: RewardType.AVATAR_FRAME, value: 'diamond-frame', description: 'Diamond Avatar Frame' }
    ],
    unlocked: false
  }
];
```


### Performance Achievements

```typescript
const PERFORMANCE_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'perfect-score',
    name: 'Perfect Score',
    description: 'Achieve 100% accuracy on any exercise',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.RARE,
    iconUrl: '/assets/achievements/perfect-score.svg',
    criteria: ['Complete an exercise with 100% accuracy'],
    tips: ['Take your time and review your translation before submitting'],
    rewards: [
      { type: RewardType.CREDITS, value: 100, description: '100 Bonus Credits' },
      { type: RewardType.THEME, value: 'gold-star', description: 'Gold Star Theme' }
    ],
    unlocked: false
  },
  {
    id: 'grammar-guru',
    name: 'Grammar Guru',
    description: 'Complete an exercise with zero grammar errors',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.RARE,
    iconUrl: '/assets/achievements/grammar-guru.svg',
    criteria: ['Complete an exercise with 0 grammar errors'],
    tips: ['Focus on sentence structure and verb tenses'],
    rewards: [
      { type: RewardType.CREDITS, value: 100, description: '100 Bonus Credits' },
      { type: RewardType.THEME, value: 'emerald-green', description: 'Emerald Green Theme' }
    ],
    unlocked: false
  },
  {
    id: 'vocabulary-virtuoso',
    name: 'Vocabulary Virtuoso',
    description: 'Use advanced vocabulary in an Advanced exercise',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.EPIC,
    iconUrl: '/assets/achievements/vocabulary-virtuoso.svg',
    criteria: [
      'Complete an Advanced level exercise',
      'Use at least 5 advanced vocabulary words as identified by AI feedback'
    ],
    tips: ['Read widely and incorporate sophisticated vocabulary in your translations'],
    rewards: [
      { type: RewardType.CREDITS, value: 250, description: '250 Bonus Credits' },
      { type: RewardType.HINTS, value: 3, description: '3 Exclusive Hints' }
    ],
    unlocked: false
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'Complete an exercise quickly with high accuracy',
    type: AchievementType.PERFORMANCE,
    rarity: RarityLevel.EPIC,
    iconUrl: '/assets/achievements/speed-demon.svg',
    criteria: [
      'Complete an exercise in under 60 seconds',
      'Achieve a score above 90%'
    ],
    tips: ['Practice regularly to improve both speed and accuracy'],
    rewards: [
      { type: RewardType.CREDITS, value: 250, description: '250 Bonus Credits' },
      { type: RewardType.HINTS, value: 3, description: '3 Exclusive Hints' }
    ],
    unlocked: false
  }
];
```

### Category Master Achievements

```typescript
// Generated dynamically for each category
const CATEGORY_MASTER_TEMPLATE = {
  id: 'master-{category}',
  name: '{Category} Master',
  description: 'Master the {Category} category',
  type: AchievementType.CATEGORY_MASTER,
  rarity: RarityLevel.RARE,
  iconUrl: '/assets/achievements/category-{category}.svg',
  criteria: [
    'Complete 80% of exercises in the {Category} category',
    'Achieve an average score above 75%'
  ],
  tips: ['Focus on this category to improve your mastery'],
  rewards: [
    { type: RewardType.CREDITS, value: 100, description: '100 Bonus Credits' }
  ],
  unlocked: false
};

// Ultimate Master Achievement
const ULTIMATE_MASTER: Achievement = {
  id: 'ultimate-master',
  name: 'Ultimate Master',
  description: 'Achieve master status in all categories',
  type: AchievementType.CATEGORY_MASTER,
  rarity: RarityLevel.LEGENDARY,
  iconUrl: '/assets/achievements/ultimate-master.svg',
  criteria: ['Unlock all category master badges'],
  rewards: [
    { type: RewardType.CREDITS, value: 500, description: '500 Bonus Credits' },
    { type: RewardType.AVATAR_FRAME, value: 'rainbow-frame', description: 'Rainbow Avatar Frame' }
  ],
  unlocked: false
};
```


---

## Service Implementation

### AchievementService

```typescript
@Injectable({ providedIn: 'root' })
export class AchievementService {
  private readonly STORAGE_KEY_PREFIX = 'user_achievements_';
  private authService = inject(AuthService);
  private progressService = inject(ProgressService);
  private notificationService = inject(NotificationService);
  private rewardService = inject(RewardService);

  private allAchievements = signal<Achievement[]>(this.initializeAchievements());
  private userAchievementData = signal<UserAchievementData>(this.loadUserData());

  // Computed signals
  unlockedAchievements = computed(() => 
    this.allAchievements().filter(a => a.unlocked)
  );

  lockedAchievements = computed(() => 
    this.allAchievements().filter(a => !a.unlocked)
  );

  constructor() {
    // Subscribe to progress changes
    this.progressService.getUserProgress().subscribe(progress => {
      this.evaluateAchievements(progress);
    });

    // Reload when user changes
    effect(() => {
      const user = this.authService.currentUser();
      this.loadUserData();
    });
  }

  private initializeAchievements(): Achievement[] {
    const achievements: Achievement[] = [
      ...MILESTONE_ACHIEVEMENTS,
      ...STREAK_ACHIEVEMENTS,
      ...PERFORMANCE_ACHIEVEMENTS,
      ...this.generateCategoryMasterAchievements(),
      ULTIMATE_MASTER
    ];

    // Load user data and mark unlocked achievements
    const userData = this.loadUserData();
    return achievements.map(achievement => ({
      ...achievement,
      unlocked: userData.unlockedAchievements.some(
        ua => ua.achievementId === achievement.id
      ),
      unlockedAt: userData.unlockedAchievements.find(
        ua => ua.achievementId === achievement.id
      )?.unlockedAt,
      progress: userData.progress[achievement.id]
    }));
  }

  private generateCategoryMasterAchievements(): Achievement[] {
    const categories = Object.values(ExerciseCategory);
    return categories.map(category => ({
      ...CATEGORY_MASTER_TEMPLATE,
      id: `master-${category}`,
      name: `${this.formatCategoryName(category)} Master`,
      description: `Master the ${this.formatCategoryName(category)} category`,
      iconUrl: `/assets/achievements/category-${category}.svg`,
      criteria: [
        `Complete 80% of exercises in the ${this.formatCategoryName(category)} category`,
        'Achieve an average score above 75%'
      ]
    }));
  }

  evaluateAchievements(progress: UserProgress): void {
    const newlyUnlocked: Achievement[] = [];

    this.allAchievements().forEach(achievement => {
      if (!achievement.unlocked && this.checkCriteria(achievement, progress)) {
        this.unlockAchievement(achievement.id);
        newlyUnlocked.push(achievement);
      } else if (!achievement.unlocked) {
        this.updateProgress(achievement, progress);
      }
    });

    // Show notifications for newly unlocked achievements
    if (newlyUnlocked.length > 0) {
      this.notificationService.queueNotifications(newlyUnlocked);
    }
  }

  private checkCriteria(achievement: Achievement, progress: UserProgress): boolean {
    switch (achievement.type) {
      case AchievementType.MILESTONE:
        return this.checkMilestoneCriteria(achievement, progress);
      case AchievementType.STREAK:
        return this.checkStreakCriteria(achievement, progress);
      case AchievementType.PERFORMANCE:
        return this.checkPerformanceCriteria(achievement, progress);
      case AchievementType.CATEGORY_MASTER:
        return this.checkCategoryMasterCriteria(achievement, progress);
      default:
        return false;
    }
  }

  private checkMilestoneCriteria(achievement: Achievement, progress: UserProgress): boolean {
    const exerciseCount = progress.attempts.length;
    const thresholds: { [key: string]: number } = {
      'first-step': 1,
      'getting-started': 10,
      'dedicated-learner': 50,
      'master-student': 100,
      'legend': 500
    };
    return exerciseCount >= thresholds[achievement.id];
  }

  private checkStreakCriteria(achievement: Achievement, progress: UserProgress): boolean {
    const currentStreak = progress.currentStreak;
    const thresholds: { [key: string]: number } = {
      'week-warrior': 7,
      'month-master': 30,
      'unstoppable': 100
    };
    return currentStreak >= thresholds[achievement.id];
  }

  private checkPerformanceCriteria(achievement: Achievement, progress: UserProgress): boolean {
    switch (achievement.id) {
      case 'perfect-score':
        return progress.attempts.some(a => a.accuracyScore === 100);
      
      case 'grammar-guru':
        return progress.attempts.some(a => 
          a.feedback.filter(f => f.type === 'grammar').length === 0 && a.accuracyScore >= 90
        );
      
      case 'vocabulary-virtuoso':
        return progress.attempts.some(a => {
          // Check if it's an advanced exercise with advanced vocabulary
          // This would need to be tracked in the attempt data
          return a.accuracyScore >= 85; // Simplified check
        });
      
      case 'speed-demon':
        return progress.attempts.some(a => {
          // Would need to track completion time in attempt data
          return a.accuracyScore >= 90; // Simplified check
        });
      
      default:
        return false;
    }
  }

  private checkCategoryMasterCriteria(achievement: Achievement, progress: UserProgress): boolean {
    if (achievement.id === 'ultimate-master') {
      // Check if all category master badges are unlocked
      const categoryMasters = this.allAchievements().filter(
        a => a.type === AchievementType.CATEGORY_MASTER && a.id !== 'ultimate-master'
      );
      return categoryMasters.every(a => a.unlocked);
    }

    // Extract category from achievement ID (e.g., 'master-daily-life' -> 'daily-life')
    const category = achievement.id.replace('master-', '');
    
    // Get all exercises in this category (would need ExerciseService)
    // For now, simplified logic
    const categoryAttempts = progress.attempts.filter(a => {
      // Would need to look up exercise category
      return true; // Simplified
    });

    if (categoryAttempts.length === 0) return false;

    const avgScore = categoryAttempts.reduce((sum, a) => sum + a.accuracyScore, 0) / categoryAttempts.length;
    
    // Check if completed 80% of category exercises with avg score > 75%
    return avgScore > 75; // Simplified check
  }

  private unlockAchievement(achievementId: string): void {
    const achievement = this.allAchievements().find(a => a.id === achievementId);
    if (!achievement) return;

    // Update achievement
    achievement.unlocked = true;
    achievement.unlockedAt = new Date();

    // Update user data
    const userData = this.userAchievementData();
    userData.unlockedAchievements.push({
      achievementId,
      unlockedAt: new Date()
    });
    this.saveUserData(userData);

    // Grant rewards
    this.rewardService.grantRewards(achievement.rewards);

    // Update signal
    this.allAchievements.set([...this.allAchievements()]);
  }

  private updateProgress(achievement: Achievement, progress: UserProgress): void {
    const progressData = this.calculateProgress(achievement, progress);
    
    const userData = this.userAchievementData();
    userData.progress[achievement.id] = progressData;
    this.saveUserData(userData);

    // Update achievement progress
    achievement.progress = progressData;
  }

  private calculateProgress(achievement: Achievement, progress: UserProgress): AchievementProgress {
    let current = 0;
    let required = 0;
    let description = '';

    switch (achievement.type) {
      case AchievementType.MILESTONE:
        current = progress.attempts.length;
        required = this.getMilestoneThreshold(achievement.id);
        description = `${current} out of ${required} exercises completed`;
        break;

      case AchievementType.STREAK:
        current = progress.currentStreak;
        required = this.getStreakThreshold(achievement.id);
        description = `Current streak: ${current} days, Required: ${required} days`;
        break;

      case AchievementType.PERFORMANCE:
        // Performance achievements are binary (unlocked or not)
        current = 0;
        required = 1;
        description = 'Complete the required criteria';
        break;

      case AchievementType.CATEGORY_MASTER:
        // Would need to calculate category-specific progress
        current = 0;
        required = 100;
        description = 'Complete more exercises in this category';
        break;
    }

    return {
      achievementId: achievement.id,
      current,
      required,
      percentage: Math.min(Math.round((current / required) * 100), 100),
      description,
      lastUpdated: new Date()
    };
  }

  private getMilestoneThreshold(achievementId: string): number {
    const thresholds: { [key: string]: number } = {
      'first-step': 1,
      'getting-started': 10,
      'dedicated-learner': 50,
      'master-student': 100,
      'legend': 500
    };
    return thresholds[achievementId] || 0;
  }

  private getStreakThreshold(achievementId: string): number {
    const thresholds: { [key: string]: number } = {
      'week-warrior': 7,
      'month-master': 30,
      'unstoppable': 100
    };
    return thresholds[achievementId] || 0;
  }

  getAllAchievements(): Achievement[] {
    return this.allAchievements();
  }

  getUnlockedAchievements(): Achievement[] {
    return this.unlockedAchievements();
  }

  getLockedAchievements(): Achievement[] {
    return this.lockedAchievements();
  }

  getAchievementById(id: string): Achievement | undefined {
    return this.allAchievements().find(a => a.id === id);
  }

  private getStorageKey(): string | null {
    const userId = this.authService.getUserId();
    return userId ? `${this.STORAGE_KEY_PREFIX}${userId}` : null;
  }

  private loadUserData(): UserAchievementData {
    const key = this.getStorageKey();
    if (!key) {
      return this.getDefaultUserData();
    }

    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        // Convert date strings back to Date objects
        data.unlockedAchievements = data.unlockedAchievements.map((ua: any) => ({
          ...ua,
          unlockedAt: new Date(ua.unlockedAt)
        }));
        return data;
      } catch (error) {
        console.error('Failed to load achievement data:', error);
        return this.getDefaultUserData();
      }
    }

    return this.getDefaultUserData();
  }

  private saveUserData(data: UserAchievementData): void {
    const key = this.getStorageKey();
    if (!key) return;

    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save achievement data:', error);
    }
  }

  private getDefaultUserData(): UserAchievementData {
    return {
      userId: this.authService.getUserId() || '',
      unlockedAchievements: [],
      progress: {},
      lastEvaluated: new Date()
    };
  }

  private formatCategoryName(category: string): string {
    return category.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}
```


---

### NotificationService

```typescript
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private notificationQueue = signal<AchievementNotification[]>([]);
  private currentNotification = signal<AchievementNotification | null>(null);
  private isProcessing = false;

  queueNotifications(achievements: Achievement[]): void {
    const notifications = achievements.map(achievement => ({
      achievement,
      name: achievement.name,
      rarity: achievement.rarity,
      iconUrl: achievement.iconUrl,
      timestamp: new Date()
    }));

    this.notificationQueue.update(queue => [...queue, ...notifications]);
    this.processQueue();
  }

  private processQueue(): void {
    if (this.isProcessing || this.notificationQueue().length === 0) {
      return;
    }

    this.isProcessing = true;
    const [next, ...rest] = this.notificationQueue();
    this.notificationQueue.set(rest);
    this.currentNotification.set(next);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      this.dismissNotification();
      
      // Process next notification after 1 second delay
      setTimeout(() => {
        this.isProcessing = false;
        this.processQueue();
      }, 1000);
    }, 5000);
  }

  dismissNotification(): void {
    this.currentNotification.set(null);
  }

  getCurrentNotification(): AchievementNotification | null {
    return this.currentNotification();
  }
}
```

---

### RewardService

```typescript
@Injectable({ providedIn: 'root' })
export class RewardService {
  private readonly STORAGE_KEY_PREFIX = 'user_rewards_';
  private authService = inject(AuthService);
  private progressService = inject(ProgressService);

  private unlockedRewards = signal<{
    themes: string[];
    hints: number;
    avatarFrames: string[];
  }>(this.loadRewards());

  grantRewards(rewards: Reward[]): void {
    rewards.forEach(reward => {
      switch (reward.type) {
        case RewardType.CREDITS:
          this.grantCredits(reward.value as number);
          break;
        case RewardType.THEME:
          this.unlockTheme(reward.value as string);
          break;
        case RewardType.HINTS:
          this.unlockHints(reward.value as number);
          break;
        case RewardType.AVATAR_FRAME:
          this.unlockAvatarFrame(reward.value as string);
          break;
      }
    });

    this.saveRewards();
  }

  private grantCredits(amount: number): void {
    // Update progress service with bonus credits
    const progress = this.progressService.getUserProgress();
    // Would need to add a method to ProgressService to add bonus credits
  }

  private unlockTheme(themeId: string): void {
    this.unlockedRewards.update(rewards => ({
      ...rewards,
      themes: [...rewards.themes, themeId]
    }));
  }

  private unlockHints(count: number): void {
    this.unlockedRewards.update(rewards => ({
      ...rewards,
      hints: rewards.hints + count
    }));
  }

  private unlockAvatarFrame(frameId: string): void {
    this.unlockedRewards.update(rewards => ({
      ...rewards,
      avatarFrames: [...rewards.avatarFrames, frameId]
    }));
  }

  getUnlockedThemes(): string[] {
    return this.unlockedRewards().themes;
  }

  getAvailableHints(): number {
    return this.unlockedRewards().hints;
  }

  getUnlockedAvatarFrames(): string[] {
    return this.unlockedRewards().avatarFrames;
  }

  private getStorageKey(): string | null {
    const userId = this.authService.getUserId();
    return userId ? `${this.STORAGE_KEY_PREFIX}${userId}` : null;
  }

  private loadRewards() {
    const key = this.getStorageKey();
    if (!key) {
      return { themes: [], hints: 0, avatarFrames: [] };
    }

    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Failed to load rewards:', error);
        return { themes: [], hints: 0, avatarFrames: [] };
      }
    }

    return { themes: [], hints: 0, avatarFrames: [] };
  }

  private saveRewards(): void {
    const key = this.getStorageKey();
    if (!key) return;

    try {
      localStorage.setItem(key, JSON.stringify(this.unlockedRewards()));
    } catch (error) {
      console.error('Failed to save rewards:', error);
    }
  }
}
```


---

## Error Handling

### Data Validation

```typescript
// In AchievementService
private validateAchievementData(data: UserAchievementData): boolean {
  if (!data || !data.unlockedAchievements || !data.progress) {
    return false;
  }
  return true;
}

// In components
hasAchievements = computed(() => {
  const achievements = this.achievementService.getAllAchievements();
  return achievements && achievements.length > 0;
});
```

### LocalStorage Errors

```typescript
// Wrap all localStorage operations in try-catch
private safeLocalStorageOperation<T>(
  operation: () => T,
  fallback: T,
  errorMessage: string
): T {
  try {
    return operation();
  } catch (error) {
    console.error(errorMessage, error);
    return fallback;
  }
}
```

### Missing Achievement Icons

```typescript
// Provide fallback icon
getIconUrl(achievement: Achievement): string {
  return achievement.iconUrl || '/assets/achievements/default.svg';
}
```

### Empty States

- **No achievements unlocked**: Show encouraging message with progress toward first achievement
- **All achievements unlocked**: Show congratulatory message and completion stats
- **Loading errors**: Show retry button with error message

---

## Testing Strategy

### Unit Tests

**AchievementService Tests**:
```typescript
describe('AchievementService', () => {
  it('should unlock First Step achievement after 1 exercise', () => {
    const progress = createMockProgress(1);
    service.evaluateAchievements(progress);
    const achievement = service.getAchievementById('first-step');
    expect(achievement?.unlocked).toBe(true);
  });

  it('should calculate milestone progress correctly', () => {
    const progress = createMockProgress(5);
    service.evaluateAchievements(progress);
    const achievement = service.getAchievementById('getting-started');
    expect(achievement?.progress?.percentage).toBe(50);
  });

  it('should unlock streak achievement after 7 consecutive days', () => {
    const progress = createMockProgressWithStreak(7);
    service.evaluateAchievements(progress);
    const achievement = service.getAchievementById('week-warrior');
    expect(achievement?.unlocked).toBe(true);
  });

  it('should grant rewards when achievement is unlocked', () => {
    spyOn(rewardService, 'grantRewards');
    const progress = createMockProgress(1);
    service.evaluateAchievements(progress);
    expect(rewardService.grantRewards).toHaveBeenCalled();
  });

  it('should queue notifications for multiple unlocked achievements', () => {
    spyOn(notificationService, 'queueNotifications');
    const progress = createMockProgress(10);
    service.evaluateAchievements(progress);
    expect(notificationService.queueNotifications).toHaveBeenCalled();
  });
});
```

**Component Tests**:
```typescript
describe('AchievementsComponent', () => {
  it('should display all achievements', () => {
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('app-achievement-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('should filter achievements by type', () => {
    component.selectedType.set('milestone');
    fixture.detectChanges();
    const filtered = component.filteredAchievements();
    expect(filtered.every(a => a.type === 'milestone')).toBe(true);
  });

  it('should open detail modal when achievement is clicked', () => {
    const achievement = mockAchievements[0];
    component.showDetails(achievement);
    expect(component.selectedAchievement()).toBe(achievement);
  });
});

describe('AchievementNotificationComponent', () => {
  it('should display notification when achievement is unlocked', () => {
    component.currentNotification.set(mockNotification);
    component.isVisible.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.achievement-notification')).toBeTruthy();
  });

  it('should auto-dismiss after 5 seconds', fakeAsync(() => {
    component.showNotification(mockNotification);
    tick(5000);
    expect(component.isVisible()).toBe(false);
  }));
});
```

### Integration Tests

- Test achievement unlock flow from exercise completion to notification
- Test reward granting and persistence
- Test filtering and search functionality
- Test social sharing functionality
- Test profile showcase integration

### Performance Tests

- Measure achievement evaluation time for 1000+ exercises
- Test notification queue performance with multiple simultaneous unlocks
- Verify LocalStorage operations don't block UI
- Test memory usage with all achievements loaded

---

## Performance Optimization

### Efficient Evaluation

```typescript
// Only evaluate relevant achievements based on action type
evaluateRelevantAchievements(progress: UserProgress, actionType: 'exercise' | 'streak'): void {
  const relevantAchievements = this.allAchievements().filter(a => {
    if (actionType === 'exercise') {
      return a.type === AchievementType.MILESTONE || 
             a.type === AchievementType.PERFORMANCE ||
             a.type === AchievementType.CATEGORY_MASTER;
    } else if (actionType === 'streak') {
      return a.type === AchievementType.STREAK;
    }
    return false;
  });

  relevantAchievements.forEach(achievement => {
    if (!achievement.unlocked && this.checkCriteria(achievement, progress)) {
      this.unlockAchievement(achievement.id);
    }
  });
}
```

### Debounced Evaluation

```typescript
private evaluationDebounce: any;

evaluateAchievementsDebounced(progress: UserProgress): void {
  clearTimeout(this.evaluationDebounce);
  this.evaluationDebounce = setTimeout(() => {
    this.evaluateAchievements(progress);
  }, 100);
}
```

### Lazy Loading Icons

```typescript
// Use lazy loading for achievement icons
<img 
  [src]="achievement().iconUrl" 
  loading="lazy"
  [alt]="achievement().name" />
```

### Computed Signal Optimization

```typescript
// Use computed signals to avoid unnecessary recalculations
filteredAchievements = computed(() => {
  const achievements = this.achievements();
  const type = this.selectedType();
  const status = this.selectedStatus();
  const rarity = this.selectedRarity();

  return achievements.filter(a => {
    if (type !== 'all' && a.type !== type) return false;
    if (status === 'unlocked' && !a.unlocked) return false;
    if (status === 'locked' && a.unlocked) return false;
    if (status === 'in-progress' && (a.unlocked || !a.progress || a.progress.percentage === 0)) return false;
    if (rarity !== 'all' && a.rarity !== rarity) return false;
    return true;
  });
});
```


---

## Accessibility

### ARIA Labels and Roles

```html
<!-- Achievement card -->
<div 
  class="achievement-card"
  role="button"
  tabindex="0"
  [attr.aria-label]="getAriaLabel(achievement())"
  [attr.aria-describedby]="'achievement-desc-' + achievement().id"
  (keydown.enter)="showDetails(achievement())"
  (keydown.space)="showDetails(achievement())">
  
  <div [id]="'achievement-desc-' + achievement().id" class="sr-only">
    {{ achievement().description }}
    @if (!achievement().unlocked) {
      Progress: {{ progress().percentage }}%
    } @else {
      Unlocked on {{ formatDate(achievement().unlockedAt!) }}
    }
  </div>
</div>

<!-- Modal -->
<div 
  class="modal-overlay"
  role="dialog"
  aria-modal="true"
  [attr.aria-labelledby]="'modal-title-' + achievement().id">
  
  <h2 [id]="'modal-title-' + achievement().id">
    {{ achievement().name }}
  </h2>
</div>

<!-- Notification -->
<div 
  class="achievement-notification"
  role="alert"
  aria-live="polite"
  aria-atomic="true">
  Achievement Unlocked: {{ currentNotification()!.name }}
</div>
```

### Keyboard Navigation

- All interactive elements accessible via Tab
- Enter/Space to activate buttons and cards
- Escape to close modals
- Arrow keys for grid navigation (optional enhancement)
- Focus trap in modal dialogs

### Color Contrast

- All text meets WCAG AA standards (4.5:1 ratio)
- Rarity colors have sufficient contrast against backgrounds
- Progress bars use patterns in addition to colors
- Focus indicators clearly visible (2px solid outline)

### Screen Reader Support

```typescript
getAriaLabel(achievement: Achievement): string {
  if (achievement.unlocked) {
    return `${achievement.name}, ${achievement.rarity} achievement, unlocked on ${this.formatDate(achievement.unlockedAt!)}`;
  } else {
    const progress = this.getProgress(achievement);
    return `${achievement.name}, ${achievement.rarity} achievement, locked, ${progress.percentage}% complete`;
  }
}
```

### Reduced Motion

```scss
@media (prefers-reduced-motion: reduce) {
  .achievement-card {
    transition: none;
  }

  .achievement-notification {
    animation: none;
  }

  .progress-fill {
    transition: none;
  }
}
```

---

## Social Sharing Implementation

### Share Image Generation

```typescript
async shareAchievement(achievement: Achievement): Promise<void> {
  // Check if Web Share API is available
  if (navigator.share) {
    try {
      await navigator.share({
        title: `Achievement Unlocked: ${achievement.name}`,
        text: `I just unlocked the "${achievement.name}" achievement in English Practice! ${achievement.description}`,
        url: window.location.origin + '/achievements'
      });
    } catch (error) {
      console.error('Error sharing:', error);
      this.fallbackShare(achievement);
    }
  } else {
    this.fallbackShare(achievement);
  }
}

private fallbackShare(achievement: Achievement): void {
  // Generate shareable image using Canvas API
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d')!;

  // Draw background
  ctx.fillStyle = this.getRarityColor(achievement.rarity);
  ctx.fillRect(0, 0, 1200, 630);

  // Draw achievement icon
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 400, 150, 400, 400);
    
    // Draw text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Achievement Unlocked!', 600, 80);
    
    ctx.font = 'bold 64px Arial';
    ctx.fillText(achievement.name, 600, 580);

    // Convert to blob and download
    canvas.toBlob(blob => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `achievement-${achievement.id}.png`;
        link.click();
        URL.revokeObjectURL(url);
      }
    });
  };
  img.src = achievement.iconUrl;
}

private getRarityColor(rarity: RarityLevel): string {
  const colors = {
    common: '#6B7280',
    rare: '#3B82F6',
    epic: '#8B5CF6',
    legendary: '#F59E0B'
  };
  return colors[rarity];
}
```

---

## Migration Path

Since this is a new feature, no data migration is required. However:

1. **First-time users**: Initialize with empty achievement data
2. **Existing users**: Evaluate all achievements based on existing progress data on first load
3. **Backward compatibility**: Ensure existing `UserProgress` data structure is not affected

### Initial Evaluation for Existing Users

```typescript
private performInitialEvaluation(): void {
  const userData = this.loadUserData();
  
  // Check if this is the first time loading achievements
  if (userData.unlockedAchievements.length === 0 && userData.lastEvaluated.getTime() === 0) {
    const progress = this.progressService.getUserProgress();
    
    // Evaluate all achievements without showing notifications
    this.evaluateAchievementsQuietly(progress);
  }
}

private evaluateAchievementsQuietly(progress: UserProgress): void {
  this.allAchievements().forEach(achievement => {
    if (!achievement.unlocked && this.checkCriteria(achievement, progress)) {
      this.unlockAchievement(achievement.id);
      // Don't show notifications for retroactive unlocks
    }
  });
}
```

---

## Future Enhancements

1. **Custom Achievements**: Allow users to create personal goals
2. **Achievement Leaderboards**: Compare with friends or global rankings
3. **Seasonal Achievements**: Limited-time achievements for special events
4. **Achievement Chains**: Unlock special achievements by completing related sets
5. **Achievement Statistics**: Detailed analytics on achievement progress
6. **Achievement Recommendations**: Suggest next achievements to pursue
7. **Social Features**: View friends' achievements and compete
8. **Achievement Notifications**: Email/push notifications for unlocks
9. **Achievement Export**: Export achievement data for portfolio
10. **Achievement Badges**: Display badges on profile and in forums

---

## Dependencies

### New Dependencies

No new external dependencies required. Uses existing Angular features:
- Angular Signals (built-in)
- Angular Animations (built-in)
- LocalStorage API (browser native)
- Canvas API (browser native)
- Web Share API (browser native, with fallback)

### Existing Dependencies (No Changes)

- Angular 20
- RxJS 7.8
- TypeScript 5.9
- Tailwind CSS 3.4

---

## File Structure

```
src/app/
├── components/
│   ├── achievements/
│   │   ├── achievements.ts
│   │   ├── achievements.html
│   │   ├── achievements.scss
│   │   ├── achievement-card/
│   │   │   ├── achievement-card.ts
│   │   │   ├── achievement-card.html
│   │   │   └── achievement-card.scss
│   │   ├── achievement-detail-modal/
│   │   │   ├── achievement-detail-modal.ts
│   │   │   ├── achievement-detail-modal.html
│   │   │   └── achievement-detail-modal.scss
│   │   ├── achievement-filters/
│   │   │   ├── achievement-filters.ts
│   │   │   ├── achievement-filters.html
│   │   │   └── achievement-filters.scss
│   │   ├── achievement-notification/
│   │   │   ├── achievement-notification.ts
│   │   │   ├── achievement-notification.html
│   │   │   └── achievement-notification.scss
│   │   └── achievement-showcase/
│   │       ├── achievement-showcase.ts
│   │       ├── achievement-showcase.html
│   │       └── achievement-showcase.scss
│   └── profile/ (existing - enhanced)
│       └── profile.ts (integrate AchievementShowcaseComponent)
├── services/
│   ├── achievement.service.ts
│   ├── notification.service.ts
│   └── reward.service.ts
├── models/
│   └── achievement.model.ts
└── assets/
    └── achievements/
        ├── first-step.svg
        ├── getting-started.svg
        ├── dedicated-learner.svg
        ├── master-student.svg
        ├── legend.svg
        ├── week-warrior.svg
        ├── month-master.svg
        ├── unstoppable.svg
        ├── perfect-score.svg
        ├── grammar-guru.svg
        ├── vocabulary-virtuoso.svg
        ├── speed-demon.svg
        ├── category-*.svg (20+ category icons)
        ├── ultimate-master.svg
        └── default.svg
```

---

## Estimated Effort Breakdown

- **Achievement Models & Definitions**: 0.5 days
- **AchievementService**: 2 days
- **NotificationService**: 0.5 days
- **RewardService**: 0.5 days
- **AchievementsComponent**: 1 day
- **AchievementCardComponent**: 0.5 days
- **AchievementDetailModalComponent**: 1 day
- **AchievementNotificationComponent**: 0.5 days
- **AchievementShowcaseComponent**: 0.5 days
- **AchievementFiltersComponent**: 0.5 days
- **Profile Integration**: 0.5 days
- **Social Sharing**: 0.5 days
- **Achievement Icons (SVG creation)**: 1 day
- **Styling & Responsive Design**: 1 day
- **Testing**: 1 day
- **Documentation**: 0.5 days

**Total**: 12 days

---

## Success Metrics

- Achievement evaluation completes in < 100ms
- Notifications display within 200ms of unlock
- Zero accessibility violations (AXE scan)
- 100% test coverage for AchievementService
- All achievements unlockable through normal gameplay
- Positive user feedback on motivation and engagement
- Increased daily active users and session duration

---

## Integration Points

### ProgressService Integration

```typescript
// In ProgressService.recordAttempt()
recordAttempt(attempt: ExerciseAttempt): void {
  // ... existing code ...
  
  // Trigger achievement evaluation
  this.achievementService.evaluateAchievements(updated);
}
```

### Profile Component Integration

```typescript
// In ProfileComponent template
<app-achievement-showcase [userId]="currentUser()?.uid" />
```

### Header Component Integration

```typescript
// Add achievement count badge
<a routerLink="/achievements" class="achievement-link">
  <span class="icon">🏆</span>
  @if (achievementCount() > 0) {
    <span class="badge">{{ achievementCount() }}</span>
  }
</a>
```

### Route Configuration

```typescript
// In app.routes.ts
{
  path: 'achievements',
  loadComponent: () => import('./components/achievements/achievements')
    .then(m => m.AchievementsComponent)
}
```
