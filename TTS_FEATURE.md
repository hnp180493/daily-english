# Text-to-Speech (TTS) Feature

## Overview

The application now includes text-to-speech functionality using the Web Speech API (Microsoft Edge's Read Aloud API). This feature allows users to listen to their completed translations, helping with pronunciation and listening comprehension.

## Features

### 1. Play All Translations
- **Location**: Review mode header
- **Button**: 🔊 Play All
- **Function**: Plays all completed translations sequentially with a brief pause between sentences
- **Visual Feedback**: Currently playing sentence is highlighted with a pulsing border

### 2. Play Individual Sentences
- **Location**: Each completed sentence in review mode
- **Button**: 🔊 (speaker icon)
- **Function**: Plays a single sentence translation
- **Use Case**: Focus on specific sentences for pronunciation practice

### 3. Playback Controls
- **Pause/Resume**: Click "Play All" button again while playing to pause
- **Stop**: Red ⏹️ Stop button appears during playback to stop immediately

## Technical Implementation

### TTSService (`src/app/services/tts.service.ts`)

A singleton service that manages text-to-speech functionality:

```typescript
// Key methods
speak(text: string): void              // Speak single text
speakSentences(sentences: string[]): void  // Speak multiple sentences
pause(): void                          // Pause playback
resume(): void                         // Resume playback
stop(): void                           // Stop playback
toggle(): void                         // Toggle pause/resume
```

### Features
- **Voice Selection**: Automatically selects Microsoft Edge English voices when available
- **Configurable Speech**: Rate set to 0.9 (slightly slower for learning)
- **Signal-based State**: Uses Angular signals for reactive state management
- **Sequential Playback**: Automatically plays sentences in sequence with pauses

### Integration

The TTS service is integrated into the `ExerciseDetailComponent`:

```typescript
// Computed properties for reactive UI
isPlayingTTS = computed(() => this.ttsService.isPlaying());
isPausedTTS = computed(() => this.ttsService.isPaused());
currentTTSSentenceIndex = computed(() => this.ttsService.currentSentenceIndex());

// Methods
playFullText(): void      // Play all completed translations
playSentence(index: number): void  // Play specific sentence
toggleTTS(): void         // Toggle pause/resume
stopTTS(): void          // Stop playback
```

## User Experience

### Visual Feedback
1. **Playing Indicator**: Currently playing sentence has:
   - Pulsing golden border animation
   - Highlighted background
   - Clear visual distinction from other sentences

2. **Button States**:
   - Play All button changes to "⏸️ Pause" during playback
   - Stop button appears only during playback
   - Individual sentence buttons are always visible for completed sentences

### Accessibility
- All buttons have proper `aria-label` attributes
- Keyboard accessible (focus indicators)
- Clear visual feedback for all states

## Browser Compatibility

The Web Speech API is supported in:
- ✅ Chrome/Edge (full support with Microsoft voices)
- ✅ Safari (basic support)
- ✅ Firefox (basic support)
- ⚠️ Older browsers may have limited or no support

## Usage Tips

1. **Complete exercises first**: TTS is only available for completed translations
2. **Review mode**: Access TTS in review mode after completing all sentences
3. **Individual practice**: Use sentence-level buttons to focus on specific translations
4. **Sequential learning**: Use "Play All" to hear the full text flow

## Future Enhancements

Potential improvements:
- Voice selection UI (choose different accents/genders)
- Speed control (adjust playback rate)
- Highlight words as they're spoken
- Download audio for offline practice
- Support for original text (Vietnamese) playback
