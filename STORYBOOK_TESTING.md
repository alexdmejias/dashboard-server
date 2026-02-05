# Storybook Testing Guide for Layout System

This guide explains how to use Storybook for testing the new layout-based playlist system.

## Overview

Storybook is used to visually test and develop callback templates and layouts in isolation. This is particularly useful for the new layout system where multiple callbacks can be combined in different configurations.

## Running Storybook

```bash
npm run storybook
```

This will start Storybook on port 6006 (by default). Open your browser to `http://localhost:6006`.

## What's Included

### 1. Layout Stories (`src/layouts/layouts.stories.ts`)

The layout stories test the two supported layout types:

- **Full Layout**: Single callback displayed in full-page view
- **Split Layout**: Two callbacks displayed side-by-side

#### Available Stories:

**Full Layout:**
- `FullLayoutSingleCallback` - Basic single callback test
- `FullLayoutWithRealWeather` - Example with weather-like content

**Split Layout:**
- `SplitLayoutTwoCallbacks` - Basic two-callback test
- `SplitLayoutWeatherAndTasks` - Example with weather and task list

### 2. Callback Stories

Individual callbacks have their own stories in their respective directories:
- `src/callbacks/weather/weather.stories.ts`
- `src/callbacks/calendar/calendar.stories.ts`
- `src/callbacks/reddit/reddit.stories.ts`
- `src/callbacks/todoist/todoist.stories.ts`

## Creating New Stories

### For a New Callback

Create a `.stories.ts` file in your callback directory:

```typescript
import type { Meta, StoryObj } from "@storybook/html-vite";
import { createLiquidStory } from "../../../.storybook/liquidRenderer";
import template from "./template.liquid?raw";

const meta = {
  title: "Callbacks/My Callback",
  render: createLiquidStory(template),
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: {
      // Your test data here
    },
  },
};
```

### For Testing Layout Combinations

To test how callbacks look when combined in layouts:

```typescript
import { Liquid } from "liquidjs";
import splitLayoutTemplate from "../../views/layouts/split.liquid?raw";

const renderSplitLayout = (args: any) => {
  const engine = new Liquid();
  return engine.parseAndRenderSync(splitLayoutTemplate, args);
};

export const MyCombo: Story = {
  render: renderSplitLayout,
  args: {
    content: `
      <div>${callbackContent1}</div>
      <div>${callbackContent2}</div>
    `,
  },
};
```

## Testing Workflow

### 1. Visual Testing

Use Storybook to:
- Verify callback templates render correctly
- Test layout combinations (full vs split)
- Check responsive behavior
- Validate styling and spacing

### 2. Interactive Testing

Storybook's Controls addon allows you to:
- Modify callback data in real-time
- Test edge cases (empty data, long text, etc.)
- Verify error states

### 3. Layout Validation

When testing layouts, verify:
- **Full Layout**: Single callback fills the entire screen properly
- **Split Layout**: Two callbacks are displayed side-by-side with equal width
- Title bar appears at the bottom
- Proper spacing between elements
- Content doesn't overflow

## Integration Testing

### Testing the Complete Flow

To test a complete playlist item configuration:

1. Create individual callback stories with realistic data
2. Create a layout story that combines those callbacks
3. Verify the combined output matches expectations

Example:

```typescript
// Test split layout with weather + calendar
export const WeatherAndCalendar: Story = {
  render: renderSplitLayout,
  args: {
    content: `
      <div>${weatherCallbackHTML}</div>
      <div>${calendarCallbackHTML}</div>
    `,
  },
};
```

## Best Practices

### 1. Use Realistic Data

Always use realistic data in your stories that represents actual API responses:

```typescript
const fixtures = {
  weather: {
    today: {
      max: 27.9,
      low: 10.2,
      current: 21.9,
      condition: {
        text: "Partly cloudy",
        image: "https://cdn.weatherapi.com/weather/64x64/night/116.png",
      },
    },
  },
};
```

### 2. Test Edge Cases

Create stories for edge cases:
- Empty data
- Maximum data (long text, many items)
- Error states
- Missing optional fields

```typescript
export const EmptyState: Story = {
  args: { data: {} },
};

export const MaxData: Story = {
  args: { data: fixtures.maxData },
};
```

### 3. Document Expected Behavior

Use story descriptions to document what should be tested:

```typescript
export const SplitLayoutEqual: Story = {
  args: { content: `...` },
  parameters: {
    docs: {
      description: {
        story: "Verifies that both callbacks take up equal width (50% each)",
      },
    },
  },
};
```

## Visual Regression Testing

To enable visual regression testing:

1. Install `@storybook/addon-visual-tests` or similar
2. Configure snapshot testing
3. Run tests before and after changes

```bash
npm run storybook -- --test
```

## Troubleshooting

### Stories Not Showing Up

- Check that your `.stories.ts` files match the glob patterns in `.storybook/preview.ts`
- Verify Liquid template syntax is correct
- Check browser console for errors

### Layout Not Rendering Correctly

- Verify the `content` variable is properly set
- Check that CSS classes match TRMNL screen styles
- Ensure head/footer partials are included

### Template Syntax Errors

- Validate Liquid syntax using the liquidjs parser
- Check that all variables used in templates are provided in `args.data`

## Additional Resources

- [Storybook Documentation](https://storybook.js.org/docs)
- [LiquidJS Documentation](https://liquidjs.com/)
- [TRMNL CSS Guide](https://usetrmnl.com/css/latest/plugins.css)

## Running Tests in CI

Add to your CI pipeline:

```yaml
- name: Build Storybook
  run: npm run build-storybook

- name: Test Storybook
  run: npm run storybook:test
```

This ensures all stories build successfully and can be deployed for visual review.
