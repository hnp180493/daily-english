export interface LearningPath {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  durationWeeks: number;
  description: string;
  modules: LearningModule[];
  unlockRequirement?: string;
}

export interface LearningModule {
  id: string;
  name: string;
  weekRange: string;
  startWeek: number;
  endWeek: number;
  topics: string[];
  exerciseIds: string[];
  translationSupport: 'full' | 'partial' | 'minimal' | 'none';
  requiredScore?: number;
}

export interface UserPathProgress {
  userId: string;
  currentPathId: string;
  currentModuleId: string;
  startDate: Date;
  completedModules: string[];
  moduleProgress: { [moduleId: string]: ModuleProgress };
  pathCompletions: PathCompletion[];
  migrationCompleted?: boolean;
}

export interface ModuleProgress {
  moduleId: string;
  completedExercises: string[];
  averageScore: number;
  totalExercises: number;
  completionPercentage: number;
  unlocked: boolean;
  totalPoints: number;
}

export interface PathCompletion {
  pathId: string;
  pathName: string;
  completedAt: Date;
  finalScore: number;
  certificateId: string;
  modulesCompleted: number;
  totalPoints: number;
}
