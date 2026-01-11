# Requirements Document

## Introduction

Hệ thống Memory Retention System giúp người dùng ghi nhớ nội dung bài tập sau khi hoàn thành luyện tập. Hệ thống kết hợp 3 phương pháp khoa học: Comprehension Quiz (câu hỏi kiểm tra hiểu bài), Content Summary (tóm tắt nội dung), và Flashcard System (hệ thống flashcard) để tối ưu hóa việc ghi nhớ dài hạn.

## Glossary

- **Memory_Retention_System**: Hệ thống tổng hợp giúp người dùng ghi nhớ nội dung bài tập
- **Comprehension_Quiz**: Module tạo và hiển thị câu hỏi kiểm tra hiểu bài dựa trên nội dung đoạn văn
- **Content_Summary**: Module tóm tắt nội dung chính và từ vựng quan trọng của bài tập
- **Flashcard_System**: Module tạo và quản lý flashcard từ nội dung bài tập
- **AI_Service**: Dịch vụ AI hiện có (Gemini/OpenAI) để tạo câu hỏi và tóm tắt
- **Exercise**: Bài tập dịch thuật hiện có trong hệ thống
- **Dictation_Practice**: Bài tập nghe chính tả hiện có
- **Spaced_Repetition**: Thuật toán lặp lại có khoảng cách để tối ưu ghi nhớ
- **Quiz_Question**: Câu hỏi kiểm tra hiểu bài với các lựa chọn trả lời
- **Flashcard**: Thẻ ghi nhớ với mặt trước (câu hỏi/từ) và mặt sau (đáp án/nghĩa)
- **Key_Vocabulary**: Từ vựng quan trọng được trích xuất từ bài tập
- **Main_Ideas**: Ý chính được tóm tắt từ nội dung bài tập

## Requirements

### Requirement 1: Comprehension Quiz Generation

**User Story:** As a learner, I want to answer comprehension questions after completing an exercise, so that I can verify my understanding and reinforce memory of the content.

#### Acceptance Criteria

1. WHEN a user completes a translation exercise with score >= 75%, THE Comprehension_Quiz SHALL generate 2-3 questions about the passage content using AI_Service
2. WHEN generating quiz questions, THE Comprehension_Quiz SHALL create questions that test understanding of main ideas, not just word-for-word recall
3. WHEN a quiz question is generated, THE Quiz_Question SHALL include the question text, 4 answer options, the correct answer index, and an explanation
4. IF the AI_Service fails to generate questions, THEN THE Comprehension_Quiz SHALL display a graceful error message and allow the user to skip the quiz
5. WHEN displaying a quiz question, THE Comprehension_Quiz SHALL show one question at a time with selectable answer options
6. WHEN a user selects an answer, THE Comprehension_Quiz SHALL immediately show whether the answer is correct and display the explanation
7. WHEN all quiz questions are answered, THE Comprehension_Quiz SHALL display a summary showing total correct answers and overall performance

### Requirement 2: Content Summary Generation

**User Story:** As a learner, I want to see a summary of the main ideas and key vocabulary after completing an exercise, so that I can quickly review what I learned.

#### Acceptance Criteria

1. WHEN a user completes a translation exercise, THE Content_Summary SHALL generate a concise summary of 2-3 main ideas from the passage
2. WHEN generating a summary, THE Content_Summary SHALL extract 5-8 key vocabulary words with their meanings and example usage
3. WHEN displaying Key_Vocabulary, THE Content_Summary SHALL show the English word, Vietnamese meaning, and the sentence from the passage where it appears
4. WHEN a user clicks on a Key_Vocabulary item, THE Content_Summary SHALL play the pronunciation using TTS_Service
5. IF the AI_Service fails to generate a summary, THEN THE Content_Summary SHALL display the original passage text as fallback
6. WHEN displaying Main_Ideas, THE Content_Summary SHALL present them as bullet points in both English and Vietnamese

### Requirement 3: Flashcard Generation and Management

**User Story:** As a learner, I want flashcards to be automatically created from exercise content, so that I can review and memorize vocabulary and key phrases over time.

#### Acceptance Criteria

1. WHEN a user completes a translation exercise, THE Flashcard_System SHALL automatically generate flashcards from Key_Vocabulary and important phrases
2. WHEN creating a Flashcard, THE Flashcard_System SHALL include front (English word/phrase), back (Vietnamese meaning), source exercise ID, and creation timestamp
3. WHEN a user views flashcards, THE Flashcard_System SHALL display cards one at a time with flip animation to reveal the answer
4. WHEN a user reviews a Flashcard, THE Flashcard_System SHALL allow marking as "Know" or "Don't Know" to track progress
5. WHEN a user marks a Flashcard as "Don't Know", THE Flashcard_System SHALL schedule it for earlier review using Spaced_Repetition algorithm
6. WHEN a user marks a Flashcard as "Know", THE Flashcard_System SHALL increase the review interval using Spaced_Repetition algorithm
7. THE Flashcard_System SHALL persist all flashcards to local storage for guest users and to Supabase for authenticated users
8. WHEN displaying the flashcard deck, THE Flashcard_System SHALL show total cards, cards due for review, and mastery percentage

### Requirement 4: Post-Exercise Memory Flow

**User Story:** As a learner, I want a seamless flow after completing an exercise that guides me through memory reinforcement activities, so that I can maximize retention without extra effort.

#### Acceptance Criteria

1. WHEN a user completes a translation exercise with score >= 75%, THE Memory_Retention_System SHALL display a "Memory Boost" section on the completion screen
2. WHEN displaying the Memory Boost section, THE Memory_Retention_System SHALL show tabs for Quiz, Summary, and Flashcards
3. WHEN a user has not completed the quiz, THE Memory_Retention_System SHALL highlight the Quiz tab as recommended first step
4. WHEN a user completes the quiz with >= 80% correct, THE Memory_Retention_System SHALL award bonus points (5 points)
5. WHEN a user adds flashcards to their deck, THE Memory_Retention_System SHALL show a confirmation with the number of cards added
6. IF the user skips all memory activities, THEN THE Memory_Retention_System SHALL save the generated content for later access from the exercise detail page

### Requirement 5: Flashcard Review Interface

**User Story:** As a learner, I want a dedicated interface to review my flashcard collection, so that I can practice vocabulary across all exercises I've completed.

#### Acceptance Criteria

1. THE Flashcard_System SHALL provide a dedicated review page accessible from the main navigation
2. WHEN opening the review page, THE Flashcard_System SHALL display cards due for review first, sorted by urgency
3. WHEN no cards are due for review, THE Flashcard_System SHALL display a message and option to review all cards anyway
4. WHEN reviewing cards, THE Flashcard_System SHALL track session statistics including cards reviewed, accuracy, and time spent
5. WHEN a review session ends, THE Flashcard_System SHALL display session summary with performance metrics
6. THE Flashcard_System SHALL allow filtering flashcards by exercise, category, or mastery level
7. THE Flashcard_System SHALL allow users to manually delete individual flashcards

### Requirement 6: Data Persistence and Synchronization

**User Story:** As a learner, I want my quiz results, summaries, and flashcards to be saved and synchronized, so that I can access them across sessions and devices.

#### Acceptance Criteria

1. WHEN a user completes a quiz, THE Memory_Retention_System SHALL save the quiz results including questions, answers, and score
2. WHEN a user is authenticated, THE Memory_Retention_System SHALL synchronize all memory data to Supabase
3. WHEN a user is in guest mode, THE Memory_Retention_System SHALL persist all memory data to local storage
4. WHEN a user logs in after using guest mode, THE Memory_Retention_System SHALL merge local flashcards with cloud data
5. THE Memory_Retention_System SHALL store generated summaries to avoid regenerating them on subsequent views
6. WHEN loading an exercise detail page, THE Memory_Retention_System SHALL check for existing memory data and display it if available

### Requirement 7: Spaced Repetition Algorithm

**User Story:** As a learner, I want the system to intelligently schedule my flashcard reviews, so that I review cards at optimal intervals for long-term retention.

#### Acceptance Criteria

1. THE Spaced_Repetition algorithm SHALL calculate next review date based on current interval and user response
2. WHEN a user marks "Know", THE Spaced_Repetition algorithm SHALL multiply the current interval by 2.5 (minimum 1 day, maximum 180 days)
3. WHEN a user marks "Don't Know", THE Spaced_Repetition algorithm SHALL reset the interval to 1 day
4. THE Flashcard SHALL store ease factor, interval, and next review date for each card
5. WHEN calculating cards due for review, THE Spaced_Repetition algorithm SHALL include all cards where next review date <= current date
