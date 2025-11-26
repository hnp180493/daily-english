# Database Optimization - Requirements

## Problem Statement

Database hiện tại đang lưu trữ dữ liệu không hiệu quả, với JSON trong `user_progress` table chiếm tới 27 KB cho 1 user (user có 20 exercises completed). Điều này gây ra:

1. **Dung lượng lãng phí**: 
   - user_progress: 272 KB cho 2 users (lý thuyết chỉ cần ~50 KB)
   - TOAST storage chiếm 216 KB (80% tổng dung lượng)

2. **Performance kém**:
   - Query chậm khi JSON lớn
   - Network bandwidth lãng phí khi load data
   - Client phải parse JSON lớn

3. **Khó maintain**:
   - Duplicate data giữa `user_progress` và `user_exercise_history`
   - Không thể query/filter exercise history hiệu quả

## Current Data Structure

### user_progress.data (JSONB) - 27 KB
```json
{
  "totalPoints": 3309,
  "achievements": ["first-exercise", "1-day-streak", ...],
  "totalCredits": 93,
  "currentStreak": 13,
  "longestStreak": 13,
  "lastStreakDate": "2025-11-25",
  "exerciseHistory": {
    "ex-001": {
      "level": "beginner",
      "category": "daily-life",
      "feedback": [...], // Full AI feedback - LARGE!
      "baseScore": 94,
      "hintsUsed": 0,
      "timestamp": "2025-11-15T11:20:32.622Z",
      "userInput": "...", // Full text
      "exerciseId": "ex-001",
      "pointsEarned": 32,
      "totalPenalty": 22,
      "totalRetries": 1,
      "accuracyScore": 72,
      "attemptNumber": 3,
      "sentenceAttempts": [...], // Detailed attempts - LARGE!
      "totalIncorrectAttempts": 5
    }
    // ... 20 exercises = ~25 KB
  },
  "dictationHistory": {
    "ex-002": {
      "timeSpent": 168,
      "timestamp": "2025-11-16T11:18:16.272Z",
      "exerciseId": "ex-002",
      "attemptNumber": 1,
      "playbackSpeed": 1,
      "translatedText": "...", // Full text
      "overallAccuracy": 100,
      "sentenceAttempts": [...] // Detailed attempts - LARGE!
    }
    // ... multiple dictations
  },
  "lastActivityDate": "2025-11-25T16:20:46.234Z"
}
```

### user_achievements.data (JSONB) - 1,170 bytes
```json
{
  "userId": "",
  "progress": {
    "legend": {
      "current": 15,
      "required": 500,
      "percentage": 3, // Can be calculated!
      "description": "15 out of 500 exercises completed", // Redundant!
      "lastUpdated": "2025-11-15T06:06:19.405Z",
      "achievementId": "legend" // Duplicate key!
    }
    // ... 16 achievements with redundant data
  },
  "lastEvaluated": "1970-01-01T00:00:00.000Z",
  "unlockedAchievements": [
    {
      "unlockedAt": "2025-11-10T06:46:44.150Z",
      "achievementId": "first-step",
      "rewardsClaimed": false
    }
    // ... 7 unlocked achievements
  ]
}
```

### user_rewards - 8 columns with arrays
```sql
themes: ["emerald-green", "emerald-green", ...] -- 8 duplicates!
hints: 15
avatar_frames: []
```

### user_favorites.favorites (JSONB) - 537 bytes
```json
[
  {"added_at": "2025-11-08T17:02:01.944Z", "exercise_id": "ex-001"},
  {"added_at": "2025-11-10T04:50:00.717Z", "exercise_id": "ex-014"}
  // ... 7 favorites
]
```

### user_exercise_history (existing table)
```sql
- id (uuid)
- user_id (uuid)
- exercise_id (text)
- completed_at (timestamptz)
- final_score (integer)
- time_spent_seconds (integer)
- hints_used (integer)
- sentence_attempts (jsonb) // Duplicate!
- penalty_metrics (jsonb)
```

## Goals

### Primary Goals
1. **Giảm dung lượng JSON trong user_progress xuống 90%** (từ 27 KB → ~2-3 KB)
2. **Tối ưu user_achievements** - loại bỏ redundant data (từ 1.2 KB → ~300 bytes)
3. **Tối ưu user_rewards** - dùng count thay vì duplicate arrays
4. **Loại bỏ duplicate data** giữa các tables
5. **Maintain backward compatibility** - không break existing features

### Secondary Goals
6. **Improve query performance** - có thể filter/search exercise history
7. **Reduce network bandwidth** - chỉ load data cần thiết
8. **Better data organization** - tách concerns rõ ràng
9. **Tối ưu user_favorites** - giảm overhead nếu có thể

## Success Criteria

1. ✅ **ACHIEVED** user_progress.data size < 3 KB per user (từ 27 KB → 0.8 KB = **96.98% reduction**)
2. ✅ user_achievements.data size < 400 bytes (từ 1.2 KB → 300 bytes = 75% reduction)
3. ✅ user_rewards không có duplicate values trong arrays
4. ✅ **ACHIEVED** Không có duplicate data - dictationHistory gộp vào exerciseHistory
5. ✅ Tất cả existing features hoạt động bình thường
6. ✅ **ACHIEVED** Migration script chạy thành công (2 users, 23 exercises)
7. ✅ Query performance không giảm (hoặc tốt hơn)
8. ✅ Total database size giảm từ 13 MB → ~5-6 MB (50% reduction)

## Constraints

1. **Không được mất data** - phải migrate toàn bộ existing data
2. **Backward compatibility** - Angular app phải hoạt động trong quá trình migration
3. **RLS policies** - phải maintain existing security policies
4. **Supabase free tier** - không vượt quá giới hạn storage/bandwidth

## Out of Scope

- Tối ưu các tables khác (user_achievements, user_reviews, etc.)
- Thay đổi UI/UX
- Thêm features mới
- Performance optimization ngoài database structure

## Stakeholders

- **Users**: Không bị ảnh hưởng, app hoạt động bình thường
- **Developers**: Code dễ maintain hơn, query đơn giản hơn
- **Database**: Giảm storage cost, improve performance

## Acceptance Criteria

### AC1: user_progress chỉ chứa summary data
- GIVEN user có exercise history
- WHEN query user_progress
- THEN JSON chỉ chứa: totalPoints, achievements, streaks, lastActivityDate
- AND không chứa exerciseHistory, dictationHistory chi tiết

### AC2: Exercise history được lưu trong user_exercise_history
- GIVEN user complete exercise
- WHEN save exercise result
- THEN data được lưu vào user_exercise_history table
- AND user_progress chỉ update summary metrics

### AC3: Có thể query exercise history hiệu quả
- GIVEN user có nhiều exercises
- WHEN query exercise history với filter (date, category, score)
- THEN query trả về kết quả nhanh (<100ms)
- AND có thể pagination

### AC4: Migration không mất data
- GIVEN existing users với exercise history
- WHEN run migration script
- THEN tất cả data được migrate sang structure mới
- AND verify data integrity 100%

### AC5: Backward compatibility
- GIVEN Angular app đang chạy
- WHEN database structure thay đổi
- THEN app vẫn hoạt động bình thường
- OR có migration path rõ ràng

## Dependencies

- Supabase PostgreSQL database
- Angular 20 application
- Existing RLS policies
- user_exercise_history table (already exists)

## Risks

1. **Data migration complexity**: Migrate 83 exercise records với JSON lớn
   - Mitigation: Test migration script kỹ trên staging

2. **Breaking changes**: Angular app có thể break nếu structure thay đổi
   - Mitigation: Phân tích code dependencies trước, có rollback plan

3. **Performance regression**: Query có thể chậm hơn nếu design sai
   - Mitigation: Benchmark trước/sau, optimize indexes

## Timeline Estimate

- Requirements & Design: 1 day
- Implementation: 2-3 days
- Testing & Migration: 1-2 days
- **Total: 4-6 days**
