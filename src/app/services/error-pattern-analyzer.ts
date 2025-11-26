import { Injectable } from '@angular/core';
import {
  ErrorPattern,
  WeakPoint,
  GrammarLesson,
  VocabularyDrill
} from '../models/review.model';
import { ExerciseAttempt, FeedbackItem, Exercise } from '../models/exercise.model';

@Injectable({
  providedIn: 'root'
})
export class ErrorPatternAnalyzer {
  /**
   * Analyzes feedback from multiple exercise attempts to identify recurring error patterns
   */
  analyzePatterns(attempts: ExerciseAttempt[]): ErrorPattern[] {
    const errorMap = new Map<string, ErrorPattern>();

    // Collect all feedback items from all attempts
    attempts.forEach(attempt => {
      const feedbackItems = this.extractAllFeedback(attempt);

      feedbackItems.forEach(feedback => {
        // Skip suggestion type as it's not an error
        if (feedback.type === 'suggestion') return;
        
        const key = this.generatePatternKey(feedback);
        
        if (errorMap.has(key)) {
          const existing = errorMap.get(key)!;
          existing.frequency++;
          if (!existing.affectedExercises.includes(attempt.exerciseId)) {
            existing.affectedExercises.push(attempt.exerciseId);
          }
          existing.examples.push(feedback);
        } else {
          errorMap.set(key, {
            id: this.generatePatternId(feedback),
            type: feedback.type,
            description: this.generatePatternDescription(feedback),
            frequency: 1,
            affectedExercises: [attempt.exerciseId],
            examples: [feedback],
            grammarRule: feedback.type === 'grammar' ? this.extractGrammarRule(feedback) : undefined,
            vocabularyWords: feedback.type === 'vocabulary' ? this.extractVocabularyWords(feedback) : undefined
          });
        }
      });
    });

    // Filter patterns that occur 3 or more times (as per requirements)
    return Array.from(errorMap.values())
      .filter(pattern => pattern.frequency >= 3)
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Identifies weak points from error patterns
   */
  identifyWeakPoints(patterns: ErrorPattern[]): WeakPoint[] {
    const weakPointMap = new Map<string, WeakPoint>();

    patterns.forEach(pattern => {
      const category = this.categorizePattern(pattern);
      const key = `${category}-${pattern.type}`;

      if (weakPointMap.has(key)) {
        const existing = weakPointMap.get(key)!;
        existing.errorCount += pattern.frequency;
        existing.relatedPatterns.push(pattern.id);
        // Update last occurrence if this pattern is more recent
        const patternDate = this.getLatestOccurrence(pattern);
        if (patternDate > existing.lastOccurrence) {
          existing.lastOccurrence = patternDate;
        }
      } else {
        weakPointMap.set(key, {
          id: this.generateWeakPointId(category, pattern.type),
          category,
          description: this.generateWeakPointDescription(category, pattern.type),
          errorCount: pattern.frequency,
          lastOccurrence: this.getLatestOccurrence(pattern),
          improvementRate: 0, // Will be calculated over time
          relatedPatterns: [pattern.id]
        });
      }
    });

    return Array.from(weakPointMap.values())
      .sort((a, b) => b.errorCount - a.errorCount);
  }

  /**
   * Suggests grammar lessons based on weak points
   */
  suggestGrammarLessons(weakPoint: WeakPoint): GrammarLesson[] {
    const lessons: GrammarLesson[] = [];

    // Map weak point categories to grammar lessons
    const lessonMap: { [key: string]: GrammarLesson } = {
      'verb-tense': {
        id: 'lesson-verb-tense',
        title: 'Verb Tenses',
        description: 'Master the correct usage of past, present, and future tenses',
        rule: 'Use present tense for current actions, past tense for completed actions, and future tense for upcoming actions',
        examples: [
          'I walk to school every day (present)',
          'I walked to school yesterday (past)',
          'I will walk to school tomorrow (future)'
        ],
        relatedErrorPattern: weakPoint.id
      },
      'subject-verb-agreement': {
        id: 'lesson-subject-verb',
        title: 'Subject-Verb Agreement',
        description: 'Learn how subjects and verbs must agree in number',
        rule: 'Singular subjects take singular verbs, plural subjects take plural verbs',
        examples: [
          'She walks to school (singular)',
          'They walk to school (plural)',
          'The dog runs fast (singular)',
          'The dogs run fast (plural)'
        ],
        relatedErrorPattern: weakPoint.id
      },
      'article-usage': {
        id: 'lesson-articles',
        title: 'Article Usage (a, an, the)',
        description: 'Understand when to use definite and indefinite articles',
        rule: 'Use "a" before consonant sounds, "an" before vowel sounds, "the" for specific items',
        examples: [
          'I saw a cat (indefinite)',
          'I saw an elephant (indefinite, vowel sound)',
          'I saw the cat from yesterday (definite)'
        ],
        relatedErrorPattern: weakPoint.id
      },
      'preposition': {
        id: 'lesson-prepositions',
        title: 'Prepositions',
        description: 'Learn correct preposition usage for time, place, and direction',
        rule: 'Prepositions show relationships between words in a sentence',
        examples: [
          'I arrive at 5 PM (time)',
          'The book is on the table (place)',
          'She walked to the store (direction)'
        ],
        relatedErrorPattern: weakPoint.id
      },
      'pronoun': {
        id: 'lesson-pronouns',
        title: 'Pronoun Usage',
        description: 'Master subject, object, and possessive pronouns',
        rule: 'Use the correct pronoun form based on its function in the sentence',
        examples: [
          'I like pizza (subject)',
          'She gave it to me (object)',
          'This is my book (possessive)'
        ],
        relatedErrorPattern: weakPoint.id
      }
    };

    // Match weak point category to lessons
    const category = weakPoint.category.toLowerCase();
    for (const [key, lesson] of Object.entries(lessonMap)) {
      if (category.includes(key)) {
        lessons.push(lesson);
      }
    }

    // If no specific match, provide a general lesson
    if (lessons.length === 0 && weakPoint.category.includes('grammar')) {
      lessons.push({
        id: 'lesson-general-grammar',
        title: 'General Grammar Review',
        description: 'Review fundamental grammar concepts',
        rule: 'Focus on sentence structure, word order, and basic grammar rules',
        examples: [
          'Subject + Verb + Object: I eat apples',
          'Use correct punctuation and capitalization',
          'Maintain consistent tense throughout sentences'
        ],
        relatedErrorPattern: weakPoint.id
      });
    }

    return lessons;
  }

  /**
   * Generates vocabulary drills for specific weak points
   */
  generateVocabularyDrill(weakPoint: WeakPoint): VocabularyDrill {
    // Extract vocabulary words from the weak point description
    const words = this.extractWordsFromWeakPoint(weakPoint);

    return {
      id: `drill-${weakPoint.id}`,
      words,
      exercises: [], // Will be populated with custom exercises
      targetWeakPoint: weakPoint.id
    };
  }

  // Private helper methods

  private extractAllFeedback(attempt: ExerciseAttempt): FeedbackItem[] {
    const allFeedback: FeedbackItem[] = [];

    // Extract feedback from sentence attempts
    if (attempt.sentenceAttempts) {
      attempt.sentenceAttempts.forEach(sentenceAttempt => {
        allFeedback.push(...sentenceAttempt.feedback);
      });
    }

    return allFeedback;
  }

  private generatePatternKey(feedback: FeedbackItem): string {
    // Create a key based on type and the nature of the error
    const errorNature = this.extractErrorNature(feedback);
    return `${feedback.type}-${errorNature}`;
  }

  private extractErrorNature(feedback: FeedbackItem): string {
    // Extract the core nature of the error from the explanation
    const explanation = feedback.explanation.toLowerCase();

    // Common error patterns
    if (explanation.includes('tense')) return 'verb-tense';
    if (explanation.includes('subject') && explanation.includes('verb')) return 'subject-verb-agreement';
    if (explanation.includes('article') || explanation.includes('a/an/the')) return 'article-usage';
    if (explanation.includes('preposition')) return 'preposition';
    if (explanation.includes('pronoun')) return 'pronoun';
    if (explanation.includes('plural') || explanation.includes('singular')) return 'number-agreement';
    if (explanation.includes('spelling')) return 'spelling';
    if (explanation.includes('word choice') || explanation.includes('vocabulary')) return 'word-choice';
    if (explanation.includes('sentence structure') || explanation.includes('word order')) return 'sentence-structure';

    // Default to generic type
    return feedback.type;
  }

  private generatePatternId(feedback: FeedbackItem): string {
    const errorNature = this.extractErrorNature(feedback);
    return `pattern-${feedback.type}-${errorNature}-${Date.now()}`;
  }

  private generatePatternDescription(feedback: FeedbackItem): string {
    const errorNature = this.extractErrorNature(feedback);
    return `Recurring ${feedback.type} error: ${errorNature.replace(/-/g, ' ')}`;
  }

  private extractGrammarRule(feedback: FeedbackItem): string {
    // Extract or infer grammar rule from explanation
    return feedback.explanation;
  }

  private extractVocabularyWords(feedback: FeedbackItem): string[] {
    // Extract words from original text and suggestion
    return [feedback.originalText, feedback.suggestion].filter(Boolean);
  }

  private categorizePattern(pattern: ErrorPattern): string {
    // Use the error nature from the pattern description
    const description = pattern.description.toLowerCase();
    
    if (description.includes('verb-tense')) return 'Verb Tense';
    if (description.includes('subject-verb-agreement')) return 'Subject-Verb Agreement';
    if (description.includes('article-usage')) return 'Article Usage';
    if (description.includes('preposition')) return 'Preposition';
    if (description.includes('pronoun')) return 'Pronoun';
    if (description.includes('number-agreement')) return 'Number Agreement';
    if (description.includes('spelling')) return 'Spelling';
    if (description.includes('word-choice')) return 'Vocabulary';
    if (description.includes('sentence-structure')) return 'Sentence Structure';

    return `${pattern.type.charAt(0).toUpperCase()}${pattern.type.slice(1)}`;
  }

  private getLatestOccurrence(pattern: ErrorPattern): Date {
    // For now, return current date
    // In a real implementation, this would track actual occurrence dates
    return new Date();
  }

  private generateWeakPointId(category: string, type: string): string {
    return `weakpoint-${category.toLowerCase().replace(/\s+/g, '-')}-${type}`;
  }

  private generateWeakPointDescription(category: string, type: string): string {
    return `Difficulty with ${category} (${type} errors)`;
  }

  private extractWordsFromWeakPoint(weakPoint: WeakPoint): string[] {
    // This would extract specific words from the weak point's related patterns
    // For now, return empty array - will be populated when we have actual pattern data
    return [];
  }
}
