# Using Liquidjs Features in Layouts

## Overview

Layout templates now properly support liquidjs features including:
- **Partials** via `{% render %}`
- **Content injection** via variable interpolation `{{ content }}`
- **Layout-specific callback templates**

## Layout Structure

### Full Layout (`views/layouts/full.liquid`)

```liquid
{% render 'head.liquid' %}
  <div class="view view--full">
    {{ content }}
    <div class="title_bar">
      <span class="title">Title</span>
      <span class="instance">Instance</span>
    </div>
  </div>
{% render 'footer.liquid' %}
```

- `{% render 'head.liquid' %}` - Includes the header partial with CSS and opening HTML tags
- `{{ content }}` - Injects the rendered callback content
- `{% render 'footer.liquid' %}` - Includes the footer partial with closing HTML tags

### 2-Col Layout (`views/layouts/2-col.liquid`)

```liquid
{% render 'head.liquid' %}
  <div class="view view--half_vertical">
    {{ content_left }}
    {{ content_right }}
    <div class="title_bar">
      <span class="title">Title</span>
      <span class="instance">Instance</span>
    </div>
  </div>
{% render 'footer.liquid' %}
```

- `{{ content_left }}` - Injects the first callback's content
- `{{ content_right }}` - Injects the second callback's content

## How It Works

### Rendering Flow

1. **StateMachine** receives a playlist item with layout type
2. **Callbacks** render WITHOUT head/footer (`includeWrapper: false`)
3. **StateMachine** prepares block data:
   - Full layout: `{ content: callbackHtml }`
   - 2-col layout: `{ content_left: callback1Html, content_right: callback2Html }`
4. **liquidjs engine** configured with:
   - `root: ./views/layouts` - For layout templates
   - `partials: ./views/partials` - For partial includes
   - `extname: .liquid` - File extension
5. **Layout template** renders with:
   - Partials included via `{% render %}`
   - Content injected via `{{ variable }}`

### Callback Rendering

When callbacks are part of a layout, they render in "content-only" mode:
- No `<head>`, `<body>`, or wrapper HTML
- Only the callback's core content
- Layout template provides the wrapper

Example year-progress output in layout mode:
```html
<div class="layout layout--row">
  <section class="flex flex--col">
    <h1 class="title">Wed, Feb 4, 2026</h1>
    <!-- ... year progress grid ... -->
  </section>
</div>
```

## Partials

Partials are stored in `views/partials/`:
- `head.liquid` - HTML head, CSS, opening tags
- `footer.liquid` - Closing tags

### Including Partials

```liquid
{% render 'head.liquid' %}
{% render 'footer.liquid' %}
```

The liquidjs engine automatically:
- Looks in the `partials` directory
- Adds `.liquid` extension if not specified
- Renders the partial inline

## Layout-Specific Callback Templates

Callbacks can provide layout-specific templates for optimized rendering:

### Template Resolution Order (2-col layout)

1. `src/callbacks/{name}/template.2col.liquid` - Layout-specific template
2. `src/callbacks/{name}/template.liquid` - Default fallback

### Example

**Default template** (`template.liquid`):
```liquid
<div class="layout layout--row">
  <section class="flex flex--col">
    <h1 class="title">{{ data.date }}</h1>
    <!-- Large grid for full-page display -->
  </section>
</div>
```

**2-col template** (`template.2col.liquid`):
```liquid
<div class="layout layout--row">
  <section class="flex flex--col">
    <h2 class="title">{{ data.date }}</h2>
    <!-- Smaller, more compact grid -->
  </section>
</div>
<style>
  /* Optimized styling for half-width display */
  .month div {
    --size: 18px;
  }
</style>
```

## Creating New Layouts

To create a new layout type:

1. **Add to type definition** (`src/types/index.ts`):
```typescript
export type PlaylistItem = {
  layout: "full" | "2-col" | "3-col";  // Add new type
  // ...
};
```

2. **Create layout template** (`views/layouts/3-col.liquid`):
```liquid
{% render 'head.liquid' %}
  <div class="view view--three_col">
    {{ content_left }}
    {{ content_center }}
    {{ content_right }}
    <div class="title_bar">
      <span class="title">Title</span>
      <span class="instance">Instance</span>
    </div>
  </div>
{% render 'footer.liquid' %}
```

3. **Update StateMachine** (`src/stateMachine.ts`):
```typescript
// Prepare data for blocks based on layout type
let blockData: Record<string, string> = {};
if (playlistItem.layout === "2-col") {
  blockData = {
    content_left: callbackContents[0] || "",
    content_right: callbackContents[1] || "",
  };
} else if (playlistItem.layout === "3-col") {
  blockData = {
    content_left: callbackContents[0] || "",
    content_center: callbackContents[1] || "",
    content_right: callbackContents[2] || "",
  };
} else {
  blockData = {
    content: combinedContent,
  };
}
```

4. **Update validation** (`src/plugins/clients.ts`):
```typescript
.refine(
  (item) => {
    if (item.layout === "full") return item.callbacks.length === 1;
    if (item.layout === "2-col") return item.callbacks.length === 2;
    if (item.layout === "3-col") return item.callbacks.length === 3;
    return true;
  },
  // ...
)
```

## Benefits

✅ **Separation of Concerns** - Callbacks don't worry about page structure
✅ **Reusability** - Same callback works in any layout
✅ **Maintainability** - Change head/footer in one place
✅ **Flexibility** - Easy to create new layouts
✅ **Optimization** - Callbacks can provide layout-specific templates
✅ **Clean Code** - No HTML duplication

## Technical Notes

### Why Variables Instead of Blocks?

liquidjs `{% block %}` is designed for template inheritance (extending base templates). For our use case of composing multiple rendered components, variable interpolation is more appropriate:

```liquid
<!-- Variable interpolation (what we use) -->
{{ content }}

<!-- Block directive (for inheritance) -->
{% block content %}
  default content if not overridden
{% endblock %}
```

Our approach:
1. Render callbacks to strings
2. Pass strings as variables to layout
3. Layout interpolates them with `{{ variable }}`

This is simpler and more flexible for our component composition pattern.

### liquidjs Configuration

The liquidjs engine is configured when rendering layouts:

```typescript
const engine = new Liquid({
  root: path.resolve("./views/layouts"),      // Layout templates
  partials: path.resolve("./views/partials"), // Partial includes
  extname: ".liquid",                         // File extension
});
```

This configuration:
- Enables `{% render 'partial' %}` to find files in `./views/partials/`
- Supports relative paths in layout templates
- Automatically appends `.liquid` extension

## Examples

### Example 1: Year Progress in Full Layout

**Playlist:**
```json
{
  "id": "dashboard",
  "layout": "full",
  "callbacks": [
    {"name": "year-progress"}
  ]
}
```

**Rendering:**
1. `year-progress` renders content only
2. Layout includes head/footer via partials
3. Content injected as `{{ content }}`

**Output:**
```html
<!DOCTYPE html>
<html>
<head>...</head>
<body>
  <div class="view view--full">
    <!-- year-progress content here -->
    <div class="title_bar">...</div>
  </div>
</body>
</html>
```

### Example 2: Weather Comparison in 2-Col Layout

**Playlist:**
```json
{
  "id": "weather-compare",
  "layout": "2-col",
  "callbacks": [
    {"name": "weather", "options": {"zipcode": "94103"}},
    {"name": "weather", "options": {"zipcode": "10001"}}
  ]
}
```

**Rendering:**
1. Both weather callbacks render content only
2. Layout includes head/footer via partials
3. First weather → `{{ content_left }}`
4. Second weather → `{{ content_right }}`

**Output:**
```html
<!DOCTYPE html>
<html>
<head>...</head>
<body>
  <div class="view view--half_vertical">
    <!-- SF weather content -->
    <!-- NY weather content -->
    <div class="title_bar">...</div>
  </div>
</body>
</html>
```

## Troubleshooting

### Partial Not Found

**Error:** `ENOENT: no such file or directory, open './views/partials/head.liquid'`

**Solution:** Ensure liquidjs is configured with correct paths:
```typescript
const engine = new Liquid({
  partials: path.resolve("./views/partials"),
});
```

### Duplicate Head/Footer

**Problem:** Multiple `<head>` sections in output

**Solution:** Ensure callbacks render with `includeWrapper: false` when part of layouts. Check that `layout` parameter is passed to `callback.render()`.

### Content Not Showing

**Problem:** Layout renders but content is empty

**Solution:** Check that callback content is being extracted and passed to layout template. Verify block data is prepared correctly in StateMachine.

## See Also

- [LAYOUT_MIGRATION.md](./LAYOUT_MIGRATION.md) - Layout system overview
- [TEMPLATE_NAMING_CONVENTIONS.md](./TEMPLATE_NAMING_CONVENTIONS.md) - Template naming guide
- [liquidjs documentation](https://liquidjs.com/) - Official liquidjs docs
