/**
 * Script to fix broken custom exercise sentences
 * Run this in browser console to fix the exercise data
 */

function fixCustomExerciseSentences() {
  // Get custom exercises from localStorage
  const customExercisesStr = localStorage.getItem('custom-exercises');
  if (!customExercisesStr) {
    console.log('No custom exercises found');
    return;
  }

  const customExercises = JSON.parse(customExercisesStr);
  console.log(`Found ${customExercises.length} custom exercises`);

  let fixedCount = 0;

  // Fix each exercise
  customExercises.forEach(exercise => {
    const originalCount = exercise.highlightedSentences?.length || 0;
    
    // Re-extract sentences from sourceText using improved regex
    const sentenceRegex = /[^.!?]+[.!?]+(?=['"]?\s|$)/g;
    const matches = exercise.sourceText.match(sentenceRegex) || [];
    
    // Filter out invalid sentences
    const validSentences = matches
      .map(s => s.trim())
      .filter(s => {
        const cleanSentence = s.replace(/['".,!?]/g, '').trim();
        return cleanSentence.length > 3;
      });

    // Update if different
    if (validSentences.length !== originalCount || 
        JSON.stringify(validSentences) !== JSON.stringify(exercise.highlightedSentences)) {
      exercise.highlightedSentences = validSentences;
      exercise.updatedAt = new Date().toISOString();
      fixedCount++;
      
      console.log(`Fixed exercise: ${exercise.title}`);
      console.log(`  Before: ${originalCount} sentences`);
      console.log(`  After: ${validSentences.length} sentences`);
    }
  });

  if (fixedCount > 0) {
    // Save back to localStorage
    localStorage.setItem('custom-exercises', JSON.stringify(customExercises));
    console.log(`✅ Fixed ${fixedCount} exercise(s)`);
    console.log('Please refresh the page to see changes');
  } else {
    console.log('No exercises needed fixing');
  }
}

// Run the fix
fixCustomExerciseSentences();
