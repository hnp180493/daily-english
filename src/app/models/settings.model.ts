export interface DictationSettings {
  replayKey: string;
  playPauseKey: string;
  autoReplay: number; // 0 = No, 1-10 = number of times
  secondsBetweenReplays: number;
  showShortcutTips: boolean;
  showAnswerWhenWrong: boolean;
}

export const DEFAULT_DICTATION_SETTINGS: DictationSettings = {
  replayKey: 'ctrl+space',
  playPauseKey: 'backtick',
  autoReplay: 0,
  secondsBetweenReplays: 0.5,
  showShortcutTips: true,
  showAnswerWhenWrong: false
};

export const AVAILABLE_KEYS = [
  { value: 'ctrl+space', label: 'Ctrl + Space' },
  { value: 'ctrl+r', label: 'Ctrl + R' },
  { value: 'ctrl+p', label: 'Ctrl + P' },
  { value: 'space', label: 'Space' },
  { value: 'backtick', label: '` (backtick)' },
  { value: 'enter', label: 'Enter' }
];

export const AUTO_REPLAY_OPTIONS = [
  { value: 0, label: 'No' },
  { value: 1, label: '1 time' },
  { value: 2, label: '2 times' },
  { value: 3, label: '3 times' },
  { value: 4, label: '4 times' },
  { value: 5, label: '5 times' },
  { value: 6, label: '6 times' },
  { value: 7, label: '7 times' },
  { value: 8, label: '8 times' },
  { value: 9, label: '9 times' },
  { value: 10, label: '10 times' }
];

export const SECONDS_OPTIONS = [
  { value: 0.5, label: '0.5' },
  { value: 1.0, label: '1.0' },
  { value: 1.5, label: '1.5' },
  { value: 2.0, label: '2.0' },
  { value: 2.5, label: '2.5' },
  { value: 3.0, label: '3.0' }
];
