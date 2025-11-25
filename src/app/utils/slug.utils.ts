/**
 * Convert text to SEO-friendly slug
 * Example: "The Little Joy of a Child's Laugh" -> "the-little-joy-of-a-childs-laugh"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate SEO-friendly URL slug for exercise
 * Format: {title-slug}-{level}-{id}
 * Example: "the-little-joy-of-a-childs-laugh-beginner-ex-001"
 */
export function generateExerciseSlug(title: string, level: string, id: string): string {
  const titleSlug = slugify(title);
  const levelSlug = slugify(level);
  const idSlug = id.replace('ex-', ''); // Remove 'ex-' prefix
  
  return `${titleSlug}-${levelSlug}-${idSlug}`;
}

/**
 * Extract exercise ID from slug
 * Example: "the-little-joy-of-a-childs-laugh-beginner-001" -> "ex-001"
 */
export function extractIdFromSlug(slug: string): string {
  // Get the last part after the last hyphen (should be the ID number)
  const parts = slug.split('-');
  const idNumber = parts[parts.length - 1];
  
  // If it's a valid number, return with 'ex-' prefix
  if (/^\d+$/.test(idNumber)) {
    return `ex-${idNumber}`;
  }
  
  // Fallback: try to find pattern like "beginner-001" or "intermediate-002"
  const match = slug.match(/-(beginner|intermediate|advanced)-(\d+)$/);
  if (match) {
    return `ex-${match[2]}`;
  }
  
  // Last resort: return the slug as-is (might be old format)
  return slug;
}
