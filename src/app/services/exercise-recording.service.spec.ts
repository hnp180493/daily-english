import { TestBed } from '@angular/core/testing';
import { ExerciseRecordingService } from './exercise-recording.service';
import { ProgressService } from './progress.service';
import { ExerciseValidationService } from './exercise-validation.service';
import { PointsAnimationService } from './points-animation.service';
import { ExerciseStateService } from './exercise-state.service';
import { Exercise } from '../models/exercise.model';

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

  it('should calculate penalty with incorrect attempts', () => {
    const exercise: Exercise = {
      id: 'test-1',
      title: 'Test Exercise',
      category: 'beginner',
      sourceText: 'Hello world. How are you?',
      difficulty: 'easy'
    };

    stateService.initializeSentences(exercise.sourceText);
    stateService.incrementIncorrectAttempt(0);
    stateService.incrementIncorrectAttempt(0);
    stateService.markSentenceCompleted(0, 'Hello world', 85, undefined);
    stateService.markSentenceCompleted(1, 'How are you', 95, undefined);

    validationService.calculateAverageAccuracy.and.returnValue(90);

    service.recordAttempt(exercise, 0, 10);

    expect(progressService.recordAttempt).toHaveBeenCalled();
    const recordedAttempt = progressService.recordAttempt.calls.mostRecent().args[0];

    expect(recordedAttempt.baseScore).toBe(90);
    expect(recordedAttempt.totalIncorrectAttempts).toBe(3);
    expect(recordedAttempt.totalPenalty).toBe(6);
    expect(recordedAttempt.accuracyScore).toBe(84);
  });

  it('should calculate penalty with retries', () => {
    const exercise: Exercise = {
      id: 'test-2',
      title: 'Test Exercise',
      category: 'beginner',
      sourceText: 'Hello world.',
      difficulty: 'easy'
    };

    stateService.initializeSentences(exercise.sourceText);
    stateService.incrementRetryCount(0);
    stateService.markSentenceCompleted(0, 'Hello world', 95, undefined);

    validationService.calculateAverageAccuracy.and.returnValue(95);

    service.recordAttempt(exercise, 0, 10);

    expect(progressService.recordAttempt).toHaveBeenCalled();
    const recordedAttempt = progressService.recordAttempt.calls.mostRecent().args[0];

    expect(recordedAttempt.baseScore).toBe(95);
    expect(recordedAttempt.totalRetries).toBe(1);
    expect(recordedAttempt.totalPenalty).toBe(5);
    expect(recordedAttempt.accuracyScore).toBe(90);
  });

  it('should clamp final score to minimum of 0', () => {
    const exercise: Exercise = {
      id: 'test-3',
      title: 'Test Exercise',
      category: 'beginner',
      sourceText: 'Hello world.',
      difficulty: 'easy'
    };

    stateService.initializeSentences(exercise.sourceText);
    
    for (let i = 0; i < 10; i++) {
      stateService.incrementIncorrectAttempt(0);
    }
    for (let i = 0; i < 5; i++) {
      stateService.incrementRetryCount(0);
    }
    
    stateService.markSentenceCompleted(0, 'Hello world', 50, undefined);

    validationService.calculateAverageAccuracy.and.returnValue(50);

    service.recordAttempt(exercise, 0, 0);

    expect(progressService.recordAttempt).toHaveBeenCalled();
    const recordedAttempt = progressService.recordAttempt.calls.mostRecent().args[0];

    expect(recordedAttempt.totalPenalty).toBe(45);
    expect(recordedAttempt.accuracyScore).toBe(0);
  });
});
