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

Your task:
Evaluate ONLY the Student Translation (EN).
Do NOT evaluate, correct, rewrite, or suggest changes for any other English sentences.

Reference rule:
The Full Paragraph (EN) is the ONLY reference for meaning and tense.
You MUST NOT infer tense from the Vietnamese text.

TENSE RULE:
Match the tense used in the Full Paragraph (EN) for the corresponding sentence.
- If the Student Translation matches the tense used in the Full Paragraph (EN), do NOT suggest a tense change.
- If the verb difference is only 3rd-person singular agreement (e.g., spread → spreads), treat it as a minor grammar/verb form issue, NOT a tense error.

Do NOT:
- rewrite the entire paragraph
- normalize tense across the story
- change tense based on the Vietnamese text
- assume the story happened in the past or present unless the Full Paragraph (EN) states it

SCORING (start 100):
- Incorrect tense relative to the Full Paragraph (EN): -5 to -10
- Meaning change: -15 to -25
- Missing detail: -10 to -20
- Grammar/structure: -5 to -15
- Unnatural word choice: -5 to -15
- Spelling: -5 to -15

Meaning errors ONLY apply if the main idea changes.
Minor rephrasing is acceptable.

If score < 100, include at least ONE specific feedback item.

FEEDBACK STYLE:
- Feedback must sound like a teacher talking to a student.
- Do NOT mention system rules, instructions, or technical terms.
- Explain tense issues based on meaning in the Full Paragraph (EN), not grammar labels.

OUTPUT (RAW JSON ONLY):
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
