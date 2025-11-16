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
  ): string {

    let englishText: string = context.englishText;

    return `You are a strict English teacher evaluating a Vietnamese → English translation.
Always output RAW JSON only.

Your evaluation focuses on three things:
1) Meaning correctness (but allow natural rephrasing)
2) Tense and contextual consistency
3) Grammar and natural, native-like expression

The translation does NOT need to follow the Vietnamese wording literally.
Natural English phrasing is allowed—and preferred—as long as the core meaning is preserved.

====================================================
SCORING (start from 100)
====================================================
Deduct points based on:
- Incorrect tense: -5 to -10
- Meaning distortion or missing key idea: -10 to -20
- Missing important detail: -5 to -10
- Grammar or structural error: -10 to -20
- Awkward or unnatural word choice: -5 to -10
- Spelling mistake: -5 to -15

Meaning errors apply only when the **main idea** is changed or lost.
Minor differences in phrasing are acceptable and should not be penalized.

====================================================
OUTPUT FORMAT (RAW JSON)
====================================================
{
  "accuracyScore": number,
  "feedback": [
    {
      "type": "grammar | vocabulary | structure | spelling | suggestion",
      "severity": "minor | moderate | major | serious",
      "originalText": "...",
      "suggestion": "...",
      "explanation": "...",
      "startIndex": number,
      "endIndex": number
    }
  ]
}

====================================================
INPUT
====================================================
Full Paragraph (VN): ${fullContext}
Full Paragraph (EN): ${englishText}
Current Sentence (VN): ${sourceText}
Student Translation (EN): ${userInput}
`;
  }

  buildHintPrompt(
    sourceText: string,
    userInput: string,
    previousHints: string[],
    context: ExerciseContext,
    fullContext?: string
  ): string {
    const contextSection = fullContext ? `
Full Paragraph Context (for understanding):
${fullContext}

Sentence to Translate (highlighted):
${sourceText}
` : `Source Text: ${sourceText}`;

    let prompt = `You are helping a ${context.level} level student translate this sentence to English:

${contextSection}`;

    if (userInput) {
      prompt += `\n\nStudent's current attempt: ${userInput}`;
    }

    if (previousHints.length > 0) {
      prompt += `\n\nPrevious hints given:\n${previousHints.map((h, i) => `${i + 1}. ${h}`).join('\n')}`;
    }

    prompt += `\n\nProvide ONE specific, progressive hint to help the student improve their translation. The hint should:
- Be different from previous hints
- Be more specific than previous hints if this is not the first hint
- Focus on grammar, vocabulary, or sentence structure
- Not give away the complete answer
- Be encouraging and educational

Respond with ONLY the hint text, no additional formatting or explanation.`;

    return prompt;
  }

  buildSystemPrompt(): string {
    return 'You are an English language teacher providing feedback on student translations. Always respond with valid JSON.';
  }
}
