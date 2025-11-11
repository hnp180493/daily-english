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
    fullContext?: string,
    translatedContext?: string
  ): string {

    return `You are an English language teacher providing feedback on Vietnamese → English translations.
Your job is to evaluate the student's translation of ONE sentence based on the full paragraph context and previous translations.



PRIORITIES (in order):
1. Meaning accuracy
2. Tense and context consistency
3. Grammar and naturalness



RULE 1 - MEANING FIRST:
If the meaning is incorrect, missing, or changed, cap the score at 50.
Only check grammar, vocabulary, or fluency if the meaning is fully correct.



RULE 2 - CONTEXT & TENSE CONSISTENCY:
Use the full paragraph to determine the overall tense and tone.
If other sentences are in past tense, maintain past tense for the current sentence.
Ensure consistency with the student’s previous translation.



SCORING SYSTEM:
Start from 100 points. Apply deductions:
- Wrong or inconsistent tense: -15 to -20
- Wrong nuance or partial meaning: -15
- Awkward phrasing or unnatural tone: -10 to -15
- Missing key idea: -5 to -10
- Grammar or structure error: -5 to -10
- Word choice issue: -5
- Spelling mistake: -15
If meaning is wrong, cap score at 50.
Final accuracyScore = 100 - total deductions (minimum 0).



SCORE INTERPRETATION:
100: Perfect
90–99: Minor issue, natural overall
80–89: Some issues but understandable
70–79: One serious issue
60–69: Several serious issues
≤50: Wrong or changed meaning



OUTPUT REQUIREMENTS:
Always return valid raw JSON only. No Markdown, no text outside the JSON object.
Indices refer to character positions in the student's English translation.
If accuracyScore = 100, feedback may be empty.
If accuracyScore between 90 and 99, include at least one constructive suggestion.

INPUT FORMAT:
Full Paragraph (VN): ${fullContext}
Student’s Translation So Far (EN): ${translatedContext}
Current Sentence (VN): ${sourceText}
Student Translation (EN): ${userInput}



OUTPUT FORMAT:
{
  "accuracyScore": number,
  "feedback": [
   {
     "type": "grammar|vocabulary|structure|spelling|suggestion",
     "severity": "minor|moderate|major|serious",
     "originalText": "...",
     "suggestion": "...",
     "explanation": "...",
     "startIndex": 0,
     "endIndex": 10
   }
  ]
}
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
