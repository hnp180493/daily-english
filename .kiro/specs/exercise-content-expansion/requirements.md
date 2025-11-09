# Requirements Document

## Introduction

This feature expands the exercise content library from approximately 3-5 exercises per category/level combination to at least 50 exercises per combination. The goal is to provide learners with a rich, diverse set of translation exercises that feel natural and authentic, with difficulty appropriately scaled to each level (beginner, intermediate, advanced) across all 8 categories.

## Glossary

- **Exercise System**: The translation practice application that provides Vietnamese-to-English translation exercises
- **Category**: One of 8 thematic groupings (daily-life, education-work, culture-arts, health-wellness, science-environment, society-services, travel-transportation, philosophy-beliefs)
- **Level**: One of 3 difficulty tiers (beginner, intermediate, advanced)
- **Exercise**: A single translation task containing Vietnamese source text, hints, expected keywords, and metadata
- **Natural Vietnamese**: Vietnamese text that reads fluently and authentically as if written by a native speaker
- **Content Generator**: The system or process that creates new exercise content

## Requirements

### Requirement 1

**User Story:** As a Vietnamese language learner, I want access to at least 30 exercises per category and level combination, so that I have sufficient practice material without repetition

#### Acceptance Criteria

1. WHEN the Exercise System loads exercise data, THE Exercise System SHALL provide at least 30 exercises for each combination of level and category
2. THE Exercise System SHALL maintain the existing 8 categories across all 3 levels
3. THE Exercise System SHALL ensure each exercise has a unique ID following the existing naming pattern
4. THE Exercise System SHALL organize exercises in JSON files by level and category matching the current structure
5. THE Exercise System SHALL validate that total exercise count reaches at least 720 exercises (30 exercises × 8 categories × 3 levels)

### Requirement 2

**User Story:** As a Vietnamese language learner, I want exercises with natural, fluent Vietnamese text, so that I learn authentic language usage

#### Acceptance Criteria

1. THE Content Generator SHALL produce Vietnamese source text that reads naturally as if written by a native speaker
2. THE Content Generator SHALL use vocabulary and grammar structures appropriate to the specified difficulty level
3. THE Content Generator SHALL avoid literal translations or awkward phrasing in Vietnamese text
4. THE Content Generator SHALL incorporate cultural context and authentic expressions where appropriate
5. THE Content Generator SHALL ensure proper Vietnamese diacritics and punctuation throughout all text

### Requirement 3

**User Story:** As a beginner learner, I want exercises with simple vocabulary and sentence structures, so that I can build foundational translation skills

#### Acceptance Criteria

1. WHEN generating beginner exercises, THE Content Generator SHALL use common everyday vocabulary
2. WHEN generating beginner exercises, THE Content Generator SHALL limit sentence complexity to simple and compound sentences
3. WHEN generating beginner exercises, THE Content Generator SHALL focus on present tense and basic past tense constructions
4. WHEN generating beginner exercises, THE Content Generator SHALL provide 2-4 hints per exercise to support learning
5. WHEN generating beginner exercises, THE Content Generator SHALL include 3-5 expected keywords that represent core vocabulary

### Requirement 4

**User Story:** As an intermediate learner, I want exercises with moderate complexity and varied topics, so that I can expand my translation capabilities

#### Acceptance Criteria

1. WHEN generating intermediate exercises, THE Content Generator SHALL use a broader vocabulary range including less common terms
2. WHEN generating intermediate exercises, THE Content Generator SHALL incorporate complex sentences with subordinate clauses
3. WHEN generating intermediate exercises, THE Content Generator SHALL include multiple tenses and conditional structures
4. WHEN generating intermediate exercises, THE Content Generator SHALL provide 2-3 hints per exercise focusing on nuanced language points
5. WHEN generating intermediate exercises, THE Content Generator SHALL include 4-6 expected keywords representing key concepts

### Requirement 5

**User Story:** As an advanced learner, I want exercises with sophisticated language and abstract concepts, so that I can achieve fluency in translation

#### Acceptance Criteria

1. WHEN generating advanced exercises, THE Content Generator SHALL use sophisticated vocabulary including idiomatic expressions
2. WHEN generating advanced exercises, THE Content Generator SHALL create complex multi-clause sentences with varied structures
3. WHEN generating advanced exercises, THE Content Generator SHALL incorporate abstract concepts and nuanced meanings
4. WHEN generating advanced exercises, THE Content Generator SHALL provide 1-2 hints per exercise focusing on subtle distinctions
5. WHEN generating advanced exercises, THE Content Generator SHALL include 5-8 expected keywords representing advanced terminology

### Requirement 6

**User Story:** As a content maintainer, I want exercises organized in manageable JSON files, so that I can easily review and update content

#### Acceptance Criteria

1. THE Exercise System SHALL store exercises in separate JSON files for each category-level combination
2. THE Exercise System SHALL maintain the existing directory structure (beginner/, intermediate/, advanced/)
3. THE Exercise System SHALL ensure each JSON file contains valid, properly formatted JSON
4. THE Exercise System SHALL include all required fields for each exercise (id, title, level, category, description, sourceText, highlightedSentences, hints, expectedKeywords)
5. THE Exercise System SHALL follow the existing naming convention for exercise files (e.g., daily-life.json)

### Requirement 7

**User Story:** As a learner, I want exercises that cover diverse topics within each category, so that I encounter varied contexts and vocabulary

#### Acceptance Criteria

1. THE Content Generator SHALL create exercises covering at least 10 distinct sub-topics within each category
2. THE Content Generator SHALL vary the context and scenario for exercises within the same category
3. THE Content Generator SHALL avoid repetitive themes or overly similar content
4. THE Content Generator SHALL ensure topic diversity increases with the number of exercises in each category
5. THE Content Generator SHALL balance practical, everyday topics with more specialized or creative content

### Requirement 8

**User Story:** As a learner, I want exercise titles and descriptions that clearly indicate the content, so that I can select appropriate practice material

#### Acceptance Criteria

1. THE Exercise System SHALL provide a unique, descriptive title for each exercise
2. THE Exercise System SHALL include a brief description explaining the translation task
3. THE Exercise System SHALL ensure titles are concise (under 60 characters)
4. THE Exercise System SHALL ensure descriptions clearly indicate the topic and context
5. THE Exercise System SHALL write titles and descriptions in English for accessibility
