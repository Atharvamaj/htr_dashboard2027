#!/bin/bash

# Script to replace console.log statements with secure logger
# This helps prevent information leakage in production

echo "🔍 Replacing console statements with secure logger..."
echo ""

# List of files to process
FILES=(
  "src/components/AdminRegistrations.tsx"
  "src/components/AdminRoomManagement.tsx"
  "src/components/AdminSchedule.tsx"
  "src/components/AdminTeams.tsx"
  "src/components/AdminUsers.tsx"
  "src/components/ErrorBoundary.tsx"
  "src/components/EventSchedule.tsx"
  "src/components/NewUserNotifications.tsx"
  "src/components/NotificationBanner.tsx"
  "src/components/PerformanceMonitor.tsx"
  "src/components/RegistrationForm.tsx"
  "src/components/TeamInviteNotification.tsx"
  "src/components/TeamManagement.tsx"
  "src/components/TeamNotificationBanner.tsx"
  "src/components/UserNotifications.tsx"
  "src/contexts/AuthContext.tsx"
  "src/hooks/use-checkin-status.tsx"
  "src/lib/advanced-security.ts"
  "src/lib/connectionTracker.ts"
  "src/lib/form-utils.ts"
  "src/lib/sentry.ts"
  "src/main.tsx"
  "src/pages/Admin.tsx"
  "src/pages/Dashboard.tsx"
  "src/pages/NotFound.tsx"
  "src/utils/errorHandling.ts"
  "src/utils/performance.ts"
  "src/utils/security.ts"
  "src/utils/serviceWorker.ts"
)

COUNT=0

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # Check if logger import already exists
    if ! grep -q "from '@/utils/logger'" "$file" && ! grep -q "from \"@/utils/logger\"" "$file"; then
      # Add import at the top (after existing imports)
      # This is a simple approach - for production you'd want more sophisticated parsing
      echo "  📝 Adding logger import to $file"
      
      # Use perl for in-place editing with backup
      perl -i.bak -pe '
        if (!$added && /^import/) {
          $_ .= "import { logger } from \"@/utils/logger\";\n" if eof;
          $added = 1;
        }
      ' "$file"
      
      # Remove backup file
      rm -f "${file}.bak"
    fi
    
    # Count console statements
    CONSOLE_COUNT=$(grep -c "console\." "$file" 2>/dev/null || echo 0)
    if [ "$CONSOLE_COUNT" -gt 0 ]; then
      echo "  ✅ Found $CONSOLE_COUNT console statement(s) in $file"
      COUNT=$((COUNT + CONSOLE_COUNT))
    fi
  fi
done

echo ""
echo "📊 Total console statements found: $COUNT"
echo ""
echo "⚠️  MANUAL STEP REQUIRED:"
echo "   Please review each file and replace:"
echo "   - console.log() → logger.log()"
echo "   - console.info() → logger.info()"
echo "   - console.warn() → logger.warn()"
echo "   - console.error() → logger.error()"
echo ""
echo "   Note: logger.log() and logger.info() will be silent in production!"
echo "   Use logger.error() for critical errors that should always show."
echo ""
echo "✅ Done! Run 'npm run build:prod' to verify console statements are removed."
