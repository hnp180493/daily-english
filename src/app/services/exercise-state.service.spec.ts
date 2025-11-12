import { TestBed } from '@angular/core/testing';
import { ExerciseStateService } from './exercise-state.service';

describe('ExerciseStateService - Penalty Tracking', () => {
  let service: ExerciseStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExerciseStateService);
  });

  it('should create the service', () => {
    expect(service).toBeTruthy();
  });

  describe('incrementIncorrectAttempt', () => {
    it('should increment incorrect attempts for a sentence', () => {
      service.initializeSentences('Hello world. How are you?');
      
      service.incrementIncorrectAttempt(0);
      
      const sentences = service.sentences();
      expect(sentences[0].incorrectAttempts).toBe(1);
    });

    it('should increment incorrect attempts multiple times', () => {
      service.initializeSentences('Hello world.');
      
      service.incrementIncorrectAttempt(0);
      service.incrementIncorrectAttempt(0);
      service.incrementIncorrectAttempt(0);
      
      const sentences = service.sentences();
      expect(sentences[0].incorrectAttempts).toBe(3);
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count for a sentence', () => {
      service.initializeSentences('Hello world. How are you?');
      
      service.incrementRetryCount(0);
      
      const sentences = service.sentences();
      expect(sentences[0].retryCount).toBe(1);
    });

    it('should increment retry count multiple times', () => {
      service.initializeSentences('Hello world.');
      
      service.incrementRetryCount(0);
      service.incrementRetryCount(0);
      
      const sentences = service.sentences();
      expect(sentences[0].retryCount).toBe(2);
    });
  });

  describe('getPenaltyMetrics', () => {
    it('should return zero penalties for new exercise', () => {
      service.initializeSentences('Hello world. How are you?');
      
      const metrics = service.getPenaltyMetrics();
      
      expect(metrics.totalIncorrectAttempts).toBe(0);
      expect(metrics.totalRetries).toBe(0);
    });

    it('should calculate total incorrect attempts across all sentences', () => {
      service.initializeSentences('Hello world. How are you? Nice day.');
      
      service.incrementIncorrectAttempt(0);
      service.incrementIncorrectAttempt(0);
      service.incrementIncorrectAttempt(1);
      
      const metrics = service.getPenaltyMetrics();
      
      expect(metrics.totalIncorrectAttempts).toBe(3);
    });

    it('should calculate total retries across all sentences', () => {
      service.initializeSentences('Hello world. How are you?');
      
      service.incrementRetryCount(0);
      service.incrementRetryCount(1);
      service.incrementRetryCount(1);
      
      const metrics = service.getPenaltyMetrics();
      
      expect(metrics.totalRetries).toBe(3);
    });

    it('should calculate both incorrect attempts and retries', () => {
      service.initializeSentences('Hello world. How are you?');
      
      service.incrementIncorrectAttempt(0);
      service.incrementIncorrectAttempt(0);
      service.incrementRetryCount(0);
      service.incrementIncorrectAttempt(1);
      service.incrementRetryCount(1);
      
      const metrics = service.getPenaltyMetrics();
      
      expect(metrics.totalIncorrectAttempts).toBe(3);
      expect(metrics.totalRetries).toBe(2);
    });
  });
});
