import { CommonModule } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed
} from '@angular/core';
import { QuizQuestion, QuizAnswer, QuizResult } from '../../models/memory-retention.model';

/**
 * ComprehensionQuiz component displays and handles quiz questions.
 * Requirements: 1.5, 1.6, 1.7
 */
@Component({
  selector: 'app-comprehension-quiz',
  imports: [CommonModule],
  templateUrl: './comprehension-quiz.html',
  styleUrl: './comprehension-quiz.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComprehensionQuizComponent {
  // Inputs
  questions = input.required<QuizQuestion[]>();
  exerciseId = input.required<string>();

  // Outputs
  quizCompleted = output<QuizResult>();

  // State signals
  currentQuestionIndex = signal<number>(0);
  selectedAnswer = signal<number | null>(null);
  showExplanation = signal<boolean>(false);
  answers = signal<QuizAnswer[]>([]);
  isQuizComplete = signal<boolean>(false);

  // Computed properties
  currentQuestion = computed(() => {
    const questions = this.questions();
    const index = this.currentQuestionIndex();
    return questions[index] || null;
  });

  progress = computed(() => ({
    current: this.currentQuestionIndex() + 1,
    total: this.questions().length
  }));

  progressPercentage = computed(() => {
    const total = this.questions().length;
    if (total === 0) return 0;
    return Math.round((this.currentQuestionIndex() / total) * 100);
  });

  isLastQuestion = computed(() => {
    return this.currentQuestionIndex() >= this.questions().length - 1;
  });

  isAnswerCorrect = computed(() => {
    const selected = this.selectedAnswer();
    const question = this.currentQuestion();
    if (selected === null || !question) return null;
    return selected === question.correctIndex;
  });

  quizScore = computed(() => {
    const allAnswers = this.answers();
    if (allAnswers.length === 0) return 0;
    const correct = allAnswers.filter(a => a.isCorrect).length;
    return Math.round((correct / allAnswers.length) * 100);
  });

  correctCount = computed(() => {
    return this.answers().filter(a => a.isCorrect).length;
  });

  /**
   * Handle answer selection.
   * Requirements: 1.6 - Immediately show whether answer is correct and display explanation
   */
  selectAnswer(index: number): void {
    // Don't allow changing answer after selection
    if (this.selectedAnswer() !== null) return;

    const question = this.currentQuestion();
    if (!question) return;

    this.selectedAnswer.set(index);
    this.showExplanation.set(true);

    // Record the answer
    const answer: QuizAnswer = {
      questionId: question.id,
      selectedIndex: index,
      isCorrect: index === question.correctIndex
    };

    this.answers.update(answers => [...answers, answer]);
  }

  /**
   * Move to the next question or complete the quiz.
   */
  nextQuestion(): void {
    if (this.isLastQuestion()) {
      this.completeQuiz();
    } else {
      this.currentQuestionIndex.update(i => i + 1);
      this.selectedAnswer.set(null);
      this.showExplanation.set(false);
    }
  }

  /**
   * Complete the quiz and emit result.
   * Requirements: 1.7 - Display summary showing total correct answers and performance
   */
  private completeQuiz(): void {
    this.isQuizComplete.set(true);

    const result: QuizResult = {
      exerciseId: this.exerciseId(),
      questions: this.questions(),
      answers: this.answers(),
      score: this.quizScore(),
      completedAt: new Date()
    };

    this.quizCompleted.emit(result);
  }

  /**
   * Restart the quiz.
   */
  restartQuiz(): void {
    this.currentQuestionIndex.set(0);
    this.selectedAnswer.set(null);
    this.showExplanation.set(false);
    this.answers.set([]);
    this.isQuizComplete.set(false);
  }

  /**
   * Get CSS class for answer option based on state.
   */
  getOptionClass(index: number): string {
    const selected = this.selectedAnswer();
    const question = this.currentQuestion();

    if (selected === null || !question) {
      return 'option-default';
    }

    if (index === question.correctIndex) {
      return 'option-correct';
    }

    if (index === selected && index !== question.correctIndex) {
      return 'option-incorrect';
    }

    return 'option-disabled';
  }

  /**
   * Get icon for answer option.
   */
  getOptionIcon(index: number): string | null {
    const selected = this.selectedAnswer();
    const question = this.currentQuestion();

    if (selected === null || !question) return null;

    if (index === question.correctIndex) {
      return '✓';
    }

    if (index === selected && index !== question.correctIndex) {
      return '✗';
    }

    return null;
  }
}
