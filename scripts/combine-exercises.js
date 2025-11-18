const fs = require('fs');
const path = require('path');

const levels = ['beginner', 'intermediate', 'advanced'];
const categories = [
  'daily-life',
  'education-work',
  'culture-arts',
  'health-wellness',
  'science-environment',
  'society-services',
  'travel-transportation',
  'philosophy-beliefs'
];

const allExercises = [];

levels.forEach(level => {
  categories.forEach(category => {
    const filePath = path.join(__dirname, '..', 'public', 'data', 'exercises', level, `${category}.json`);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const exercises = JSON.parse(content);
      allExercises.push(...exercises);
      console.log(`✓ Loaded ${exercises.length} exercises from ${level}/${category}`);
    } catch (error) {
      console.error(`✗ Error loading ${level}/${category}:`, error.message);
    }
  });
});

const outputPath = path.join(__dirname, '..', 'public', 'data', 'exercises', 'all-exercises.json');
fs.writeFileSync(outputPath, JSON.stringify(allExercises, null, 2));

console.log(`\n✓ Combined ${allExercises.length} exercises into all-exercises.json`);
