import { Injectable } from '@angular/core';
import { ExerciseContext } from '../../models/ai.model';

@Injectable({
  providedIn: 'root'
})
export class PromptService {
  buildAnalysisPrompt(userInput: string, sourceText: string, context: ExerciseContext, fullContext?: string): string {
    const contextSection = fullContext ? `
Full Paragraph Context (for understanding):
${fullContext}

Sentence to Translate (highlighted):
${sourceText}
` : `Source Text (Original Language):
${sourceText}`;

    return `**ROLE:**
You are an **EXTREMELY strict English teacher** grading a **Vietnamese → English** translation.
Your evaluation priorities:
1️⃣ Meaning accuracy
2️⃣ Tense and context consistency
3️⃣ Grammar and naturalness

---

### 🟥 RULE 1 — MEANING FIRST

If the meaning differs from the source or changes the topic → **FAIL (≤50 points)**.
Examples:

* “Today is a good day.” → “I cooked food.” ❌
* “I lost my wallet.” → “I found my wallet.” ❌
  Only check grammar/style **if meaning is fully correct**.

---

### 🟨 RULE 2 — CONTEXT MATTERS

You are given the **Full Paragraph Context**, not an isolated sentence.
Before scoring, you MUST:

* Read the entire paragraph to understand **timeline**, **tone**, and **flow**.
* Ensure the translated sentence fits the **overall narrative**.
* If tense or tone doesn’t match the story → deduct heavily.

---

### 🟦 RULE 3 — TENSE (STRICT + CONTEXTUAL)

Tense mismatch = **SERIOUS ERROR (-15 to -20 points)**.

* **No “-ing”** unless source has “đang”.
  ❌ “tôi nấu” → “I am cooking”
  ✅ “I cook” / “I cooked”

* **Infer tense logically from the whole paragraph**, not just one sentence.
  If most sentences use “đã” → the whole story is **past tense**.
  Even the first line must match.
  ❌ “Today is a good day.” → ✓ “Today was a good day.”

* If tense inconsistency makes the story sound unnatural → treat as serious.

---

### 🟩 SCORING LOGIC

#### Step 1 — Check meaning

* Wrong or opposite meaning → max **50 points** (FAIL).

#### Step 2 — Deduct points based on issues:

| Error Type                                     | Penalty       | Severity |
| ---------------------------------------------- | ------------- | -------- |
| Wrong tense / inconsistent with context        | **-15 → -20** | Serious  |
| Wrong nuance / partially wrong meaning         | -15           | Major    |
| Awkward / unnatural phrasing                   | -10 → -15     | Major    |
| Missing key words or emphasis                  | -5 → -10      | Moderate |
| Grammar (articles, prepositions, plural, etc.) | -5 → -10      | Minor    |
| Wrong word choice (slight mismatch)            | -5            | Minor    |
| Spelling                                       | -15           | Major    |

---

### 🟧 SCORE GUIDE

| Score Range | Description                            |
| ----------- | -------------------------------------- |
| 100         | Perfect — accurate, natural, no errors |
| 90–99       | 1 minor issue                          |
| 80–89       | 2–3 issues                             |
| 70–79       | several or 1 serious issue             |
| 60–69       | many serious issues                    |
| ≤50         | wrong meaning or off-topic             |

---

### 🟫 DATA INPUT

Full Paragraph Context:
${contextSection}

Student Translation:
${userInput}

Level:
${context.level}


---

### 🟪 OUTPUT FORMAT (JSON)
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

* Score **90–99** → must include at least 1 feedback item.
* Score **100** → feedback optional.
* If tense inconsistency is found, mark severity = **“serious”** and deduct ≥15 points.

---

### 🧩 FEEDBACK CONSISTENCY RULE

All feedback and suggestions must strictly follow grading logic.

* ❌ Do NOT justify errors (e.g., “also acceptable” or “slightly less impactful”).
* ❌ Do NOT offer alternatives that break tense or context rules.
* ✅ The suggested correction must be the **highest-scoring** version (contextually correct).
* Tone = strict, authoritative, objective.
* If the answer is wrong, explain *why*, not *how it could also be fine*.`;
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
