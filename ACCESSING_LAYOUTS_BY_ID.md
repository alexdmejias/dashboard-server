# Accessing Playlist Items (Layouts) by ID

This guide shows how to access complete playlist items (layouts) using their ID directly.

## Overview

The `/display/:clientName/:viewType/:callback` endpoint now supports three types of access:

1. **`next`** - Renders the next item in rotation
2. **Playlist Item ID** - Renders a complete layout by its ID ⭐ **NEW**
3. **Callback ID** - Renders an individual callback (format: `playlistItemId-callbackName-index`)

## Why Use Playlist Item IDs?

When you define playlist items, you give them meaningful IDs:

```json
{
  "playlist": [{
    "id": "my-first-layout",
    "layout": "full",
    "callbacks": [...]
  }, {
    "id": "my-weather-split",
    "layout": "split",
    "callbacks": [...]
  }]
}
```

Now you can access these layouts directly using those IDs!

## Basic Usage

### Register a Client with Named Layouts

```bash
curl -X POST http://localhost:3333/register/my-client \
  -H "Content-Type: application/json" \
  -d '{
    "playlist": [{
      "id": "dashboard-overview",
      "layout": "full",
      "callbacks": [{
        "name": "year-progress",
        "options": {}
      }]
    }, {
      "id": "weather-comparison",
      "layout": "split",
      "callbacks": [{
        "name": "weather",
        "options": {"zipcode": "94103"}
      }, {
        "name": "weather",
        "options": {"zipcode": "10001"}
      }]
    }]
  }'
```

### Access Layouts by ID

**Access the overview layout:**
```bash
curl http://localhost:3333/display/my-client/html/dashboard-overview
```

**Access the weather comparison layout:**
```bash
curl http://localhost:3333/display/my-client/html/weather-comparison
```

This renders the complete layout with all callbacks combined, just like using `next` but without advancing the rotation.

## Different View Types

You can use any supported view type:

### HTML Output
```bash
curl http://localhost:3333/display/my-client/html/dashboard-overview
```

### JSON Output (for full layouts with single callback)
```bash
curl http://localhost:3333/display/my-client/json/dashboard-overview
```

### Image Output (for full layouts with single callback)
```bash
# PNG
curl http://localhost:3333/display/my-client/png/dashboard-overview > output.png

# BMP
curl http://localhost:3333/display/my-client/bmp/dashboard-overview > output.bmp
```

**Note:** Split layouts (multiple callbacks) only work with `html` view type. Image formats require a single callback.

## Complete Example

```bash
#!/bin/bash

CLIENT="my-dashboard"

# 1. Register client
curl -X POST http://localhost:3333/register/$CLIENT \
  -H "Content-Type: application/json" \
  -d '{
    "playlist": [
      {
        "id": "home-screen",
        "layout": "full",
        "callbacks": [{
          "name": "year-progress",
          "options": {}
        }]
      },
      {
        "id": "dual-weather",
        "layout": "split",
        "callbacks": [
          {"name": "weather", "options": {"zipcode": "94103"}},
          {"name": "weather", "options": {"zipcode": "10001"}}
        ]
      },
      {
        "id": "calendar-view",
        "layout": "full",
        "callbacks": [{
          "name": "calendar",
          "options": {}
        }]
      }
    ]
  }'

# 2. Access specific layouts
echo "Home screen:"
curl -s http://localhost:3333/display/$CLIENT/html/home-screen | grep -o "<title>.*</title>"

echo "Dual weather:"
curl -s http://localhost:3333/display/$CLIENT/html/dual-weather | grep -o "split-container"

echo "Calendar view:"
curl -s http://localhost:3333/display/$CLIENT/html/calendar-view | grep -o "<title>.*</title>"

# 3. Use next for rotation
echo "Next in rotation:"
curl -s http://localhost:3333/display/$CLIENT/html/next | grep -o "<title>.*</title>"
```

## Use Cases

### 1. Direct Links to Specific Views

Create bookmarks or QR codes that always show specific layouts:
```
https://dashboard.example.com/display/lobby-screen/html/welcome-screen
https://dashboard.example.com/display/lobby-screen/html/event-schedule
```

### 2. API Integration

Programmatically switch between specific views:
```javascript
// Show welcome screen
await fetch('/display/lobby/html/welcome-screen');

// After 5 minutes, show event schedule
setTimeout(() => {
  fetch('/display/lobby/html/event-schedule');
}, 5 * 60 * 1000);
```

### 3. Testing Individual Layouts

During development, test specific layouts without cycling through the entire playlist:
```bash
# Test just the weather layout
curl http://localhost:3333/display/dev-client/html/weather-layout

# Test just the calendar layout
curl http://localhost:3333/display/dev-client/html/calendar-layout
```

## Backward Compatibility

All existing functionality still works:

### Next (rotation)
```bash
curl http://localhost:3333/display/my-client/html/next
```

### Individual Callbacks (with index)
```bash
curl http://localhost:3333/display/my-client/html/weather-layout-weather-0
curl http://localhost:3333/display/my-client/html/weather-layout-weather-1
```

## Priority Order

When you make a request, the system checks in this order:

1. **"next"** → Advance rotation and render next item
2. **Playlist Item ID** → If matches a playlist item ID, render that layout
3. **Callback ID** → If matches callback ID pattern, render individual callback
4. **Not Found** → Return 404 error

This means playlist item IDs take priority over callback IDs if there's a naming conflict (though this is unlikely with the callback ID format including the index).

## Best Practices

### Use Meaningful IDs

✅ Good:
```json
{
  "id": "morning-dashboard",
  "id": "weather-comparison",
  "id": "weekly-calendar"
}
```

❌ Avoid:
```json
{
  "id": "layout1",
  "id": "item2",
  "id": "view-3"
}
```

### Keep IDs URL-Safe

Use lowercase letters, numbers, and hyphens:
- ✅ `my-weather-layout`
- ✅ `dashboard-2024`
- ✅ `split-view-1`
- ❌ `My Weather Layout` (spaces)
- ❌ `view#1` (special characters)

### Document Your Layout IDs

Keep a reference of what each layout ID displays:
```markdown
# Layout Reference

- `home-screen` - Year progress indicator
- `dual-weather` - SF and NY weather side-by-side
- `calendar-view` - Current month calendar
- `task-board` - Today's tasks
```

## Troubleshooting

### "Playlist item not found" Error

**Symptom:** Requesting a layout returns 404

**Solution:** Check the registered playlist item IDs:
```bash
curl http://localhost:3333/health | jq '.clients."my-client".config.playlist[].id'
```

Make sure your request matches exactly (case-sensitive).

### Split Layout Returns Error for PNG/BMP

**Symptom:** Split layout works with HTML but fails with PNG

**Solution:** Image formats only support single-callback layouts. Use HTML for split layouts:
```bash
# ✓ Works
curl http://localhost:3333/display/my-client/html/split-layout

# ✗ Fails
curl http://localhost:3333/display/my-client/png/split-layout
```

### Wrong Layout Renders

**Symptom:** Requesting one layout shows a different one

**Solution:** You might be hitting the callback ID instead. Check your playlist:
```bash
curl http://localhost:3333/health | jq '.clients."my-client".callbacks | keys'
```

If your playlist item ID matches a callback ID format, rename your playlist item.

## API Reference

### Endpoint
```
GET /display/:clientName/:viewType/:identifier
```

### Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `clientName` | string | Client identifier | `my-client` |
| `viewType` | string | Output format: `html`, `json`, `png`, `bmp` | `html` |
| `identifier` | string | One of: `next`, playlist item ID, or callback ID | `my-layout` |

### Responses

| Status | Description |
|--------|-------------|
| 200 | Success - Returns rendered layout |
| 404 | Client not found, or playlist item/callback not found |
| 500 | Rendering error |

## Examples Summary

| URL | Action |
|-----|--------|
| `/display/client/html/next` | Next item in rotation |
| `/display/client/html/my-layout` | Render layout by ID |
| `/display/client/html/my-layout-weather-0` | Render individual callback |
| `/display/client/png/my-layout` | Render layout as PNG |
| `/display/client/json/my-layout` | Get layout data as JSON |

---

For more information about the playlist system, see:
- [LAYOUT_MIGRATION.md](./LAYOUT_MIGRATION.md) - Overview of the layout system
- [TESTING_DUPLICATE_CALLBACKS.md](./TESTING_DUPLICATE_CALLBACKS.md) - Testing with duplicate callbacks
