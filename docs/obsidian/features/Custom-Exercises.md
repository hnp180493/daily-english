# Custom Exercises

> **Tags:** #feature/practice #status/active  
> **Route:** `/exercises/custom`, `/exercise/create`, `/exercise/edit/:id`

## Tổng quan

Người dùng có thể tạo bài tập dịch riêng (nội dung của mình, hoặc AI sinh từ prompt) để luyện. Bài tập custom xuất hiện trong [[Exercise-Library]] cùng bài chính thức, có gắn flag `isCustom: true`.

## Trải nghiệm người dùng

1. Vào `/exercises/custom` → danh sách bài đã tạo.
2. Bấm **+ Tạo bài tập mới** → vào `/exercise/create`.
3. Có 2 cách tạo:
   - **Thủ công:** điền `title`, `sourceText` (Vietnamese), `englishText` (đáp án), chọn level/category, thêm hints, expected keywords.
   - **AI sinh:** điền `prompt` + chọn `difficulty` + (tuỳ chọn) vocabulary words → AI tạo `title`, `sourceText`, `suggestedSentences`.
4. Lưu → bài hiển thị trong custom library, click vào để luyện như bài thường.
5. Có thể edit qua `/exercise/edit/:id`.

## Component chính

- [src/app/components/custom-exercise-library/](../../src/app/components/custom-exercise-library/) — danh sách bài custom.
- [src/app/components/exercise-creator/](../../src/app/components/exercise-creator/) — form tạo/edit.

## Service liên quan

- [services/custom-exercise.service.ts](../../src/app/services/custom-exercise.service.ts) — CRUD bài custom (lưu local + Supabase qua [[Storage-Sync]]).
- [services/ai/exercise-generator.service.ts](../../src/app/services/ai/exercise-generator.service.ts) — gọi AI sinh bài từ prompt.

## Data Model

- `CustomExercise extends Exercise` — `isCustom: true`, `createdAt`, `updatedAt`, `userId`, `customCategories?`, `tags?`, `generatedByAI?`, `aiPrompt?`.
- `ExerciseGenerationRequest` — `prompt`, `difficulty`, `targetLanguage?`, `sourceLanguage?`, `vocabularyWords?`.
- `ExerciseGenerationResponse` — `title`, `sourceText`, `englishText?`, `suggestedSentences`, `category?`.
- `ValidationResult`, `ValidationError` — kết quả validate form.

Định nghĩa: [src/app/models/exercise.model.ts](../../src/app/models/exercise.model.ts).

## Route

- `/exercises/custom` → `CustomExerciseLibrary`
- `/exercise/create` → `ExerciseCreator`
- `/exercise/edit/:id` → `ExerciseCreator`

## Liên kết

- **Hiển thị trong:** [[Exercise-Library]]
- **Luyện qua:** [[Translation-Practice]]
- **AI sinh nội dung:** [[AI-Providers]]
- **Phụ thuộc:** [[Storage-Sync]], [[Authentication]] (cần user id)
