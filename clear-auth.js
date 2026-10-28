/**
 * Run this script in the browser console to clear all stale authentication data
 * 
 * Usage:
 * 1. Open browser console (F12 or Cmd+Option+I)
 * 2. Copy and paste this entire script
 * 3. Press Enter
 * 4. Refresh the page
 */

(function clearAuthData() {
  console.log('🔧 Starting auth cleanup...');
  
  let clearedCount = 0;
  
  // Get all localStorage keys
  const allKeys = Object.keys(localStorage);
  
  // Find and clear all Supabase-related keys
  const authKeys = allKeys.filter(key => 
    key.startsWith('sb-') || 
    key.includes('supabase') ||
    key === 'supabase.auth.token' ||
    key.includes('auth')
  );
  
  console.log(`Found ${authKeys.length} auth-related keys to clear:`);
  authKeys.forEach(key => console.log(`  - ${key}`));
  
  // Clear each key
  authKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
      clearedCount++;
    } catch (error) {
      console.error(`Failed to clear ${key}:`, error);
    }
  });
  
  console.log(`✅ Cleared ${clearedCount} auth keys`);
  console.log('🔄 Please refresh the page to complete the cleanup');
  
  return {
    clearedCount,
    remainingKeys: Object.keys(localStorage).length
  };
})();
