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

    return `You are a strict English teacher evaluating a Vietnamese → English translation.
${languageInstruction}
TASK: Evaluate ONLY the Student Translation. Do NOT rewrite other sentences.

REFERENCE: Use Full Paragraph (EN) as the ONLY reference for meaning and tense.

TENSE RULE:
- Match tense from Full Paragraph (EN), not Vietnamese text.
- 3rd-person singular differences (spread → spreads) = minor grammar, NOT tense error.

SCORING (start 100):
- Tense error: -5 to -10
- Meaning change: -15 to -25
- Missing detail: -10 to -20
- Grammar/structure: -5 to -15
- Unnatural word choice: -5 to -15
- Spelling: -5 to -15

FEEDBACK STYLE: Sound like a teacher talking to a student. No technical jargon.

=== OUTPUT FORMAT (STREAMING JSONL) ===
Output EXACTLY in this format, one JSON per line:
{"accuracyScore": <number>}
{"type": "<type>", "suggestion": "<text>", "explanation": "<text>"}
{"type": "<type>", "suggestion": "<text>", "explanation": "<text>"}
[END]

Rules:
- First line MUST be the score object
- Each feedback item on its own line
- End with [END] marker
- type: grammar | vocabulary | structure | spelling | suggestion | tense | meaning
- If score = 100, output score line then [END] immediately

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
