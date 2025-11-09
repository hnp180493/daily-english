import { Injectable } from '@angular/core';
import { Achievement, AchievementType } from '../models/achievement.model';
import { UserProgress, UserProgressHelper } from '../models/exercise.model';
import { ACHIEVEMENT_THRESHOLDS, PERFORMANCE_CRITERIA } from '../models/achievement-config';
import * as Utils from '../utils/achievement-utils';

/**
 * Service for evaluating achievement criteria
 * All methods are pure functions with no side effects
 */
@Injectable({
  providedIn: 'root'
})
export class AchievementCriteriaService {
  /**
   * Main method to check if achievement criteria are met
   */
  checkCriteria(achievement: Achievement, progress: UserProgress): boolean {
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

  /**
   * Check milestone achievement criteria
   */
  checkMilestoneCriteria(achievement: Achievement, progress: UserProgress): boolean {
    if (!progress.exerciseHistory) {
      return false;
    }

    const exerciseCount = UserProgressHelper.getAttemptsCount(progress);
    const threshold = ACHIEVEMENT_THRESHOLDS.milestone[achievement.id as keyof typeof ACHIEVEMENT_THRESHOLDS.milestone];

    // Special milestone achievements
    if (achievement.id === 'half-century') {
      return this.checkHalfCenturyCriteria(progress);
    }

    if (achievement.id === 'diversity-champion') {
      return this.checkDiversityChampionCriteria(progress);
    }

    return exerciseCount >= (threshold || 0);
  }

  /**
   * Check if any category has 50+ exercises
   */
  private checkHalfCenturyCriteria(progress: UserProgress): boolean {
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    const categoryGroups = Utils.groupAttemptsByCategory(allAttempts);

    for (const attempts of categoryGroups.values()) {
      if (attempts.length >= 50) return true;
    }
    return false;
  }

  /**
   * Check if user has 10+ exercises in ALL 8 categories
   */
  private checkDiversityChampionCriteria(progress: UserProgress): boolean {
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    const categoryGroups = Utils.groupAttemptsByCategory(allAttempts);

    const categoriesWith10Plus = Array.from(categoryGroups.values()).filter(
      (attempts) => attempts.length >= 10
    ).length;

    return categoriesWith10Plus >= 8;
  }

  /**
   * Check streak achievement criteria
   */
  checkStreakCriteria(achievement: Achievement, progress: UserProgress): boolean {
    if (typeof progress.currentStreak !== 'number') {
      return false;
    }

    const currentStreak = progress.currentStreak;
    const threshold = ACHIEVEMENT_THRESHOLDS.streak[achievement.id as keyof typeof ACHIEVEMENT_THRESHOLDS.streak];

    // Special handling for weekend-warrior (simplified)
    if (achievement.id === 'weekend-warrior') {
      return currentStreak >= 14;
    }

    // Special handling for comeback-streak (simplified)
    if (achievement.id === 'comeback-streak') {
      return currentStreak >= 7;
    }

    return currentStreak >= (threshold || 0);
  }

  /**
   * Check performance achievement criteria
   */
  checkPerformanceCriteria(achievement: Achievement, progress: UserProgress): boolean {
    if (!progress.exerciseHistory) {
      return false;
    }

    switch (achievement.id) {
      case 'perfect-score':
        return this.checkPerfectScore(progress);
      case 'perfectionist':
        return this.checkPerfectionist(progress);
      case 'flawless-master':
        return this.checkFlawlessMaster(progress);
      case 'grammar-guru':
        return this.checkGrammarGuru(progress);
      case 'vocabulary-virtuoso':
        return this.checkVocabularyVirtuoso(progress);
      case 'speed-demon':
        return this.checkSpeedDemon(progress);
      case 'high-achiever':
        return this.checkHighAchiever(progress);
      case 'elite-scholar':
        return this.checkEliteScholar(progress);
      case 'no-hints-hero':
        return this.checkNoHintsHero(progress);
      case 'advanced-master':
        return this.checkAdvancedMaster(progress);
      case 'comeback-king':
        return this.checkComebackKing(progress);
      case 'marathon-runner':
        return this.checkMarathonRunner(progress);
      case 'ultra-marathon':
        return this.checkUltraMarathon(progress);
      case 'early-bird':
        return this.checkEarlyBird(progress);
      case 'night-owl':
        return this.checkNightOwl(progress);
      case 'consistency-king':
        return this.checkConsistencyKing(progress);
      case 'rapid-learner':
        return this.checkRapidLearner(progress);
      case 'error-free-streak':
        return this.checkErrorFreeStreak(progress);
      case 'improvement-master':
        return this.checkImprovementMaster(progress);
      default:
        return false;
    }
  }

  private checkPerfectScore(progress: UserProgress): boolean {
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    return allAttempts.some(
      (a) => Utils.hasValidScore(a) && a.accuracyScore === PERFORMANCE_CRITERIA.perfectScore
    );
  }

  private checkPerfectionist(progress: UserProgress): boolean {
    const threshold = ACHIEVEMENT_THRESHOLDS.performance.perfectionist;
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    return Utils.countPerfectScores(allAttempts) >= threshold;
  }

  private checkFlawlessMaster(progress: UserProgress): boolean {
    const threshold = ACHIEVEMENT_THRESHOLDS.performance['flawless-master'];
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    return Utils.countPerfectScores(allAttempts) >= threshold;
  }

  private checkGrammarGuru(progress: UserProgress): boolean {
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    return allAttempts.some((a) => {
      if (!Utils.isValidAttempt(a)) return false;
      const grammarErrors = Utils.countGrammarErrors(a);
      return grammarErrors === 0 && a.accuracyScore >= PERFORMANCE_CRITERIA.highAccuracy;
    });
  }

  private checkVocabularyVirtuoso(progress: UserProgress): boolean {
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    return allAttempts.some((a) => {
      if (!Utils.isValidAttempt(a)) return false;
      return Utils.hasAdvancedVocabulary(a) && a.accuracyScore >= PERFORMANCE_CRITERIA.goodAccuracy;
    });
  }

  private checkSpeedDemon(progress: UserProgress): boolean {
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    return allAttempts.some((a) => {
      if (!Utils.hasValidScore(a)) return false;
      return a.accuracyScore >= PERFORMANCE_CRITERIA.highAccuracy;
    });
  }

  private checkHighAchiever(progress: UserProgress): boolean {
    const config = ACHIEVEMENT_THRESHOLDS.performance['high-achiever'];
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    if (allAttempts.length < config.exercises) return false;

    const last50 = allAttempts.slice(-config.exercises);
    const validLast50 = last50.filter(Utils.hasValidScore);
    if (validLast50.length < config.exercises) return false;

    const avg = Utils.calculateAverageScore(validLast50);
    return avg >= config.average;
  }

  private checkEliteScholar(progress: UserProgress): boolean {
    const config = ACHIEVEMENT_THRESHOLDS.performance['elite-scholar'];
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    if (allAttempts.length < config.exercises) return false;

    const last200 = allAttempts.slice(-config.exercises);
    const validLast200 = last200.filter(Utils.hasValidScore);
    if (validLast200.length < config.exercises) return false;

    const avg = Utils.calculateAverageScore(validLast200);
    return avg >= config.average;
  }

  private checkNoHintsHero(progress: UserProgress): boolean {
    const config = ACHIEVEMENT_THRESHOLDS.performance['no-hints-hero'];
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    return (
      allAttempts.filter(
        (a) =>
          Utils.isValidAttempt(a) &&
          a.hintsUsed === 0 &&
          a.accuracyScore >= config.minAccuracy
      ).length >= config.exercises
    );
  }

  private checkAdvancedMaster(progress: UserProgress): boolean {
    const config = ACHIEVEMENT_THRESHOLDS.performance['advanced-master'];
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    return (
      allAttempts.filter(
        (a) => Utils.hasValidScore(a) && a.accuracyScore >= config.minAccuracy
      ).length >= config.exercises
    );
  }

  private checkComebackKing(progress: UserProgress): boolean {
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    const exerciseGroups = Utils.groupAttemptsByExercise(allAttempts);
    const threshold = ACHIEVEMENT_THRESHOLDS.performance['comeback-king'].improvement;

    for (const attempts of exerciseGroups.values()) {
      if (attempts.length >= 2) {
        const scores = attempts.map((a) => a.accuracyScore);
        const improvement = Math.max(...scores) - Math.min(...scores);
        if (improvement >= threshold) return true;
      }
    }
    return false;
  }

  private checkMarathonRunner(progress: UserProgress): boolean {
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    const dailyGroups = Utils.groupAttemptsByDate(allAttempts);
    const threshold = ACHIEVEMENT_THRESHOLDS.performance['marathon-runner'];

    return Array.from(dailyGroups.values()).some(
      (attempts) => attempts.length >= threshold
    );
  }

  private checkUltraMarathon(progress: UserProgress): boolean {
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    const dailyGroups = Utils.groupAttemptsByDate(allAttempts);
    const threshold = ACHIEVEMENT_THRESHOLDS.performance['ultra-marathon'];

    return Array.from(dailyGroups.values()).some(
      (attempts) => attempts.length >= threshold
    );
  }

  private checkEarlyBird(progress: UserProgress): boolean {
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    const earlyDays = new Set(
      allAttempts
        .filter((a) => {
          if (!Utils.isValidAttempt(a) || !a.timestamp) return false;
          const attemptDate = new Date(a.timestamp);
          return (
            !isNaN(attemptDate.getTime()) &&
            attemptDate.getHours() < PERFORMANCE_CRITERIA.earlyBirdHour
          );
        })
        .map((a) => Utils.getDateString(new Date(a.timestamp)))
    );
    return earlyDays.size >= ACHIEVEMENT_THRESHOLDS.performance['early-bird'];
  }

  private checkNightOwl(progress: UserProgress): boolean {
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    const lateDays = new Set(
      allAttempts
        .filter((a) => {
          if (!Utils.isValidAttempt(a) || !a.timestamp) return false;
          const attemptDate = new Date(a.timestamp);
          return (
            !isNaN(attemptDate.getTime()) &&
            attemptDate.getHours() >= PERFORMANCE_CRITERIA.nightOwlHour
          );
        })
        .map((a) => Utils.getDateString(new Date(a.timestamp)))
    );
    return lateDays.size >= ACHIEVEMENT_THRESHOLDS.performance['night-owl'];
  }

  private checkConsistencyKing(progress: UserProgress): boolean {
    const config = ACHIEVEMENT_THRESHOLDS.performance['consistency-king'];
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    if (allAttempts.length < config.exercises) return false;

    const last20 = allAttempts.slice(-config.exercises);
    return last20.every((a) => Utils.hasValidScore(a) && a.accuracyScore >= config.minAccuracy);
  }

  private checkRapidLearner(progress: UserProgress): boolean {
    const config = ACHIEVEMENT_THRESHOLDS.performance['rapid-learner'];
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    return (
      allAttempts.filter(
        (a) => Utils.hasValidScore(a) && a.accuracyScore >= config.minAccuracy
      ).length >= config.exercises
    );
  }

  private checkErrorFreeStreak(progress: UserProgress): boolean {
    const config = ACHIEVEMENT_THRESHOLDS.performance['error-free-streak'];
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    if (allAttempts.length < config.exercises) return false;

    const last5 = allAttempts.slice(-config.exercises);
    return last5.every((a) => {
      if (!Utils.isValidAttempt(a)) return false;
      const grammarErrors = Utils.countGrammarErrors(a);
      return grammarErrors === 0 && a.accuracyScore >= config.minAccuracy;
    });
  }

  private checkImprovementMaster(progress: UserProgress): boolean {
    const allAttempts = UserProgressHelper.getAllAttempts(progress);
    const exerciseGroups = Utils.groupAttemptsByExercise(allAttempts);
    const threshold = ACHIEVEMENT_THRESHOLDS.performance['improvement-master'];
    let improvedCount = 0;

    for (const attempts of exerciseGroups.values()) {
      if (attempts.length >= 2) {
        const scores = attempts.map((a) => a.accuracyScore);
        if (Math.max(...scores) > Math.min(...scores)) {
          improvedCount++;
        }
      }
    }

    return improvedCount >= threshold;
  }

  /**
   * Check category master achievement criteria
   * Note: This method needs access to all achievements to check unlocked status
   * For now, it only checks exercise count requirements
   */
  checkCategoryMasterCriteria(
    achievement: Achievement,
    progress: UserProgress
  ): boolean {
    if (!progress.exerciseHistory) {
      return false;
    }

    // Individual category master achievements (e.g., 'master-daily-life')
    if (achievement.id.startsWith('master-') && !achievement.id.includes('-master-')) {
      const targetCategory = achievement.id.replace('master-', '');
      const allAttempts = UserProgressHelper.getAllAttempts(progress);
      const categoryAttempts = allAttempts.filter((attempt) => {
        if (!Utils.isValidAttempt(attempt)) return false;
        const category =
          attempt.category || Utils.extractCategoryFromExerciseId(attempt.exerciseId);
        return category === targetCategory;
      });

      const threshold = ACHIEVEMENT_THRESHOLDS.category.masterRequirement;
      return categoryAttempts.length >= threshold;
    }

    // Special category achievements need access to unlocked achievements
    // These will be handled by the main service
    return false;
  }
}
