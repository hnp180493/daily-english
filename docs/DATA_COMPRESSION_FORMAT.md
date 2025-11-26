# Data Compression Format

## Overview

User progress data is compressed before saving to Supabase to reduce database size and network bandwidth.

## Compression Results

- **Translation exercises**: ~35% size reduction
- **Dictation exercises**: ~95% size reduction (only stores attempt count)
- **Overall**: ~59% average size reduction

## Format Structure

### exerciseHistory (Merged Format)

Both translation and dictation data are stored in a single `exerciseHistory` object:

```json
{
  "exerciseHistory": {
    "ex-001": {
      "tr": { /* translation attempt data */ }
    },
    "ex-014": {
      "dh": 8  // dictation: just attempt count
    },
    "ex-023": {
      "tr": { /* translation attempt */ },
      "dh": 5  // can have both translation and dictation
    }
  }
}
```

### Translation Attempt (tr)

Compressed keys for translation exercises:

| Original Key | Compressed | Type |
|-------------|-----------|------|
| attemptNumber | a | number |
| timestamp | t | ISO string |
| level | l | string |
| category | c | string |
| accuracyScore | s | number |
| baseScore | bs | number |
| pointsEarned | p | number |
| hintsUsed | h | number |
| totalPenalty | tp | number |
| totalRetries | tr | number |
| totalIncorrectAttempts | ia | number |
| userInput | ui | string |
| sentenceAttempts | sa | array |

### Dictation Attempt (dh)

**New Format**: Just a number representing attempt count

```json
"ex-014": {
  "dh": 8  // User has practiced this dictation 8 times
}
```

**Why?** Dictation is for practice only. We only need to track:
- How many times the user practiced
- No need to store full transcripts, accuracy scores, or feedback

### Sentence Attempts (sa)

| Original Key | Compressed | Type |
|-------------|-----------|------|
| sentenceIndex | i | number |
| userInput | u | string |
| accuracyScore | a | number |
| retryCount | r | number |
| incorrectAttempts | ia | number |
| feedback | f | array |

### Feedback Items (f)

| Original Key | Compressed | Type |
|-------------|-----------|------|
| type | t | string |
| originalText | o | string |
| suggestion | s | string |

**Note**: `explanation`, `startIndex`, `endIndex` are not stored to save space.

## Review Data Compression

Review data in `user_reviews` table is also compressed:

| Original Key | Compressed | Type |
|-------------|-----------|------|
| easinessFactor | ef | number |
| interval | iv | number |
| nextReviewDate | nr | ISO string |
| repetitionCount | rc | number |
| lastReviewDate | lr | ISO string |
| lastScore | ls | number |
| incorrectSentenceIndices | is | array |

**Example:**
```json
{
  "ef": 2.5,
  "iv": 7,
  "nr": "2025-12-03T00:00:00.000Z",
  "rc": 3,
  "lr": "2025-11-26T14:00:00.000Z",
  "ls": 85,
  "is": [2, 5, 8]
}
```

## Implementation

### Progress Compression
- `ProgressCompressor.compress()` - Called before saving to Supabase
- Located in: `src/app/services/database/progress-compressor.ts`

### Progress Decompression
- `ProgressDecompressor.decompressExerciseHistory()` - Called when loading from Supabase
- `ProgressDecompressor.decompressDictationHistory()` - Handles both new (number) and legacy (object) formats
- Located in: `src/app/services/database/progress-decompressor.ts`

### Review Compression
- `ReviewCompressor.compress()` - Called before saving review data
- Located in: `src/app/services/database/review-compressor.ts`

### Review Decompression
- `ReviewDecompressor.decompress()` - Called when loading review data
- Located in: `src/app/services/database/review-decompressor.ts`

## Migration

The decompressor supports both formats:
- **New format**: `dh: 8` (just a number)
- **Legacy format**: `di: { e, a, t, tt, oa, ... }` (full object)

Existing data will continue to work, new saves use the compressed format.
