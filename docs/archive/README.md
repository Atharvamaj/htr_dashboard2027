# Archive Directory

This directory contains historical files that are not needed for production but kept for reference.

## Contents

### SQL Scripts (`sql-scripts/`)
Database migration and fix scripts from development:
- Various RLS policy fixes
- User setup scripts
- Database schema fixes
- Admin function fixes
- Team registration fixes

**Note:** These were development/debugging scripts. Production database should be managed through proper migration tools.

### Documentation
Historical documentation files moved here:
- Security audit reports
- Fix summaries and changelogs
- Deployment guides (outdated)
- Mobile optimization notes
- Rate limiting documentation
- Troubleshooting guides

### Development Files
- Old component versions (AdminTeams_fixed.tsx)
- Test database scripts
- Shell scripts for manual fixes
- Text files with notes

## Why These Were Archived

1. **SQL Scripts**: Ad-hoc fixes during development. Use proper migrations in production.
2. **Multiple Documentation Files**: Consolidated into main README.md and SECURITY.md
3. **Outdated Guides**: Information integrated into current documentation
4. **Test Files**: Not needed in production builds

## Current Production Documentation

Essential documentation remains in the root:
- `README.md` - Main project documentation
- `SECURITY.md` - Security policies and reporting
- `LICENSE` - Project license

## Restore Instructions

If you need to reference or restore any of these files:

```bash
# View archived files
ls -la docs/archive/

# Restore a specific file
cp docs/archive/FILENAME.md ./

# View SQL scripts
ls -la docs/archive/sql-scripts/
```

## Cleanup Date

Archived: October 5, 2025
