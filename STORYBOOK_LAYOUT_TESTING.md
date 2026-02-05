# Storybook Layout Testing Guide

This guide explains how to test layouts in Storybook using the new automatic callback rendering system.

## Overview

Instead of manually writing HTML strings for layout stories, you can now use real callback data and templates, just like individual callback stories do. This makes layout testing:

- ✅ More accurate (uses actual templates)
- ✅ Easier to maintain (update data, not HTML)
- ✅ Consistent with callback story patterns
- ✅ Less error-prone

## Quick Start

### Creating a Full Layout Story

```typescript
import { createLayoutStoryRenderer } from "../../.storybook/layoutRenderer";
import { weatherFixture } from "../../.storybook/layoutFixtures";

export const Weather: Story = {
  render: createLayoutStoryRenderer("full", [
    { name: "weather", data: weatherFixture },
  ]),
};
```

### Creating a Split Layout Story

```typescript
export const WeatherAndCalendar: Story = {
  render: createLayoutStoryRenderer("split", [
    { name: "weather", data: weatherFixture },
    { name: "calendar", data: calendarFixture },
  ]),
};
```

## Available Fixtures

Pre-defined fixtures are available in `.storybook/layoutFixtures.ts`:

### Year Progress
- `yearProgressFixture` - Current year progress data

### Weather
- `weatherFixture` - Generic weather data
- `weatherFixtureSF` - San Francisco weather
- `weatherFixtureNY` - New York weather

### Calendar
- `calendarFixture` - Calendar with events
- `calendarEmptyFixture` - Empty calendar

## Adding New Callback Support

### 1. Import the Template

In `.storybook/layoutRenderer.ts`:

```typescript
import myCallbackTemplate from "../src/callbacks/my-callback/template.liquid?raw";
```

### 2. Register the Template

Add it to the `callbackTemplates` map:

```typescript
const callbackTemplates: Record<string, string> = {
  "year-progress": yearProgressTemplate,
  weather: weatherTemplate,
  calendar: calendarTemplate,
  "my-callback": myCallbackTemplate, // Add your callback
};
```

### 3. Create Fixtures

In `.storybook/layoutFixtures.ts`:

```typescript
export const myCallbackFixture = {
  // Match the data structure that your callback's getData() returns
  title: "My Data",
  items: ["item1", "item2"],
};
```

### 4. Use in Stories

```typescript
import { myCallbackFixture } from "../../.storybook/layoutFixtures";

export const MyCallbackStory: Story = {
  render: createLayoutStoryRenderer("full", [
    { name: "my-callback", data: myCallbackFixture },
  ]),
};
```

## Examples

### Full Layout Examples

```typescript
// Single year progress
export const YearProgress: FullStory = {
  render: createLayoutStoryRenderer("full", [
    { name: "year-progress", data: yearProgressFixture },
  ]),
};

// Single weather
export const Weather: FullStory = {
  render: createLayoutStoryRenderer("full", [
    { name: "weather", data: weatherFixture },
  ]),
};

// Single calendar
export const Calendar: FullStory = {
  render: createLayoutStoryRenderer("full", [
    { name: "calendar", data: calendarFixture },
  ]),
};
```

### Split Layout Examples

```typescript
// Two different callbacks
export const YearProgressAndWeather: SplitStory = {
  render: createLayoutStoryRenderer("split", [
    { name: "year-progress", data: yearProgressFixture },
    { name: "weather", data: weatherFixture },
  ]),
};

// Same callback, different data
export const WeatherComparison: SplitStory = {
  render: createLayoutStoryRenderer("split", [
    { name: "weather", data: weatherFixtureSF },
    { name: "weather", data: weatherFixtureNY },
  ]),
};

// Mix and match
export const WeatherAndCalendar: SplitStory = {
  render: createLayoutStoryRenderer("split", [
    { name: "weather", data: weatherFixture },
    { name: "calendar", data: calendarFixture },
  ]),
};
```

## Best Practices

### 1. Match Actual Data Structures

Your fixtures should match what the callback's `getData()` method returns:

```typescript
// In src/callbacks/weather/index.ts
async getData() {
  return {
    today: { max: 27.9, low: 10.2, ... },
    forecast: [...]
  };
}

// In .storybook/layoutFixtures.ts
export const weatherFixture = {
  today: { max: 27.9, low: 10.2, ... },
  forecast: [...]
};
```

### 2. Create Multiple Fixtures for Variations

```typescript
export const weatherFixtureSunny = { /* sunny day */ };
export const weatherFixtureRainy = { /* rainy day */ };
export const weatherFixtureSnowy = { /* snowy day */ };
```

### 3. Add Descriptive Story Metadata

```typescript
export const WeatherComparison: SplitStory = {
  render: createLayoutStoryRenderer("split", [
    { name: "weather", data: weatherFixtureSF },
    { name: "weather", data: weatherFixtureNY },
  ]),
  parameters: {
    docs: {
      description: {
        story: "Split layout comparing weather in two different cities (San Francisco and New York)",
      },
    },
  },
};
```

### 4. Test Edge Cases

Create fixtures for edge cases:

```typescript
export const calendarEmptyFixture = {
  title: "Calendar",
  days: []  // Empty calendar
};

export const weatherExtremeFixture = {
  today: {
    current: -40,  // Extreme cold
    condition: { text: "Blizzard" }
  }
};
```

## Troubleshooting

### Story Not Showing Up

1. Check that your story file matches the pattern in `.storybook/main.ts`:
   ```typescript
   stories: [
     "../src/callbacks/**/*.stories.ts",
     "../src/layouts/**/*.stories.ts",
   ]
   ```

2. Verify story export syntax:
   ```typescript
   export const MyStory: Story = { /* ... */ };
   ```

### Template Not Found Error

1. Make sure the template is imported in `.storybook/layoutRenderer.ts`
2. Check that the callback name matches the key in `callbackTemplates`

### Layout Not Rendering

1. Check browser console for errors
2. Verify data structure matches what the template expects
3. Test the callback individually in its own story first

### Data Not Showing

1. Verify the fixture matches the callback's getData() return type
2. Check the Liquid template's variable names (usually `{{ data.fieldName }}`)
3. Use browser dev tools to inspect the rendered HTML

## Migration from Old Approach

### Before (Manual HTML)

```typescript
export const OldWay: Story = {
  args: {
    content: `
<div class="layout layout--col">
  <div class="flex flex--col w-50">
    <h1 class="title">Now: 72°</h1>
    <div class="flex flex--row w-100">
      <div class="outline flex flex--col w-100 flex-1 p-2">
        <h3 class="title">Today</h3>
        <p class="title">Partly cloudy</p>
      </div>
    </div>
  </div>
</div>
    `,
  },
};
```

### After (Automatic Rendering)

```typescript
export const NewWay: Story = {
  render: createLayoutStoryRenderer("full", [
    { name: "weather", data: weatherFixture },
  ]),
};
```

## See Also

- [Callback Stories](../src/callbacks/README.md) - How individual callbacks work
- [Layout System](../LAYOUT_MIGRATION.md) - Overview of the layout system
- [Liquid Templates](https://liquidjs.com/) - Template engine documentation
