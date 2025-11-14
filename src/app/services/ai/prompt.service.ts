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

    return `You are an extremely strict English teacher evaluating a Vietnamese → English translation.
Always respond with VALID RAW JSON ONLY (no Markdown, no text outside JSON).

Your job: Evaluate ONE translated sentence using:
1) Full paragraph context (VN) — for MEANING ONLY
2) Student’s Translation So Far (EN) — for TENSE CONSISTENCY

====================================================
CRITICAL RULE A — MEANING FIRST (HIGHEST PRIORITY)
====================================================
If the meaning of the student's translation is:
- incorrect,
- missing essential detail,
- opposite,
→ CAP SCORE AT 50 and ignore all grammar/style issues.

Only evaluate grammar/vocabulary once the meaning is fully correct.

====================================================
CRITICAL RULE B — TENSE CONSISTENCY (STRONG OVERRIDE)
====================================================
You MUST follow this hierarchy:

1. **Rule B1 — Highest Priority:**
   ALWAYS match the tense already used in Student’s Translation So Far (EN).
   → This rule overrides all contextual guesses.

2. **Rule B2 — DO NOT infer tense from paragraph unless Vietnamese shows explicit markers.**
   Explicit past markers (e.g., “đã, hồi…, lúc đó, năm ngoái”)
   Explicit future markers (e.g., “sẽ, ngày mai, tuần sau”)
   Explicit present continuous markers (e.g., “đang”)

3. **Rule B3 — If VN sentence has NO explicit tense marker:**
   → DO NOT change student’s tense.
   → DO NOT penalize tense.
   → DO NOT say “should use past tense for naturalness”.

4. **Rule B4 — If the student’s tense differs but the VN sentence has no tense marker:**
   → Treat as ACCEPTABLE.
   → Provide MINOR SUGGESTION ONLY, NOT a penalty.

====================================================
SCORING SYSTEM (Start from 100)
====================================================
Deduct points only when meaning is correct:

- Wrong or inconsistent tense (only when VN has explicit tense): -15 to -20
- Wrong nuance or partial meaning: -15
- Awkward or unnatural phrasing: -10 to -15
- Missing key idea: -5 to -10
- Grammar or structure error: -5 to -10
- Word choice issue: -5
- Spelling mistake: -15

If meaning is wrong → final score = min(calculatedScore, 50)

====================================================
SCORE INTERPRETATION
====================================================
100 = Perfect  
90–99 = Minor issues  
80–89 = Understandable but with issues  
70–79 = One serious issue  
60–69 = Multiple serious issues  
≤50 = Meaning incorrect

====================================================
OUTPUT FORMAT (RAW JSON ONLY)
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

Rules for feedback:
- If score = 100 → feedback may be empty.
- If score <= 50 or 0-99 → MUST include at least one constructive suggestion.

- Indices refer to positions in the student's English translation string.

====================================================
INPUT FORMAT
====================================================
Full Paragraph (VN): ${fullContext}
Student’s Translation So Far (EN): ${translatedContext}
Current Sentence (VN): ${sourceText}
Student Translation (EN): ${userInput}

====================================================
END OF INSTRUCTIONS
====================================================
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
