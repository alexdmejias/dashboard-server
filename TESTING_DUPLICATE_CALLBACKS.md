# Testing Duplicate Callbacks in Split Layouts

This guide shows how to test playlist items with duplicate callback names using the `/display/:clientName/:viewType/:callback` endpoint.

## Use Case

You want to display the same callback multiple times with different options in a split layout. For example:
- Two weather callbacks showing different cities
- Two calendar callbacks showing different calendars
- Two instances of the same data source with different filters

## Example Payload

```json
{
  "playlist": [{
    "id": "one",
    "layout": "split",
    "callbacks": [{
      "name": "weather",
      "options": {
        "zipcode": "94103"
      }
    }, {
      "name": "weather",
      "options": {
        "zipcode": "10001"
      }
    }]
  }]
}
```

## How Callback IDs Work

When you register a client with duplicate callback names, the system generates unique IDs using the format:

```
${playlistItemId}-${callbackName}-${index}
```

Where:
- `playlistItemId` is the ID of the playlist item (e.g., "one")
- `callbackName` is the name of the callback (e.g., "weather")
- `index` is the position in the callbacks array (starts at 0)

For the example above:
- First weather callback → ID: `one-weather-0`
- Second weather callback → ID: `one-weather-1`

## Step-by-Step Testing

### 1. Register the Client

```bash
curl -X POST http://localhost:3333/register/my-client \
  -H "Content-Type: application/json" \
  -d '{
    "playlist": [{
      "id": "split-weather",
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

Expected response:
```json
{
  "statusCode": 200,
  "message": "created new client: my-client",
  "client": {
    "callbacks": {
      "split-weather-weather-0": {...},
      "split-weather-weather-1": {...}
    }
  }
}
```

### 2. Verify Callbacks Were Registered

Check the health endpoint to see all registered callback IDs:

```bash
curl http://localhost:3333/health | jq '.clients."my-client".callbacks | keys'
```

Expected output:
```json
[
  "split-weather-weather-0",
  "split-weather-weather-1"
]
```

### 3. Access Individual Callbacks

#### First Weather Callback (San Francisco, 94103)

```bash
curl http://localhost:3333/display/my-client/html/split-weather-weather-0
```

This renders only the first weather callback with options `{"zipcode": "94103"}`.

#### Second Weather Callback (New York, 10001)

```bash
curl http://localhost:3333/display/my-client/html/split-weather-weather-1
```

This renders only the second weather callback with options `{"zipcode": "10001"}`.

### 4. Access Split Layout (Both Together)

```bash
curl http://localhost:3333/display/my-client/html/next
```

This renders both weather callbacks side-by-side in the split layout.

## Testing with Different Callbacks

The same pattern works with any callback. Here's an example with `year-progress`:

```bash
# Register
curl -X POST http://localhost:3333/register/test-progress \
  -H "Content-Type: application/json" \
  -d '{
    "playlist": [{
      "id": "double",
      "layout": "split",
      "callbacks": [
        {"name": "year-progress", "options": {}},
        {"name": "year-progress", "options": {}}
      ]
    }]
  }'

# Access first instance
curl http://localhost:3333/display/test-progress/html/double-year-progress-0

# Access second instance
curl http://localhost:3333/display/test-progress/html/double-year-progress-1

# Access split layout
curl http://localhost:3333/display/test-progress/html/next
```

## View Types

You can use different view types:

- `html` - Returns rendered HTML
- `json` - Returns the callback data as JSON
- `png` - Returns a PNG image (note: split layouts require HTML for rendering both callbacks)
- `bmp` - Returns a BMP image (note: split layouts require HTML for rendering both callbacks)

### Examples

```bash
# Get JSON data from first callback
curl http://localhost:3333/display/my-client/json/split-weather-weather-0

# Get PNG image of first callback
curl http://localhost:3333/display/my-client/png/split-weather-weather-0 > weather1.png

# Get HTML of split layout
curl http://localhost:3333/display/my-client/html/next > split-layout.html
```

## Important Notes

1. **Index is required**: You must include the index in the callback ID when accessing individual callbacks. Using just `split-weather-weather` won't work - you need `split-weather-weather-0` or `split-weather-weather-1`.

2. **Split layouts with images**: When using `png` or `bmp` view types with the `next` endpoint, split layouts will return an error because image rendering requires combining HTML first.

3. **Single callbacks in split layout**: If you want to use the same callback only once in a split layout, combine it with a different callback:
   ```json
   {
     "callbacks": [
       {"name": "weather", "options": {"zipcode": "94103"}},
       {"name": "calendar", "options": {}}
     ]
   }
   ```

## Troubleshooting

### "callback not found" Error

If you get a "callback not found" error, check:

1. **Correct ID format**: Make sure you're using the index in the ID
   - ❌ Wrong: `one-weather`
   - ✅ Correct: `one-weather-0` or `one-weather-1`

2. **Check registered IDs**: Use the health endpoint to see actual IDs:
   ```bash
   curl http://localhost:3333/health | jq '.clients."my-client".callbacks | keys'
   ```

3. **Client exists**: Verify the client is registered:
   ```bash
   curl http://localhost:3333/health | jq '.clients | keys'
   ```

### Callbacks Return Same Data

This is expected behavior! Both callback instances are independent but use the same callback class. If the callback doesn't use the options to change its output, both instances will return identical data.

Make sure:
- The callback actually uses the options you're passing
- The options are different between the two callbacks
- The callback supports the options you're providing

## Example: Complete Testing Script

```bash
#!/bin/bash

# Test duplicate callbacks

CLIENT="test-duplicate"
ITEM_ID="weather-split"

# 1. Register
echo "Registering client..."
curl -s -X POST http://localhost:3333/register/$CLIENT \
  -H "Content-Type: application/json" \
  -d "{
    \"playlist\": [{
      \"id\": \"$ITEM_ID\",
      \"layout\": \"split\",
      \"callbacks\": [
        {\"name\": \"weather\", \"options\": {\"zipcode\": \"94103\"}},
        {\"name\": \"weather\", \"options\": {\"zipcode\": \"10001\"}}
      ]
    }]
  }" | jq '.'

# 2. Check health
echo -e "\n\nRegistered callbacks:"
curl -s http://localhost:3333/health | jq ".clients.\"$CLIENT\".callbacks | keys"

# 3. Access callbacks
echo -e "\n\nFirst callback (SF):"
curl -s "http://localhost:3333/display/$CLIENT/html/$ITEM_ID-weather-0" | grep -o "<title>.*</title>"

echo -e "\nSecond callback (NY):"
curl -s "http://localhost:3333/display/$CLIENT/html/$ITEM_ID-weather-1" | grep -o "<title>.*</title>"

# 4. Access split layout
echo -e "\n\nSplit layout:"
curl -s "http://localhost:3333/display/$CLIENT/html/next" | grep -o "split-container"

echo -e "\n\nTest complete!"
```

Save this as `test-duplicate.sh`, make it executable (`chmod +x test-duplicate.sh`), and run it to verify everything works.
