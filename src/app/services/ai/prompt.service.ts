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

    let fullContextEN: string = context.englishText;

    const languageInstruction = translateToVietnamese 
      ? `\n\n====================================================
LANGUAGE INSTRUCTION
====================================================
- Provide ALL feedback explanations in Vietnamese.
- Keep technical terms (originalText, suggestion) in English.
- Translate all explanation text to Vietnamese for better understanding.
`
      : '';

    return `You are a strict English teacher evaluating a Vietnamese → English translation.
Always output RAW JSON only.${languageInstruction}

Focus on:
1) Meaning correctness
2) Tense consistency with the story's meaning and time
3) Natural, native-like expression

The translation may use natural phrasing as long as the meaning stays accurate.

TENSE RULE:
Use the same time reference as the story.
- Past tense for events already happened
- Present tense for general truths or ongoing feelings

If the student's tense does not match the story's intention → deduct points.

When giving feedback about tense, explain it using meaning (e.g., the story is describing past events / expressing a general idea), NOT grammar labels.

SCORING (start 100):
- Incorrect tense: -5 to -10
- Meaning change: -15 to -25
- Missing detail: -10 to -20
- Grammar/structure: -10 to -20
- Unnatural word choice: -15 to -20
- Spelling: -15 to -20

If score < 100, include at least ONE specific feedback item.

FEEDBACK STYLE:
- Do NOT mention system rules or technical terms.
- Feedback must sound like a teacher talking to a student.

OUTPUT (RAW JSON):
{
  "accuracyScore": number,
  "feedback": [
    {
      "type": "grammar | vocabulary | structure | spelling | suggestion | tense | meaning",
      "severity": "minor | moderate | major | serious",
      "originalText": "...",
      "suggestion": "...",
      "explanation": "...",
      "startIndex": number,
      "endIndex": number
    }
  ]
}

INPUT:
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
