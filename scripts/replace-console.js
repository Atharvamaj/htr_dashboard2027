#!/usr/bin/env node

/**
 * Script to replace console.* statements with secure logger
 * This ensures no sensitive data is logged in production builds
 */

import fs from 'fs';
import path from 'path';

const files = [
  'src/components/AdminRegistrations.tsx',
  'src/components/AdminRoomManagement.tsx',
  'src/components/AdminSchedule.tsx',
  'src/components/AdminTeams.tsx',
  'src/components/AdminUsers.tsx',
  'src/components/ErrorBoundary.tsx',
  'src/components/EventSchedule.tsx',
  'src/components/NewUserNotifications.tsx',
  'src/components/NotificationBanner.tsx',
  'src/components/PerformanceMonitor.tsx',
  'src/components/RegistrationForm.tsx',
  'src/components/TeamInviteNotification.tsx',
  'src/components/TeamManagement.tsx',
  'src/components/TeamNotificationBanner.tsx',
  'src/components/UserNotifications.tsx',
  'src/contexts/AuthContext.tsx',
  'src/hooks/use-checkin-status.tsx',
  'src/lib/advanced-security.ts',
  'src/lib/connectionTracker.ts',
  'src/lib/form-utils.ts',
  'src/lib/sentry.ts',
  'src/main.tsx',
  'src/pages/Admin.tsx',
  'src/pages/Dashboard.tsx',
  'src/pages/NotFound.tsx',
  'src/utils/errorHandling.ts',
  'src/utils/performance.ts',
  'src/utils/security.ts',
  'src/utils/serviceWorker.ts',
];

let totalReplacements = 0;
let filesModified = 0;

console.log('🔍 Starting console.* replacement...\n');

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let fileReplacements = 0;

  // Check if logger import already exists
  const hasLoggerImport = 
    content.includes("from '@/utils/logger'") || 
    content.includes('from "@/utils/logger"');

  // Add logger import if not present
  if (!hasLoggerImport) {
    // Find the last import statement
    const importRegex = /^import .+;$/gm;
    const imports = content.match(importRegex);
    
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertPosition = lastImportIndex + lastImport.length;
      
      content = 
        content.slice(0, insertPosition) +
        '\nimport { logger } from "@/utils/logger";' +
        content.slice(insertPosition);
      
      fileReplacements++;
    }
  }

  // Replace console.log with logger.log
  const logCount = (content.match(/console\.log\(/g) || []).length;
  content = content.replace(/console\.log\(/g, 'logger.log(');
  fileReplacements += logCount;

  // Replace console.info with logger.info
  const infoCount = (content.match(/console\.info\(/g) || []).length;
  content = content.replace(/console\.info\(/g, 'logger.info(');
  fileReplacements += infoCount;

  // Replace console.warn with logger.warn
  const warnCount = (content.match(/console\.warn\(/g) || []).length;
  content = content.replace(/console\.warn\(/g, 'logger.warn(');
  fileReplacements += warnCount;

  // Replace console.error with logger.error
  const errorCount = (content.match(/console\.error\(/g) || []).length;
  content = content.replace(/console\.error\(/g, 'logger.error(');
  fileReplacements += errorCount;

  // Replace console.debug with logger.debug
  const debugCount = (content.match(/console\.debug\(/g) || []).length;
  content = content.replace(/console\.debug\(/g, 'logger.debug(');
  fileReplacements += debugCount;

  // Replace console.table with logger.table
  const tableCount = (content.match(/console\.table\(/g) || []).length;
  content = content.replace(/console\.table\(/g, 'logger.table(');
  fileReplacements += tableCount;

  // Write back if changes were made
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${filePath}`);
    console.log(`   Replacements: ${fileReplacements}`);
    filesModified++;
    totalReplacements += fileReplacements;
  }
});

console.log('\n📊 Summary:');
console.log(`   Files modified: ${filesModified}`);
console.log(`   Total replacements: ${totalReplacements}`);
console.log('\n✅ Done! Console statements have been replaced with secure logger.');
console.log('   Run "npm run build:prod" to verify production build is clean.\n');
