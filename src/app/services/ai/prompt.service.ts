import { Injectable } from '@angular/core';
import { ExerciseContext } from '../../models/ai.model';

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
}
