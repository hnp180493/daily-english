# Design Document

## Overview

This design outlines the approach for expanding the exercise content library from approximately 100 exercises to over 720 exercises (30+ per category/level combination). The expansion will be achieved through a systematic content generation process that ensures natural Vietnamese text, appropriate difficulty scaling, and diverse topics while maintaining the existing JSON structure.

## Architecture

### Content Generation Strategy

The expansion will follow a **batch generation approach** with quality validation:

1. **Template-Based Generation**: Create content generation templates for each level that define:
   - Vocabulary complexity guidelines
   - Sentence structure patterns
   - Topic diversity requirements
   - Hint formulation strategies

2. **Category-Specific Content**: Generate exercises tailored to each of the 8 categories:
   - daily-life: Personal routines, family, home, shopping, leisure
   - education-work: School, career, workplace, professional development
   - culture-arts: Music, literature, traditions, entertainment, festivals
   - health-wellness: Physical health, mental health, fitness, nutrition
   - science-environment: Technology, nature, climate, innovation
   - society-services: Community, public services, social issues, government
   - travel-transportation: Tourism, commuting, geography, cultural exchange
   - philosophy-beliefs: Ethics, religion, history, values, worldview

3. **Quality Assurance**: Each generated exercise will be validated for:
   - Natural Vietnamese language flow
   - Appropriate difficulty level
   - Unique content (no duplication)
   - Complete required fields
   - Valid JSON structure

### File Organization

Maintain the existing structure:
```
public/data/exercises/
├── beginner/
│   ├── daily-life.json (30+ exercises)
│   ├── education-work.json (30+ exercises)
│   ├── culture-arts.json (30+ exercises)
│   ├── health-wellness.json (30+ exercises)
│   ├── science-environment.json (30+ exercises)
│   ├── society-services.json (30+ exercises)
│   ├── travel-transportation.json (30+ exercises)
│   └── philosophy-beliefs.json (30+ exercises)
├── intermediate/ (same structure)
└── advanced/ (same structure)
```

## Components and Interfaces

### Exercise Data Model

Each exercise follows this structure:

```typescript
interface Exercise {
  id: string;                    // Format: "ex-XXX" (unique sequential number)
  title: string;                 // Concise, descriptive (< 60 chars)
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;              // One of 8 categories
  description: string;           // Brief explanation of the task
  sourceText: string;            // Vietnamese text to translate
  highlightedSentences: string[]; // Key sentences for focus
  hints: string[];               // 1-4 hints depending on level
  expectedKeywords: string[];    // 3-8 keywords depending on level
}
```

### Content Generation Guidelines by Level

#### Beginner Level
- **Vocabulary**: 500-1000 most common Vietnamese words
- **Sentence Length**: 5-15 words per sentence
- **Complexity**: Simple present, past, future tenses
- **Topics**: Concrete, everyday situations
- **Source Text Length**: 50-150 words
- **Hints**: 2-4 hints per exercise (supportive)
- **Keywords**: 3-5 keywords (basic vocabulary)
- **Example Topics**:
  - Morning routines and daily activities
  - Family members and relationships
  - Food and meals
  - Weather and seasons
  - Simple hobbies and interests

#### Intermediate Level
- **Vocabulary**: 1000-3000 words including less common terms
- **Sentence Length**: 10-25 words per sentence
- **Complexity**: Multiple tenses, conditional structures, compound sentences
- **Topics**: Mix of concrete and abstract concepts
- **Source Text Length**: 100-250 words
- **Hints**: 2-3 hints per exercise (focused on nuances)
- **Keywords**: 4-6 keywords (broader vocabulary)
- **Example Topics**:
  - Work-life balance and career development
  - Social issues and community involvement
  - Cultural practices and traditions
  - Health and wellness strategies
  - Technology impact on daily life

#### Advanced Level
- **Vocabulary**: 3000+ words including idiomatic expressions
- **Sentence Length**: 15-40 words per sentence
- **Complexity**: Complex subordinate clauses, passive voice, abstract concepts
- **Topics**: Abstract, philosophical, specialized
- **Source Text Length**: 150-400 words
- **Hints**: 1-2 hints per exercise (subtle distinctions)
- **Keywords**: 5-8 keywords (sophisticated terminology)
- **Example Topics**:
  - Philosophical debates and ethical dilemmas
  - Economic theories and business strategies
  - Scientific discoveries and innovations
  - Cultural identity and globalization
  - Environmental policy and sustainability

### Vietnamese Language Quality Standards

To ensure natural, native-like Vietnamese:

1. **Authentic Expressions**: Use common Vietnamese idioms and colloquialisms appropriate to the level
2. **Natural Flow**: Avoid word-for-word translations from English
3. **Cultural Context**: Incorporate Vietnamese cultural references and perspectives
4. **Proper Grammar**: Use correct Vietnamese grammar structures
5. **Diacritics**: Ensure all Vietnamese diacritical marks are accurate
6. **Tone**: Match the formality level to the context (informal for daily-life, formal for philosophy-beliefs)

### Topic Diversity Strategy

For each category, create at least 10 distinct sub-topics to ensure variety:

**Example for daily-life category:**
1. Morning routines
2. Meal preparation and eating
3. Shopping experiences
4. Family interactions
5. Household chores
6. Leisure activities
7. Pet care
8. Neighborhood life
9. Personal habits
10. Weekend activities
11. Celebrations and gatherings
12. Communication with friends
13. Personal finance management
14. Home organization
15. Seasonal activities

## Data Models

### ID Generation Pattern

Exercise IDs follow sequential numbering:
- Current range: ex-001 to ex-101
- New range: ex-001 to ex-1200+
- Format: `ex-` + zero-padded 3-digit number (expand to 4 digits if needed)

### File Size Considerations

Each JSON file will contain 30+ exercises:
- Estimated file size: 20-50 KB per file
- Total: 24 files × 20-50 KB = 0.5-1.2 MB total
- Manageable for version control and loading

## Error Handling

### Validation Checks

1. **JSON Validity**: Ensure all files are valid JSON
2. **Required Fields**: Verify all exercises have complete data
3. **Unique IDs**: Check for duplicate exercise IDs
4. **Level Consistency**: Verify level field matches file location
5. **Category Consistency**: Verify category field matches filename
6. **Vietnamese Encoding**: Ensure proper UTF-8 encoding for diacritics

### Quality Assurance Process

1. **Automated Checks**:
   - JSON schema validation
   - Field completeness check
   - ID uniqueness verification
   - Character encoding validation

2. **Manual Review** (sample-based):
   - Vietnamese language naturalness
   - Difficulty appropriateness
   - Topic diversity
   - Hint relevance
   - Keyword accuracy

## Testing Strategy

### Content Validation

1. **Structure Tests**:
   - Verify JSON parsing succeeds for all files
   - Confirm all required fields are present
   - Check ID format and uniqueness
   - Validate enum values (level, category)

2. **Quality Tests**:
   - Sample 10% of exercises for manual review
   - Verify Vietnamese text contains proper diacritics
   - Check that difficulty matches level designation
   - Ensure topic diversity within categories

3. **Integration Tests**:
   - Load exercises in the Angular application
   - Verify exercises display correctly
   - Test filtering by level and category
   - Confirm exercise count meets requirements (50+ per combination)

### Test Data Samples

Create a small test set (5 exercises per level) to validate:
- Generation process
- Quality standards
- JSON structure
- Application compatibility

## Implementation Approach

### Phase 1: Template Creation
Create content generation templates and guidelines for each level and category combination.

### Phase 2: Batch Generation
Generate exercises in batches:
- 50 exercises per category/level combination
- Focus on one level at a time (beginner → intermediate → advanced)
- Validate each batch before proceeding

### Phase 3: Quality Review
Review generated content for:
- Vietnamese language quality
- Difficulty appropriateness
- Topic diversity
- Technical correctness

### Phase 4: Integration
- Update JSON files with new exercises
- Verify application loads and displays content correctly
- Update README.md with new exercise counts

## Success Criteria

1. **Quantity**: Minimum 30 exercises per category/level (720+ total)
2. **Quality**: Vietnamese text reads naturally and authentically
3. **Diversity**: At least 10 distinct sub-topics per category
4. **Difficulty**: Appropriate vocabulary and complexity for each level
5. **Structure**: All exercises follow the existing JSON schema
6. **Functionality**: Application loads and displays all exercises correctly

## Maintenance Considerations

### Future Expansion
- ID numbering system supports growth beyond 720 exercises
- File structure allows easy addition of new categories
- Template-based approach enables consistent future content generation

### Content Updates
- Individual exercises can be updated without affecting others
- Category-based file organization simplifies targeted updates
- Version control tracks all content changes

### Localization
- Current design focuses on Vietnamese → English translation
- Structure supports potential addition of other language pairs
- Metadata (titles, descriptions) in English for accessibility
