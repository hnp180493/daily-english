import { Injectable } from '@angular/core';
import { ExerciseContext } from '../../models/ai.model';
import { PronunciationContext } from '../../models/pronunciation.model';
import { WritingPrompt } from '../../models/writing.model';
import { GrammarLesson } from '../../models/review.model';

@Injectable({
  providedIn: 'root'
})
export class PromptService {
  buildAnalysisPrompt(
    userInput: string,
    sourceText: string,
    context: ExerciseContext,
    fullContext: string,
    translatedContext: string,
    translateToVietnamese: boolean = false
  ): string {
    const fullContextEN: string = context.englishText;

    const languageInstruction = translateToVietnamese
      ? `
LANGUAGE INSTRUCTION:
- Write ALL explanations in Vietnamese.
- Keep originalText and suggestion in English.
- Use a natural, friendly tone.
`
      : '';

    return `You are a friendly English teacher evaluating a Vietnamese → English translation.
${languageInstruction}
EVALUATION APPROACH:
- Be FLEXIBLE: Accept synonyms and alternative phrasings (customer/client, thanks/thank you, great/wonderful, etc.)
- Full Paragraph (EN) is a REFERENCE, not the only correct answer
- Only report CLEAR ERRORS: wrong meaning, actual grammar mistakes, spelling errors
- If the student's sentence is natural and correct English, give 100% even if wording differs from reference

WHAT IS NOT AN ERROR:
- Using synonyms (customer/client, finish/end, big/large)
- Different but correct phrasing (thanks/thank you, Hello/Hi)
- Style preferences (formal vs informal if both are acceptable)

SCORING (start 100, deduct for EACH error):
- Wrong meaning/missing key info: -15 to -25
- Grammar/structure error (wrong word order, missing words): -15 to -25
- Wrong word form (you/your, patient/patience): -10 to -15
- Spelling error: -5 to -10

IMPORTANT: Deduct points for EACH separate error. Multiple errors = multiple deductions.

RULES:
- Each error reported ONCE only (no duplicates)
- Never suggest same word as replacement
- If unsure whether something is an error, it's probably NOT an error

=== OUTPUT FORMAT (STREAMING JSONL) ===
{"accuracyScore": <number>}
{"type": "<type>", "suggestion": "<CORRECT text to use>", "explanation": "<why it's wrong>"}
[END]

IMPORTANT: "suggestion" must contain the CORRECT phrase, NOT the wrong phrase.

type: grammar | vocabulary | spelling | meaning | tense
If score = 100, output score then [END] immediately.

=== INPUT ===
Full Paragraph (VN): ${fullContext}
Full Paragraph (EN): ${fullContextEN}
Current Sentence (VN): ${sourceText}
Student Translation (EN): ${userInput}
`;
  }

  buildHintPrompt(
    sourceText: string,
    userInput: string,
    previousHints: string[],
    context: ExerciseContext,
    fullContext?: string,
    translateToVietnamese: boolean = false
  ): string {
    const correctAnswer = context.englishText;
    const languageInstruction = translateToVietnamese
      ? '\n\nIMPORTANT: Respond in Vietnamese. Be direct and specific.'
      : '';

    let prompt = `You are an English teacher. Compare these two sentences:

Correct: ${correctAnswer}
Student: ${userInput || '(empty)'}`;

    if (previousHints.length > 0) {
      prompt += `\n\nPrevious hints:\n${previousHints.map((h, i) => `${i + 1}. ${h}`).join('\n')}`;
    }

    const hintNumber = previousHints.length + 1;
    
    const exampleFormat = translateToVietnamese
      ? `Example format:
   - "Bạn thiếu từ 'for' trước 'the bus'"
   - "Sai động từ: phải dùng 'get on' thay vì 'go'"
   - "Thiếu giới từ 'at' trước 'the station'"`
      : `Example format:
   - "You're missing 'for' before 'the bus'"
   - "Wrong verb: use 'get on' instead of 'go'"
   - "Missing preposition 'at' before 'the station'"`;
    
    prompt += `\n\nThis is hint #${hintNumber} of 3. Give ONLY ONE specific correction:

${hintNumber === 1 ? `Tell them EXACTLY what word/phrase is wrong or missing.
${exampleFormat}` : ''}

${hintNumber === 2 ? 'Point out another specific error with the exact fix.' : ''}

${hintNumber === 3 ? `Show the complete correct answer: **${correctAnswer}**` : ''}

Rules:
- Give ONLY ONE hint, not multiple hints
- Be VERY specific about what's wrong
- Tell them the exact word/phrase to add or change
- Don't list multiple corrections${languageInstruction}

Response format: Just one sentence with the correction.`;

    return prompt;
  }

  buildSystemPrompt(): string {
    return 'You are an English language teacher providing feedback on student translations. Always respond with valid JSON.';
  }

  buildPronunciationPrompt(context: PronunciationContext): string {
    const words = this.extractWords(context.expectedText);
    const wordListJson = JSON.stringify(words);

    return `You are an English pronunciation coach for Vietnamese learners. You will listen to an audio recording of a student reading the EXACT expected sentence below, then return STRICT JSON feedback grounded in what you actually heard.

Student level: ${context.level}
Expected sentence: "${context.expectedText}"
Words in the expected sentence (lowercase, in order): ${wordListJson}

============================================================
CRITICAL ANTI-HALLUCINATION RULES — read carefully
============================================================
1. EVERY word you mention in "perWordFeedback" MUST come from the list above. NEVER add words that are not in that list.
2. EVERY word you quote inside "pronunciationIssues" / "strengths" / "rawFeedback" (in quotes or otherwise) MUST come from the list above. Do NOT invent example words like "thought", "think", "the" unless they actually appear in the list.
3. EVERY phoneme you mention (e.g. /θ/, /ð/, /r/, final /t/, /g/, /ŋ/) MUST be a phoneme that actually occurs in one of the listed words. If /θ/ is not present, do NOT mention /θ/.
4. Base every comment EXCLUSIVELY on what you heard in the audio vs. the expected sentence. Do not generate generic Vietnamese-learner advice that is not supported by the audio.
5. If you cannot hear the audio clearly (silent / too short / wrong sentence), return overallScore 0 and explain politely in rawFeedback. Leave the arrays empty.

============================================================
COMMON VIETNAMESE-LEARNER PITFALLS — only mention if relevant
============================================================
- /θ/ (voiceless th) and /ð/ (voiced th): ONLY if the word list contains a word with these sounds (e.g. "think", "the", "this").
- Dropped final consonants (e.g. final /t/, /d/, /k/, /s/, /z/, /n/): ONLY if the relevant word ends with that consonant.
- /r/ vs /l/ confusion: ONLY if the word list contains /r/ or /l/.
- Word stress, sentence rhythm, vowel length, linking: comment ONLY if you actually heard a deviation.

============================================================
OUTPUT — single JSON object, no markdown fences
============================================================
{
  "overallScore": <0-100 integer>,
  "pronunciationIssues": ["<short Vietnamese bullet about 1 real issue you heard>", ...],
  "strengths": ["<short Vietnamese bullet about 1 real strength>", ...],
  "perWordFeedback": [
    {"word": "<one of the allowed words>", "ok": true},
    {"word": "<one of the allowed words>", "ok": false, "issue": "<short Vietnamese note>"}
  ]
}

Format rules:
- All commentary MUST be in Vietnamese.
- DO NOT add any summary / intro / outro paragraph — the bullet arrays already convey everything.
- Each bullet in pronunciationIssues / strengths must be short (≤ 18 Vietnamese words). No repetition between bullets and per-word issues.
- "perWordFeedback" MUST list every word in the same order as the "Words in the expected sentence" list — no additions, no omissions, no reordering.
- If pronunciation is excellent, still list at least 1 strength.
- Output JSON only — no markdown, no prose before/after.`;
  }

  buildWritingPrompt(prompt: WritingPrompt, essay: string, wordCount: number): string {
    const targetRange = `${prompt.wordCountTarget.min}-${prompt.wordCountTarget.max}`;
    const guiding = (prompt.guidingQuestions || []).map((q, i) => `  ${i + 1}. ${q}`).join('\n');

    return `You are an experienced English writing teacher grading a Vietnamese learner's essay using a 4-category rubric.

================================================================
ESSAY PROMPT (the student was given this)
================================================================
Title: ${prompt.title}
Level: ${prompt.level}
Type: ${prompt.type}
Word count target: ${targetRange}
Prompt: ${prompt.prompt}
${guiding ? `Guiding questions:\n${guiding}` : ''}

================================================================
STUDENT'S ESSAY (${wordCount} words)
================================================================
${essay}

================================================================
RUBRIC — 4 categories, 0-9 each (IELTS-style)
================================================================
1. taskAchievement: Does the essay answer ALL parts of the prompt? Are ideas relevant, developed, supported?
2. coherenceCohesion: Is the essay logically organized? Are paragraphs clear? Are linking words used naturally?
3. lexicalResource: Range and accuracy of vocabulary. Natural collocation. Avoidance of repetition.
4. grammar: Grammatical range and accuracy. Sentence variety. Punctuation.

Scoring guide:
- 0-3: very weak — many issues, hard to understand
- 4-5: weak to fair — comprehensible but with frequent errors
- 6-7: good — mostly clear, occasional errors
- 8-9: excellent — very few errors, sophisticated

Be HONEST but ENCOURAGING. Do not inflate scores. If word count is well below the target, lower taskAchievement.

================================================================
OUTPUT FORMAT (single JSON object, NO markdown fences)
================================================================
{
  "scores": {
    "taskAchievement": <0-9 number, can use 0.5 increments>,
    "coherenceCohesion": <0-9>,
    "lexicalResource": <0-9>,
    "grammar": <0-9>
  },
  "overallComment": "<2-3 sentences in Vietnamese summarizing the essay overall>",
  "strengths": ["<bullet in Vietnamese>", ...],
  "improvements": ["<bullet in Vietnamese>", ...],
  "errors": [
    {
      "type": "grammar|vocabulary|spelling|meaning|tense|structure",
      "wrong": "<exact text from the essay>",
      "right": "<corrected version>",
      "explanation": "<short Vietnamese explanation>"
    }
  ]
}

Rules:
- All commentary in Vietnamese, except "wrong"/"right" which keep English exactly as in the essay.
- 3-5 strengths, 3-5 improvements, up to 5 most important errors. Quote "wrong" EXACTLY from the essay (no paraphrasing).
- If essay is below 40 words or off-topic, still grade fairly — likely 0-3 across categories — but explain politely.
- Output JSON only, no prose before/after, no markdown fences.`;
  }

  buildLessonPracticePrompt(lesson: GrammarLesson, count: number, exclude: string[]): string {
    const level = lesson.level || 'intermediate';
    const ruleSummary = lesson.tldr?.rule || lesson.rule;
    const examples = (lesson.examples || []).slice(0, 4).map((e) => `  - ${e}`).join('\n');
    const excludeList = exclude.length > 0
      ? `\n\nDO NOT repeat or paraphrase these (already shown to the user):\n${exclude.map((s) => `  - ${s}`).join('\n')}`
      : '';

    return `You are an English teacher generating fresh translation practice for a Vietnamese learner.

============================================================
LESSON CONTEXT
============================================================
Lesson: ${lesson.title}
Level: ${level}
Grammar rule: ${ruleSummary}

Reference examples (do NOT copy verbatim):
${examples}
${excludeList}

============================================================
YOUR TASK
============================================================
Generate ${count} NEW Vietnamese → English translation pairs that:

1. **MUST** practice the lesson's grammar rule above. Every English sentence MUST clearly demonstrate the rule (e.g. for "Verb Tenses" use the right tense + signal word; for "Conditionals" use a complete if-clause).
2. Match the ${level} level — simple vocabulary for beginner, broader for advanced.
3. Use real-life everyday situations (work, family, food, travel, study, hobbies). Avoid abstract or academic topics.
4. Each English sentence: natural, between 6 and 16 words, no obscure idioms.
5. Each Vietnamese sentence: natural Vietnamese, what a Vietnamese speaker would actually say.
6. Add a short "hint" (≤ 12 words, in English) only if the grammar trap is non-obvious.

============================================================
OUTPUT FORMAT — strict JSON, no markdown fences
============================================================
{
  "items": [
    {
      "vietnamese": "<Vietnamese sentence>",
      "english": "<English translation>",
      "hint": "<optional short hint, omit field if not needed>"
    }
  ]
}

Rules:
- Output ${count} items.
- JSON ONLY — no prose before/after, no \`\`\` fences.
- "vietnamese" must NOT contain English; "english" must NOT contain Vietnamese.
- Don't repeat the reference examples or the exclude list.`;
  }

  /**
   * Extract whitespace-separated lowercase tokens (keep alphanumerics, apostrophes, hyphens).
   */
  private extractWords(text: string): string[] {
    if (!text) return [];
    return text
      .toLowerCase()
      .split(/\s+/)
      .map(w => w.replace(/[^a-z0-9'\-]+/g, ''))
      .filter(w => w.length > 0);
  }
}
