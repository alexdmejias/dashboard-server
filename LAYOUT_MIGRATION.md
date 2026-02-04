# Playlist Layout Migration - Implementation Summary

This document summarizes the implementation of the layout-based playlist system migration.

## What Changed

### 1. Data Structure
**Old Format:**
```json
{
  "id": "item1",
  "callbackName": "weather",
  "options": { "zipcode": "90210" }
}
```

**New Format:**
```json
{
  "id": "item1",
  "layout": "full",
  "callbacks": [
    { "name": "weather", "options": { "zipcode": "90210" } }
  ]
}
```

### 2. Supported Layouts

- **`full`**: Full-page layout supporting exactly 1 callback
- **`split`**: Side-by-side layout supporting exactly 2 callbacks

### 3. Key Changes by File

#### Type Definitions (`src/types/index.ts`)
- Updated `PlaylistItem` type with `layout` and `callbacks` array
- Removed `callbackName` and single `options` field

#### Validation (`src/plugins/clients.ts`)
- Updated `validatePlaylist()` to validate layout types
- Validates callback count matches layout requirements
- Ensures all callback names exist in available callbacks

#### Client Creation (`src/plugins/clients.ts`)
- Updated `createClientFromPlaylist()` to loop through callbacks array
- Generates unique callback IDs: `${playlistItem.id}-${callbackName}`
- Validates each callback's options independently

#### StateMachine (`src/stateMachine.ts`)
- Updated `tick()` method to handle multiple callbacks per playlist item
- Renders each callback and combines outputs
- Applies layout template based on `playlistItem.layout`
- Extracts callback content and wraps in layout templates

#### API Endpoints (`src/app.ts`)
- Updated type definitions for `/register` and `/api/clients/:clientName/playlist`
- Fixed callback lookup to handle new ID format
- Supports finding callback options from playlist structure

#### Admin UI (`admin/src/components/PlaylistEditor.tsx`)
- Complete rewrite to support:
  - Layout selection (full/split dropdown)
  - Multiple callbacks per playlist item
  - Individual callback configuration (name + options)
  - Dynamic callback forms based on layout type

#### Admin Types (`admin/src/types/index.ts`)
- Updated `ClientConfig` playlist structure to match new format

### 4. Layout Templates

Created two new Liquid templates:

**`views/layouts/full.liquid`**
- Full-page wrapper for single callback
- Includes TRMNL screen styles
- Injects callback content via `{{ content }}`

**`views/layouts/split.liquid`**
- Two-column flexbox layout
- Each callback gets `flex: 1` for equal width
- 20px gap between columns
- Wraps both callbacks in `.split-container`

### 5. Migration Script

**`scripts/migrate-playlist-to-layouts.ts`**
- Converts old format to new format
- Creates backup before migration
- Defaults all items to `layout: "full"`
- Converts single `callbackName` + `options` to callbacks array

**Usage:**
```bash
tsx scripts/migrate-playlist-to-layouts.ts <path-to-playlist.json>
```

### 6. Storybook Testing

**Layout Stories (`src/layouts/layouts.stories.ts`)**
- Visual tests for both full and split layouts
- Examples with realistic content
- Edge case tests (uneven content lengths)

**Test Helpers (`.storybook/layoutTestHelpers.ts`)**
- `createLayoutStory()` - Create render functions for layouts
- `combineCallbacksForSplit()` - Combine callback HTML for split layout
- `extractCallbackContent()` - Extract content from full rendered HTML
- `createLayoutFixtures()` - Generate test data

**Documentation (`STORYBOOK_TESTING.md`)**
- Complete guide for using Storybook with layouts
- Examples for creating new stories
- Best practices for testing
- Visual regression testing approach

## Validation Rules

The system enforces these validation rules:

1. **Layout must be "full" or "split"**
2. **Full layout requires exactly 1 callback**
3. **Split layout requires exactly 2 callbacks**
4. **All callback names must exist in possibleCallbacks**
5. **Playlist item IDs must be unique**
6. **Each callback's options must pass its expected config validation**

## Error Messages

The system provides clear error messages:

- `"Layout must be 'full' or 'split'"`
- `"Playlist item 'X' with layout 'full' must have exactly 1 callback, found Y"`
- `"Playlist item 'X' with layout 'split' must have exactly 2 callbacks, found Y"`
- `"Callback 'X' in playlist item 'Y' does not exist in available callbacks"`

## Testing Approach

### 1. Migration Testing
```bash
# Create test file with old format
echo '[{"id":"test","callbackName":"weather","options":{}}]' > test.json

# Run migration
tsx scripts/migrate-playlist-to-layouts.ts test.json

# Verify output
cat test.json
```

### 2. API Testing

**Test Full Layout:**
```bash
curl -X POST http://localhost:3000/register/test-client \
  -H "Content-Type: application/json" \
  -d '{
    "playlist": [{
      "id": "weather-1",
      "layout": "full",
      "callbacks": [{
        "name": "weather",
        "options": {"zipcode": "90210"}
      }]
    }]
  }'
```

**Test Split Layout:**
```bash
curl -X POST http://localhost:3000/register/test-client \
  -H "Content-Type: application/json" \
  -d '{
    "playlist": [{
      "id": "split-1",
      "layout": "split",
      "callbacks": [
        {"name": "weather", "options": {"zipcode": "90210"}},
        {"name": "calendar", "options": {}}
      ]
    }]
  }'
```

**Test Validation Error:**
```bash
curl -X POST http://localhost:3000/register/test-client \
  -H "Content-Type: application/json" \
  -d '{
    "playlist": [{
      "id": "bad",
      "layout": "full",
      "callbacks": [
        {"name": "weather"},
        {"name": "calendar"}
      ]
    }]
  }'
# Should return error: "layout 'full' must have exactly 1 callback"
```

### 3. Visual Testing with Storybook

```bash
npm run storybook
# Navigate to http://localhost:6006
# Test stories under "Layouts" category
```

### 4. UI Testing

1. Start the server and admin UI
2. Navigate to a client
3. Open Playlist Editor
4. Test:
   - Creating new playlist item with full layout (1 callback)
   - Creating new playlist item with split layout (2 callbacks)
   - Editing existing items
   - Changing layout type (should update callback count)
   - Validation errors for incorrect configurations

## Backward Compatibility

The migration script ensures backward compatibility:

1. All existing playlists can be migrated with the migration script
2. Old format items are converted to `layout: "full"` with single callback
3. Backup files are created before migration
4. No data loss occurs during migration

## Known Limitations

1. **Non-HTML view types** (png, bmp) only support single callbacks (full layout)
   - Split layout requires HTML rendering to combine callbacks
   - The system will return an error if attempting split layout with non-HTML view types

2. **Callback ID format changed**
   - Old format: Callback ID = Playlist Item ID
   - New format: Callback ID = `${playlistItemId}-${callbackName}`
   - Direct callback access via URL must use new format

## Performance Considerations

1. **Multiple Callback Rendering**: Split layout renders 2 callbacks and combines them
   - Each callback is rendered independently
   - HTML content is extracted and combined
   - Layout template is applied to combined content

2. **Caching**: Individual callback caching still works as before
   - Each callback instance maintains its own cache
   - Combined layout output is not cached (generated on-demand)

## Future Enhancements

Potential future improvements:

1. **More layouts**: grid (4 callbacks), triple (3 callbacks)
2. **Custom layout templates**: User-defined layouts
3. **Layout-level caching**: Cache combined layout outputs
4. **Image-based layouts**: Support split layout for PNG/BMP output
5. **Dynamic callback sizing**: Non-equal width distribution
6. **Layout preview**: Visual preview in admin UI

## Troubleshooting

### Migration Issues

**Problem**: Migration script shows "already migrated" warning
```bash
# Force migration by responding 'y' to the prompt
echo "y" | tsx scripts/migrate-playlist-to-layouts.ts file.json
```

### Validation Errors

**Problem**: "callback not found" error
- Verify callback name matches exactly (case-sensitive)
- Check available callbacks: `GET /health` endpoint

**Problem**: "layout must have exactly N callbacks"
- Full layout: Ensure callbacks array has exactly 1 element
- Split layout: Ensure callbacks array has exactly 2 elements

### Rendering Issues

**Problem**: Callbacks not displaying correctly in split layout
- Check that callback templates render valid HTML
- Verify flexbox CSS is loading correctly
- Test individual callbacks in full layout first

**Problem**: Content extraction not working
- Check HTML structure matches expected format
- Verify `<div class="view view--full">` and `<div class="title_bar">` exist
- Test with Storybook to isolate issue

## Support

For issues or questions:
1. Check this documentation
2. Review `STORYBOOK_TESTING.md` for visual testing
3. Run migration script with `-h` flag for help
4. Check server logs for detailed error messages
