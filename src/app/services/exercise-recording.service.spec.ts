import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ExerciseRecordingService } from './exercise-recording.service';
import { ProgressService } from './progress.service';
import { ExerciseValidationService } from './exercise-validation.service';
import { PointsAnimationService } from './points-animation.service';
import { ExerciseStateService } from './exercise-state.service';
import { DifficultyLevel, Exercise, ExerciseCategory } from '../models/exercise.model';
import { PENALTY_CONSTANTS } from '../models/penalty.constants';

const { INCORRECT_ATTEMPT_PENALTY, RETRY_PENALTY } = PENALTY_CONSTANTS;

function makeExercise(id: string, sourceText: string): Exercise {
  return {
    id,
    title: 'Test Exercise',
    level: DifficultyLevel.BEGINNER,
    category: ExerciseCategory.DAILY_LIFE,
    description: 'Test description',
    sourceText,
    englishText: sourceText,
    highlightedSentences: [],
    hints: []
  };
}

describe('ExerciseRecordingService - Penalty Calculation', () => {
  let service: ExerciseRecordingService;
  let stateService: ExerciseStateService;
  let progressService: jasmine.SpyObj<ProgressService>;
  let validationService: jasmine.SpyObj<ExerciseValidationService>;

  beforeEach(() => {
    const progressSpy = jasmine.createSpyObj('ProgressService', ['getExerciseStatus', 'recordAttempt']);
    const validationSpy = jasmine.createSpyObj('ExerciseValidationService', ['calculateAverageAccuracy']);
    const pointsSpy = jasmine.createSpyObj('PointsAnimationService', ['triggerPointsAnimation']);

    TestBed.configureTestingModule({
      providers: [
        ExerciseRecordingService,
        ExerciseStateService,
        { provide: ProgressService, useValue: progressSpy },
        { provide: ExerciseValidationService, useValue: validationSpy },
        { provide: PointsAnimationService, useValue: pointsSpy }
      ]
    });

    service = TestBed.inject(ExerciseRecordingService);
    stateService = TestBed.inject(ExerciseStateService);
    progressService = TestBed.inject(ProgressService) as jasmine.SpyObj<ProgressService>;
    validationService = TestBed.inject(ExerciseValidationService) as jasmine.SpyObj<ExerciseValidationService>;

    progressService.getExerciseStatus.and.returnValue({ status: 'new', attemptCount: 0 });
  });

  it('should create the service', () => {
    expect(service).toBeTruthy();
  });

  it('should calculate penalty with incorrect attempts', fakeAsync(() => {
    const exercise = makeExercise('test-1', 'Hello world. How are you?');

    stateService.initializeSentences(exercise.sourceText);
    stateService.incrementIncorrectAttempt(0);
    stateService.incrementIncorrectAttempt(0);
    // Score < 90 adds one more incorrect attempt (total 3 on sentence 0)
    stateService.markSentenceCompleted(0, 'Hello world', 85, undefined);
    stateService.markSentenceCompleted(1, 'How are you', 95, undefined);

    validationService.calculateAverageAccuracy.and.returnValue(90);

    // pointsEarned > 0 defers recording by 500ms (no .stat-item in DOM => no animation)
    service.recordAttempt(exercise, 0, 10);
    expect(progressService.recordAttempt).not.toHaveBeenCalled();
    tick(500);

    expect(progressService.recordAttempt).toHaveBeenCalled();
    const recordedAttempt = progressService.recordAttempt.calls.mostRecent().args[0];

    const expectedPenalty = 3 * INCORRECT_ATTEMPT_PENALTY;
    expect(recordedAttempt.baseScore).toBe(90);
    expect(recordedAttempt.totalIncorrectAttempts).toBe(3);
    expect(recordedAttempt.totalRetries).toBe(0);
    expect(recordedAttempt.totalPenalty).toBe(expectedPenalty);
    expect(recordedAttempt.accuracyScore).toBe(90 - expectedPenalty);
    expect(recordedAttempt.attemptNumber).toBe(1);
    expect(recordedAttempt.pointsEarned).toBe(10);
    expect(recordedAttempt.userInput).toBe('Hello world How are you');
  }));

  it('should calculate penalty with retries', fakeAsync(() => {
    const exercise = makeExercise('test-2', 'Hello world.');

    stateService.initializeSentences(exercise.sourceText);
    stateService.incrementRetryCount(0);
    stateService.markSentenceCompleted(0, 'Hello world', 95, undefined);

    validationService.calculateAverageAccuracy.and.returnValue(95);

    service.recordAttempt(exercise, 0, 10);
    tick(500);

    expect(progressService.recordAttempt).toHaveBeenCalled();
    const recordedAttempt = progressService.recordAttempt.calls.mostRecent().args[0];

    expect(recordedAttempt.baseScore).toBe(95);
    expect(recordedAttempt.totalIncorrectAttempts).toBe(0);
    expect(recordedAttempt.totalRetries).toBe(1);
    expect(recordedAttempt.totalPenalty).toBe(RETRY_PENALTY);
    expect(recordedAttempt.accuracyScore).toBe(95 - RETRY_PENALTY);
  }));

  it('should clamp final score to minimum of 0', () => {
    const exercise = makeExercise('test-3', 'Hello world.');

    stateService.initializeSentences(exercise.sourceText);

    for (let i = 0; i < 10; i++) {
      stateService.incrementIncorrectAttempt(0);
    }
    for (let i = 0; i < 5; i++) {
      stateService.incrementRetryCount(0);
    }

    // Score < 90 adds one more incorrect attempt (total 11)
    stateService.markSentenceCompleted(0, 'Hello world', 50, undefined);

    validationService.calculateAverageAccuracy.and.returnValue(50);

    // pointsEarned === 0 records synchronously
    service.recordAttempt(exercise, 0, 0);

    expect(progressService.recordAttempt).toHaveBeenCalled();
    const recordedAttempt = progressService.recordAttempt.calls.mostRecent().args[0];

    expect(recordedAttempt.totalIncorrectAttempts).toBe(11);
    expect(recordedAttempt.totalRetries).toBe(5);
    expect(recordedAttempt.totalPenalty).toBe(11 * INCORRECT_ATTEMPT_PENALTY + 5 * RETRY_PENALTY);
    expect(recordedAttempt.accuracyScore).toBe(0);
  });
});
