# Migration Scripts

This directory contains scripts for migrating data between versions of the dashboard server.

## Available Scripts

### migrate-playlist-to-layouts.ts

Migrates playlists from the old single-callback format to the new layout-based format.

**Usage:**
```bash
tsx scripts/migrate-playlist-to-layouts.ts <path-to-playlist-file.json>
```

**Example:**
```bash
# Migrate a playlist file
tsx scripts/migrate-playlist-to-layouts.ts ./data/my-playlist.json

# The script will:
# 1. Read the existing playlist
# 2. Create a backup with timestamp
# 3. Convert to new format
# 4. Save to the same file
```

**What it does:**
- Converts `callbackName` + `options` to `callbacks` array
- Adds `layout: "full"` to all items (default for single callback)
- Creates a timestamped backup file before making changes
- Validates JSON structure
- Provides detailed migration summary

**Safety features:**
- Creates backup before any changes
- Detects if file is already migrated
- Prompts for confirmation if already migrated
- Validates JSON syntax before processing

**Input format (old):**
```json
[
  {
    "id": "weather-1",
    "callbackName": "weather",
    "options": { "zipcode": "90210" }
  }
]
```

**Output format (new):**
```json
[
  {
    "id": "weather-1",
    "layout": "full",
    "callbacks": [
      { "name": "weather", "options": { "zipcode": "90210" } }
    ]
  }
]
```

## Creating New Migration Scripts

When creating new migration scripts:

1. **Follow the naming convention**: `migrate-<what>-to-<what>.ts`
2. **Include help text**: Add usage instructions at the top
3. **Create backups**: Always backup data before modification
4. **Validate input**: Check file format before processing
5. **Provide feedback**: Show progress and summary
6. **Handle errors**: Gracefully handle edge cases
7. **Make it testable**: Support dry-run mode if applicable

**Template:**
```typescript
#!/usr/bin/env node

/**
 * Migration script description
 * 
 * Usage: tsx scripts/migrate-X-to-Y.ts <args>
 */

import fs from "node:fs/promises";
import path from "node:path";

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error("Error: Missing required argument");
    console.error("Usage: tsx scripts/migrate-X-to-Y.ts <arg>");
    process.exit(1);
  }

  // Your migration logic here
  
  try {
    // 1. Validate input
    // 2. Create backup
    // 3. Transform data
    // 4. Write output
    // 5. Report summary
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  }
}

main();
```

## Testing Migration Scripts

Before running on production data:

1. **Test with sample data**
```bash
# Create test file
echo '[{"id":"test","callbackName":"weather"}]' > /tmp/test.json

# Run migration
tsx scripts/migrate-playlist-to-layouts.ts /tmp/test.json

# Verify output
cat /tmp/test.json
```

2. **Verify backup was created**
```bash
ls -la /tmp/test.json.backup-*
```

3. **Test with edge cases**
- Empty files
- Invalid JSON
- Already migrated data
- Missing fields
- Malformed data

## Rollback

If a migration goes wrong:

1. **Find the backup file**
```bash
ls -la *.backup-*
```

2. **Restore from backup**
```bash
cp playlist.json.backup-1234567890 playlist.json
```

3. **Verify restoration**
```bash
cat playlist.json
```

## Best Practices

- ✅ Always test on non-production data first
- ✅ Keep backups for at least 30 days
- ✅ Run migrations during low-traffic periods
- ✅ Monitor logs after migration
- ✅ Have a rollback plan ready
- ✅ Document any manual steps required
- ❌ Don't delete backups immediately
- ❌ Don't skip validation steps
- ❌ Don't run migrations without testing
