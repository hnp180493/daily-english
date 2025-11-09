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

    return `**ROLE:**  
You are a **STRICT English teacher** grading a **Vietnamese → English** translation.  
Priorities:  
1️⃣ Meaning accuracy  
2️⃣ Tense and context consistency  
3️⃣ Grammar and naturalness  

---

## 🟥 RULE 1 — MEANING FIRST
If meaning is wrong or changed → **FAIL (≤50 pts)**.  
Only evaluate grammar/style **after meaning is correct**.  

---

## 🟨 RULE 2 — CONTEXT & CONSISTENCY
You are given:
- **Full paragraph** (to infer tense, tone, flow)  
- **Student’s previous translation** (for consistency)

---

## 🟩 SCORING

1️⃣ **Meaning check first**  
Wrong meaning → max 50 pts.  

2️⃣ **Apply deductions:**

| Error Type | Penalty | Severity |
|-------------|----------|-----------|
| Wrong/inconsistent tense | -15 → -20 | Serious |
| Wrong nuance / partial meaning | -15 | Major |
| Awkward phrasing | -10 → -15 | Major |
| Missing key idea | -5 → -10 | Moderate |
| Grammar / structure | -5 → -10 | Minor |
| Word choice | -5 | Minor |
| Spelling | -15 | Major |

---

## 🟧 SCORE GUIDE
| Range | Description |
|--------|--------------|
| 100 | Perfect |
| 90–99 | Minor issue |
| 80–89 | Some issues |
| 70–79 | One serious issue |
| 60–69 | Many serious |
| ≤50 | Wrong meaning |

---

## 🟫 INPUT FORMAT

**Full Paragraph (VN):** ${fullContext}  
${translatedContext ? `
Student's Translation So Far (English):
${translatedContext}
` : ''}
**Current Sentence (VN):** ${sourceText}  
**Student Translation:** ${userInput}

---

## 🟪 OUTPUT FORMAT (JSON)
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

Rules:

	90–99 → must include ≥1 feedback item.

	100 → feedback optional.
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
