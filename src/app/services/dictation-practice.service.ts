import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  DictationSentence,
  DictationFeedback,
  TextDifference,
  MistakeCategory,
  DictationPracticeAttempt,
  DictationProgress
} from '../models/dictation.model';
import { DatabaseService } from './database/database.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class DictationPracticeService {
  private databaseService = inject(DatabaseService);
  private authService = inject(AuthService);

  /**
   * Get translated text for an exercise from exercise history or englishText
   * Priority: 1) User's completed translation, 2) Exercise's englishText
   */
  getTranslatedText(exerciseId: string, englishText?: string): Observable<string | null> {
    return this.databaseService.loadProgressAuto().pipe(
      map(progress => {
        // Try to get user's completed translation first
        if (progress && progress.exerciseHistory) {
          const attempt = progress.exerciseHistory[exerciseId];
          if (attempt?.userInput) {
            return attempt.userInput;
          }
        }
        
        // Fallback to exercise's englishText if available
        if (englishText) {
          return englishText;
        }
        
        return null;
      }),
      catchError(error => {
        console.error('[DictationPracticeService] Error loading translated text:', error);
        // Still try to return englishText on error
        return of(englishText || null);
      })
    );
  }

  /**
   * Initialize dictation session by splitting translated text into sentences
   */
  initializeDictationSession(exerciseId: string, translatedText: string): DictationSentence[] {
    const sentences = this.splitIntoSentences(translatedText);
    
    return sentences.map(sentence => ({
      original: sentence,
      userInput: '',
      isCompleted: false,
      accuracyScore: 0,
      attempts: 0,
      feedback: null
    }));
  }

  /**
   * Split text into sentences using regex
   */
  private splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries (., !, ?) followed by space or end of string
    // Keep the punctuation with the sentence
    const sentenceRegex = /[^.!?]+[.!?]+/g;
    const sentences = text.match(sentenceRegex);
    
    if (!sentences || sentences.length === 0) {
      // If no sentence boundaries found, return the whole text as one sentence
      return [text.trim()];
    }
    
    // Trim whitespace from each sentence
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  }

  /**
   * Calculate accuracy between user input and original text
   */
  calculateAccuracy(original: string, userInput: string): DictationFeedback {
    // Normalize text for comparison
    const normalizedOriginal = this.normalizeText(original);
    const normalizedInput = this.normalizeText(userInput);
    
    // Calculate character-level accuracy using Levenshtein distance
    const characterAccuracy = this.calculateLevenshteinAccuracy(normalizedOriginal, normalizedInput);
    
    // Calculate word-level accuracy
    const wordAccuracy = this.calculateWordAccuracy(normalizedOriginal, normalizedInput);
    
    // Detect differences using normalized text
    const differences = this.detectDifferences(normalizedOriginal, normalizedInput);
    
    // Categorize mistakes
    const mistakes = this.categorizeMistakes(normalizedOriginal, normalizedInput);
    
    return {
      differences,
      characterAccuracy,
      wordAccuracy,
      mistakes
    };
  }

  /**
   * Normalize text for comparison (trim, lowercase, remove punctuation, expand contractions)
   */
  private normalizeText(text: string): string {
    let normalized = text.trim().toLowerCase();
    
    // Expand contractions to full forms
    normalized = this.expandContractions(normalized);
    
    // Remove all punctuation except apostrophes in contractions
    normalized = normalized.replace(/[.,!?;:"""''()[\]{}—–-]/g, '');
    
    // Normalize whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
  }
  
  /**
   * Expand English contractions to full forms
   */
  private expandContractions(text: string): string {
    const contractions: { [key: string]: string } = {
      "i'm": "i am",
      "you're": "you are",
      "he's": "he is",
      "she's": "she is",
      "it's": "it is",
      "we're": "we are",
      "they're": "they are",
      "i've": "i have",
      "you've": "you have",
      "we've": "we have",
      "they've": "they have",
      "i'll": "i will",
      "you'll": "you will",
      "he'll": "he will",
      "she'll": "she will",
      "it'll": "it will",
      "we'll": "we will",
      "they'll": "they will",
      "i'd": "i would",
      "you'd": "you would",
      "he'd": "he would",
      "she'd": "she would",
      "it'd": "it would",
      "we'd": "we would",
      "they'd": "they would",
      "isn't": "is not",
      "aren't": "are not",
      "wasn't": "was not",
      "weren't": "were not",
      "hasn't": "has not",
      "haven't": "have not",
      "hadn't": "had not",
      "doesn't": "does not",
      "don't": "do not",
      "didn't": "did not",
      "won't": "will not",
      "wouldn't": "would not",
      "shouldn't": "should not",
      "couldn't": "could not",
      "can't": "cannot",
      "cannot": "cannot",
      "mustn't": "must not",
      "mightn't": "might not",
      "needn't": "need not",
      "let's": "let us",
      "that's": "that is",
      "who's": "who is",
      "what's": "what is",
      "where's": "where is",
      "when's": "when is",
      "why's": "why is",
      "how's": "how is",
      "there's": "there is",
      "here's": "here is"
    };
    
    // Replace contractions with full forms
    let expanded = text;
    for (const [contraction, fullForm] of Object.entries(contractions)) {
      const regex = new RegExp(`\\b${contraction}\\b`, 'gi');
      expanded = expanded.replace(regex, fullForm);
    }
    
    return expanded;
  }

  /**
   * Calculate accuracy using Levenshtein distance algorithm
   */
  private calculateLevenshteinAccuracy(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    if (maxLength === 0) return 100;
    
    const accuracy = (1 - (distance / maxLength)) * 100;
    return Math.max(0, Math.min(100, accuracy));
  }

  /**
   * Levenshtein distance algorithm implementation
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    // Create a 2D array for dynamic programming
    const matrix: number[][] = [];
    
    // Initialize first column
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    
    // Initialize first row
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    
    // Fill the matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    
    return matrix[len1][len2];
  }

  /**
   * Calculate word-level accuracy
   */
  private calculateWordAccuracy(original: string, userInput: string): number {
    const originalWords = this.tokenizeWords(original);
    const inputWords = this.tokenizeWords(userInput);
    
    if (originalWords.length === 0) return 100;
    
    let correctWords = 0;
    const minLength = Math.min(originalWords.length, inputWords.length);
    
    for (let i = 0; i < minLength; i++) {
      if (originalWords[i] === inputWords[i]) {
        correctWords++;
      }
    }
    
    return (correctWords / originalWords.length) * 100;
  }

  /**
   * Tokenize text into words
   */
  private tokenizeWords(text: string): string[] {
    return text.split(/\s+/).filter(word => word.length > 0);
  }

  /**
   * Detect differences between original and user input
   */
  private detectDifferences(original: string, userInput: string): TextDifference[] {
    const differences: TextDifference[] = [];
    const originalWords = original.split(/\s+/);
    const inputWords = userInput.split(/\s+/);
    
    const maxLength = Math.max(originalWords.length, inputWords.length);
    let originalIndex = 0;
    let inputIndex = 0;
    
    for (let i = 0; i < maxLength; i++) {
      const originalWord = originalWords[i] || '';
      const inputWord = inputWords[i] || '';
      
      if (originalWord === inputWord) {
        differences.push({
          type: 'match',
          originalText: originalWord,
          userText: inputWord,
          startIndex: originalIndex,
          endIndex: originalIndex + originalWord.length
        });
      } else if (!inputWord) {
        differences.push({
          type: 'delete',
          originalText: originalWord,
          userText: '',
          startIndex: originalIndex,
          endIndex: originalIndex + originalWord.length
        });
      } else if (!originalWord) {
        differences.push({
          type: 'insert',
          originalText: '',
          userText: inputWord,
          startIndex: inputIndex,
          endIndex: inputIndex + inputWord.length
        });
      } else {
        differences.push({
          type: 'replace',
          originalText: originalWord,
          userText: inputWord,
          startIndex: originalIndex,
          endIndex: originalIndex + originalWord.length
        });
      }
      
      originalIndex += originalWord.length + 1;
      inputIndex += inputWord.length + 1;
    }
    
    return differences;
  }

  /**
   * Categorize mistakes into missing, extra, and misspelled words
   */
  private categorizeMistakes(original: string, userInput: string): MistakeCategory {
    const originalWords = this.tokenizeWords(original);
    const inputWords = this.tokenizeWords(userInput);
    
    const originalSet = new Set(originalWords);
    const inputSet = new Set(inputWords);
    
    const missingWords = originalWords.filter(word => !inputSet.has(word));
    const extraWords = inputWords.filter(word => !originalSet.has(word));
    
    // Find misspelled words (words that are similar but not exact matches)
    const misspelledWords: Array<{ original: string; typed: string }> = [];
    
    for (let i = 0; i < Math.min(originalWords.length, inputWords.length); i++) {
      const origWord = originalWords[i];
      const inputWord = inputWords[i];
      
      if (origWord !== inputWord && this.isSimilar(origWord, inputWord)) {
        misspelledWords.push({ original: origWord, typed: inputWord });
      }
    }
    
    return {
      missingWords: Array.from(new Set(missingWords)),
      extraWords: Array.from(new Set(extraWords)),
      misspelledWords
    };
  }

  /**
   * Check if two words are similar (for detecting misspellings)
   */
  private isSimilar(word1: string, word2: string): boolean {
    const distance = this.levenshteinDistance(word1, word2);
    const maxLength = Math.max(word1.length, word2.length);
    
    // Consider similar if distance is less than 30% of max length
    return distance < maxLength * 0.3;
  }

  /**
   * Save dictation attempt (no-op - dictation progress is not saved to database)
   */
  saveDictationAttempt(attempt: DictationPracticeAttempt): Observable<void> {
    console.log('[DictationPracticeService] Dictation attempt completed (not saved to DB)');
    return of(undefined);
  }
  
  /**
   * Load dictation history (no-op - dictation progress is not saved to database)
   */
  loadDictationHistory(): Observable<DictationProgress> {
    return of({});
  }

  /**
   * Get best dictation attempt for an exercise (no-op - dictation progress is not saved to database)
   */
  getBestDictationAttempt(exerciseId: string): Observable<DictationPracticeAttempt | null> {
    return of(null);
  }

  /**
   * Save in-progress dictation session to localStorage
   */
  saveInProgressSession(exerciseId: string, sentences: DictationSentence[], currentIndex: number): void {
    const userId = this.authService.getUserId();
    if (!userId) return;

    const sessionData = {
      exerciseId,
      sentences,
      currentIndex,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem(`dictation_session_${userId}_${exerciseId}`, JSON.stringify(sessionData));
  }

  /**
   * Load in-progress dictation session from localStorage
   */
  loadInProgressSession(exerciseId: string): { sentences: DictationSentence[]; currentIndex: number } | null {
    const userId = this.authService.getUserId();
    if (!userId) return null;

    const key = `dictation_session_${userId}_${exerciseId}`;
    const data = localStorage.getItem(key);

    if (!data) return null;

    try {
      const sessionData = JSON.parse(data);
      
      // Check if session is less than 24 hours old
      const timestamp = new Date(sessionData.timestamp);
      const now = new Date();
      const hoursDiff = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        // Session expired, clear it
        this.clearInProgressSession(exerciseId);
        return null;
      }

      return {
        sentences: sessionData.sentences,
        currentIndex: sessionData.currentIndex
      };
    } catch (error) {
      console.error('[DictationPracticeService] Error loading in-progress session:', error);
      return null;
    }
  }

  /**
   * Clear in-progress dictation session from localStorage
   */
  clearInProgressSession(exerciseId: string): void {
    const userId = this.authService.getUserId();
    if (!userId) return;

    const key = `dictation_session_${userId}_${exerciseId}`;
    localStorage.removeItem(key);
  }
}
