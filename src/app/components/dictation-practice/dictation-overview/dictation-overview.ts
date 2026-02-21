import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, HostListener } from '@angular/core';
import { TTSService } from '../../../services/tts.service';
import { DictationSentence } from '../../../models/dictation.model';

@Component({
  selector: 'app-dictation-overview',
  imports: [CommonModule],
  templateUrl: './dictation-overview.html',
  styleUrl: './dictation-overview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DictationOverview implements OnInit, OnDestroy {
  private ttsService = inject(TTSService);
  
  @Input() sentences: DictationSentence[] = [];
  
  showOverview = signal<boolean>(false);
  showOverviewText = signal<boolean>(false);
  isPlayingOverview = signal<boolean>(false);
  currentOverviewSentenceIndex = signal<number | null>(null);
  
  private overviewSentenceBoundaries: number[] = [];
  private lastArrowLeftTime = 0;
  private readonly DOUBLE_LEFT_MS = 400;
  private spaceKeyHandlerBound: ((e: KeyboardEvent) => void) | null = null;

  @Output() overviewToggled = new EventEmitter<boolean>();

  ngOnInit(): void {
    // Add capture phase listener to catch Space key early
    this.spaceKeyHandlerBound = this.handleSpaceKeyCapture.bind(this);
    document.addEventListener('keydown', this.spaceKeyHandlerBound, { capture: true });
  }

  ngOnDestroy(): void {
    this.stopOverviewAudio();
    if (this.spaceKeyHandlerBound) {
      document.removeEventListener('keydown', this.spaceKeyHandlerBound, { capture: true });
    }
  }

  private handleSpaceKeyCapture(event: KeyboardEvent): void {
    // Only handle Space key when overview is shown
    // IMPORTANT: Only handle bare Space key, NOT with modifier keys (Ctrl, Alt, Shift, Meta)
    // This allows Ctrl+Space and other combinations to work normally for other components
    if (
      (event.key === ' ' || event.key === 'Spacebar') && 
      this.showOverview() &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey &&
      !event.metaKey
    ) {
      // Don't handle when typing in input elements
      const target = event.target as HTMLElement;
      if (
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable
      ) {
        return;
      }
      
      // Prevent default IMMEDIATELY in capture phase - this stops scroll before it starts
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      
      // Handle play/pause directly here since we're stopping propagation
      if (this.isPlayingOverview()) {
        this.onPauseOverviewAudio();
      } else {
        this.onPlayOverviewAudio();
      }
    }
  }

  onToggleOverview(): void {
    this.showOverview.update(v => !v);
    
    if (!this.showOverview()) {
      this.stopOverviewAudio();
      this.showOverviewText.set(false);
    } else {
      // When expanding, ensure shortcuts work immediately
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        // Blur any focused elements that might interfere with shortcuts
        if (document.activeElement instanceof HTMLElement) {
          (document.activeElement as HTMLElement).blur();
        }
      }, 50);
    }
    
    this.overviewToggled.emit(this.showOverview());
  }

  handleToggleButtonSpace(event: KeyboardEvent): void {
    // If overview is already open, prevent Space from toggling
    // Let the document-level handler handle play/pause instead
    if (this.showOverview()) {
      event.preventDefault();
      event.stopPropagation();
      // Don't call onToggleOverview() - let play/pause handler take over
      return;
    }
    // If overview is closed, allow Space to toggle (normal button behavior)
    // But prevent default scroll behavior
    event.preventDefault();
    this.onToggleOverview();
  }

  onToggleOverviewText(): void {
    this.showOverviewText.update(v => !v);
  }

  onPlayOverviewAudio(): void {
    // If TTS is paused, resume from where it stopped
    if (this.ttsService.isPaused()) {
      this.ttsService.resume();
      this.isPlayingOverview.set(true);
      return;
    }
    
    // Otherwise, start playing from beginning
    const fullText = this.getFullExerciseText();
    if (!fullText) return;
    
    this.calculateSentenceBoundaries();
    
    if (this.isPlayingOverview()) {
      this.ttsService.stop();
    }
    
    this.isPlayingOverview.set(true);
    this.currentOverviewSentenceIndex.set(0);
    
    this.ttsService.speak(fullText, () => {
      this.isPlayingOverview.set(false);
      this.currentOverviewSentenceIndex.set(null);
    }, (charIndex: number) => {
      const sentenceIndex = this.getSentenceIndexFromCharIndex(charIndex);
      this.currentOverviewSentenceIndex.set(sentenceIndex);
    });
  }

  onPauseOverviewAudio(): void {
    this.ttsService.pause();
    this.isPlayingOverview.set(false);
  }

  onRewindOverviewAudio(): void {
    this.playFromSentenceIndex(this.currentOverviewSentenceIndex());
  }

  onRewindToPreviousSentence(): void {
    const currentIndex = this.currentOverviewSentenceIndex();
    if (currentIndex === null || currentIndex <= 0) return;
    this.playFromSentenceIndex(currentIndex - 1);
  }

  private playFromSentenceIndex(startIndex: number | null): void {
    if (startIndex == null || startIndex < 0) return;
    
    this.ttsService.stop();
    
    if (this.sentences.length === 0 || startIndex >= this.sentences.length) return;
    
    if (this.overviewSentenceBoundaries.length === 0) {
      this.calculateSentenceBoundaries();
    }
    
    const remainingSentences = this.sentences.slice(startIndex);
    const textToPlay = remainingSentences.map(s => s.original).join('. ') + '.';
    
    this.isPlayingOverview.set(true);
    this.currentOverviewSentenceIndex.set(startIndex);
    
    const currentBoundary = this.overviewSentenceBoundaries[startIndex];
    
    this.ttsService.speak(textToPlay, () => {
      this.isPlayingOverview.set(false);
      this.currentOverviewSentenceIndex.set(null);
    }, (charIndex: number) => {
      const adjustedIndex = currentBoundary + charIndex;
      const sentenceIndex = this.getSentenceIndexFromCharIndex(adjustedIndex);
      this.currentOverviewSentenceIndex.set(sentenceIndex);
    });
  }

  stopOverviewAudio(): void {
    this.ttsService.stop();
    this.isPlayingOverview.set(false);
    this.currentOverviewSentenceIndex.set(null);
  }

  getFullExerciseText(): string {
    return this.sentences.map(s => s.original).join('. ') + '.';
  }

  private calculateSentenceBoundaries(): void {
    const fullText = this.getFullExerciseText();
    this.overviewSentenceBoundaries = [];
    let currentPos = 0;
    
    for (let i = 0; i < this.sentences.length; i++) {
      this.overviewSentenceBoundaries.push(currentPos);
      const sentenceText = this.sentences[i].original;
      currentPos += sentenceText.length;
      if (i < this.sentences.length - 1) {
        currentPos += 2; // ". " separator
      } else {
        currentPos += 1; // Just "." for last sentence
      }
    }
  }

  private getSentenceIndexFromCharIndex(charIndex: number): number {
    for (let i = this.overviewSentenceBoundaries.length - 1; i >= 0; i--) {
      if (charIndex >= this.overviewSentenceBoundaries[i]) {
        return i;
      }
    }
    return 0;
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    // Space key is handled in capture phase, skip it here
    if (event.key === ' ' || event.key === 'Spacebar') {
      return;
    }
    
    // Only handle other shortcuts when overview is shown
    if (!this.showOverview()) {
      return;
    }
    
    // Don't handle shortcuts when typing in input elements
    const target = event.target as HTMLElement;
    if (
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target.isContentEditable
    ) {
      return;
    }
    
    // Handle Left Arrow key for rewind (only when playing)
    if (event.key === 'ArrowLeft' && this.isPlayingOverview()) {
      event.preventDefault();
      event.stopPropagation();
      
      // Ctrl + Left Arrow → go to previous sentence
      if (event.ctrlKey) {
        this.onRewindToPreviousSentence();
        return;
      }
      
      // Double Left Arrow → go to previous sentence
      const now = Date.now();
      const isDoubleLeft = now - this.lastArrowLeftTime < this.DOUBLE_LEFT_MS;
      this.lastArrowLeftTime = now;
      
      if (isDoubleLeft) {
        this.onRewindToPreviousSentence();
      } else {
        this.onRewindOverviewAudio();
      }
    }
  }
}
