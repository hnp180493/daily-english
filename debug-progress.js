// Debug script to check progress in localStorage
// Run this in browser console to check if progress is being saved

function debugProgress() {
  console.log('=== CHECKING LOCALSTORAGE ===');
  
  // Find all keys that start with user_progress_
  const keys = Object.keys(localStorage).filter(key => key.startsWith('user_progress_'));
  
  console.log('Found progress keys:', keys);
  
  keys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const progress = JSON.parse(data);
        console.log(`\nKey: ${key}`);
        console.log('Total Points:', progress.totalPoints);
        console.log('Total Credits:', progress.totalCredits);
        console.log('Attempts:', progress.attempts.length);
        console.log('Last Activity:', progress.lastActivityDate);
        console.log('Current Streak:', progress.currentStreak);
        console.log('Full data:', progress);
      } catch (e) {
        console.error('Failed to parse:', key, e);
      }
    }
  });
  
  console.log('=== END CHECK ===');
}

// Run the debug
debugProgress();

// Also set up a watcher to see when localStorage changes
console.log('\n=== SETTING UP LOCALSTORAGE WATCHER ===');
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  if (key.startsWith('user_progress_')) {
    console.log('[LocalStorage] Setting:', key);
    try {
      const data = JSON.parse(value);
      console.log('[LocalStorage] New totalPoints:', data.totalPoints);
    } catch (e) {
      console.log('[LocalStorage] Value:', value);
    }
  }
  originalSetItem.apply(this, arguments);
};
console.log('LocalStorage watcher installed. Will log when progress is saved.');
