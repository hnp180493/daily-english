# Migration Example

## Dữ liệu trước khi optimize (Old Format)

```json
{
  "attempts": [
    {
      "category": "daily-life",
      "feedback": [],
      "hintsUsed": 0,
      "timestamp": "2025-11-08T14:06:14.788Z",
      "userInput": "Today I cooked my favorite food.",
      "exerciseId": "ex-014",
      "pointsEarned": 50,
      "accuracyScore": 90,
      "attemptNumber": 1,
      "sentenceAttempts": [...]
    },
    {
      "category": "daily-life",
      "feedback": [],
      "hintsUsed": 0,
      "timestamp": "2025-11-08T14:26:05.700Z",
      "userInput": "Today I cooked my favorite food.",
      "exerciseId": "ex-014",
      "pointsEarned": 40,
      "accuracyScore": 90,
      "attemptNumber": 2,
      "sentenceAttempts": [...]
    },
    // ... 7 attempts nữa cho cùng exerciseId "ex-014"
  ],
  "totalPoints": 1016,
  "achievements": ["first-exercise", "1-day-streak", "bright-mind"],
  "totalCredits": 18,
  "currentStreak": 1,
  "lastStreakDate": "2025-11-08",
  "lastActivityDate": "2025-11-08T14:32:26.874Z"
}
```

**Kích thước**: ~9 attempts × ~200 bytes = ~1,800 bytes chỉ cho attempts

## Dữ liệu sau khi optimize (New Format)

```json
{
  "exerciseHistory": {
    "ex-014": {
      "category": "daily-life",
      "feedback": [],
      "hintsUsed": 0,
      "timestamp": "2025-11-08T14:32:24.361Z",
      "userInput": "Today I cooked my favorite food.",
      "exerciseId": "ex-014",
      "pointsEarned": 10,
      "accuracyScore": 90,
      "attemptNumber": 9,
      "sentenceAttempts": [...]
    }
  },
  "totalPoints": 1016,
  "achievements": ["first-exercise", "1-day-streak", "bright-mind"],
  "totalCredits": 18,
  "currentStreak": 1,
  "lastStreakDate": "2025-11-08",
  "lastActivityDate": "2025-11-08T14:32:26.874Z"
}
```

**Kích thước**: 1 attempt × ~200 bytes = ~200 bytes

**Tiết kiệm**: ~1,600 bytes (~89%) cho trường hợp này

## Lợi ích thực tế

### Trường hợp 1: User làm 100 exercises, mỗi exercise 5 lần
- **Trước**: 500 attempts × 200 bytes = 100 KB
- **Sau**: 100 exercises × 200 bytes = 20 KB
- **Tiết kiệm**: 80 KB (80%)

### Trường hợp 2: User làm 50 exercises, mỗi exercise 10 lần
- **Trước**: 500 attempts × 200 bytes = 100 KB
- **Sau**: 50 exercises × 200 bytes = 10 KB
- **Tiết kiệm**: 90 KB (90%)

### Trường hợp 3: User làm 200 exercises, mỗi exercise 1 lần
- **Trước**: 200 attempts × 200 bytes = 40 KB
- **Sau**: 200 exercises × 200 bytes = 40 KB
- **Tiết kiệm**: 0 KB (0%) - Không có lợi ích nếu không làm lại

## Kết luận

Optimization này đặc biệt hiệu quả khi:
- User thường làm lại cùng một bài tập nhiều lần
- Có nhiều attempts cho mỗi exercise
- Database có giới hạn về storage (như Firestore free tier)

Với Firestore free tier (1 GB storage), optimization này có thể giúp:
- Lưu trữ nhiều user hơn
- Giảm chi phí bandwidth khi đọc/ghi dữ liệu
- Tăng tốc độ load dữ liệu
