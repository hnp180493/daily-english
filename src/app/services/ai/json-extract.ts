/**
 * Tolerant JSON extraction for LLM output.
 *
 * Models often wrap JSON in markdown fences (not always at the very start), add a
 * sentence before/after it, or leave a trailing comma. This strips fences anywhere,
 * slices from the first '{' to the last '}', and retries once without trailing commas.
 */

/** Remove markdown code fences (```json, ``` …) wherever they appear. */
export function stripCodeFences(text: string): string {
  return text.replace(/```[a-zA-Z0-9_-]*[ \t]*\r?\n?/g, '').trim();
}

/** Remove trailing commas before a closing brace/bracket. Only used as a repair step. */
export function removeTrailingCommas(json: string): string {
  return json.replace(/,(\s*[}\]])/g, '$1');
}

/**
 * Return the substring from the first '{' to the last '}' of the fence-stripped text,
 * or null when there is no JSON object in it.
 */
export function extractJsonObjectText(text: string): string | null {
  const cleaned = stripCodeFences(text || '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  return cleaned.slice(start, end + 1);
}

/**
 * Parse the JSON object contained in an LLM response.
 * Throws an Error mentioning "JSON" when nothing parseable is found.
 */
export function parseJsonObject<T = any>(text: string): T {
  const candidate = extractJsonObjectText(text);
  if (candidate === null) {
    throw new Error('AI response does not contain a JSON object');
  }
  try {
    return JSON.parse(candidate) as T;
  } catch (firstErr) {
    try {
      return JSON.parse(removeTrailingCommas(candidate)) as T;
    } catch {
      const reason = firstErr instanceof Error ? firstErr.message : String(firstErr);
      throw new Error(`AI response is not valid JSON: ${reason}`);
    }
  }
}
