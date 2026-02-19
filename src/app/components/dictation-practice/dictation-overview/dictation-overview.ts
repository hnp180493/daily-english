import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, signal, OnDestroy, HostListener } from '@angular/core';
import { TTSService } from '../../../services/tts.service';
import { DictationSentence } from '../../../models/dictation.model';

@Component({
  selector: 'app-dictation-overview',
  imports: [CommonModule],
  templateUrl: './dictation-overview.html',
  styleUrl: './dictation-overview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DictationOverview implements OnDestroy {
  private ttsService = inject(TTSService);
  
  @Input() sentences: DictationSentence[] = [];
  
  showOverview = signal<boolean>(false);
  showOverviewText = signal<boolean>(false);
  isPlayingOverview = signal<boolean>(false);
  currentOverviewSentenceIndex = signal<number | null>(null);
  
  private overviewSentenceBoundaries: number[] = [];

  @Output() overviewToggled = new EventEmitter<boolean>();

  ngOnDestroy(): void {
    this.stopOverviewAudio();
  }

  onToggleOverview(): void {
    this.showOverview.update(v => !v);
    
    if (!this.showOverview()) {
      this.stopOverviewAudio();
      this.showOverviewText.set(false);
    }
    
    this.overviewToggled.emit(this.showOverview());
  }

  onToggleOverviewText(): void {
    this.showOverviewText.update(v => !v);
  }

  onPlayOverviewAudio(): void {
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
    const currentIndex = this.currentOverviewSentenceIndex();
    if (currentIndex === null || currentIndex < 0) return;
    
    this.ttsService.stop();
    
    if (this.sentences.length === 0 || currentIndex >= this.sentences.length) return;
    
    if (this.overviewSentenceBoundaries.length === 0) {
      this.calculateSentenceBoundaries();
    }
    
    const remainingSentences = this.sentences.slice(currentIndex);
    const textToPlay = remainingSentences.map(s => s.original).join('. ') + '.';
    
    this.isPlayingOverview.set(true);
    this.currentOverviewSentenceIndex.set(currentIndex);
    
    const currentBoundary = this.overviewSentenceBoundaries[currentIndex];
    
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
    // Rewind overview audio with Left Arrow key
    // Only work when overview audio is playing and not typing in textarea
    if (event.key === 'ArrowLeft' && this.isPlayingOverview() && !(event.target instanceof HTMLTextAreaElement)) {
      event.preventDefault();
      this.onRewindOverviewAudio();
    }
  }
}
