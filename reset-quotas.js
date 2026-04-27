// Quick script to reset all freemium quotas
// Run this in the extension's popup console

chrome.storage.local.remove([
  'freemiumPremiumUsage',  // YouTube + Phishing (3/day)
  'freemiumChatDate',      // Chat date tracker
  'freemiumChatCount'      // Chat count (5/day)
], () => {
  console.log('✅ All quotas reset!');
  console.log('Premium features (YouTube + Phishing): 3/3 ✓');
  console.log('Chat (Ask Page): 5/5 ✓');
  alert('✅ כל המכסות אופסו בהצלחה!\n\n📊 מצב חדש:\n• יוטיוב + פישינג: 3/3\n• שאל על העמוד: 5/5\n\n🔄 סגור ופתח את popup מחדש לעדכון.');
});
