# Template Naming Conventions

This document describes the naming conventions for callback templates, including layout-specific templates.

## Overview

Callbacks can provide layout-specific templates that are optimized for particular layout types (e.g., `2-col`, `full`). The template resolution system automatically tries to load a layout-specific template first, then falls back to the default template if one isn't found.

## File Naming Convention

### Default Template
Every callback has a default template:
```
src/callbacks/{callback-name}/template.liquid
```

### Layout-Specific Templates
For layout-specific optimizations, use the dot-notation suffix pattern:
```
src/callbacks/{callback-name}/template.{layout-name}.liquid
```

**Examples:**
- `template.2col.liquid` - Optimized for 2-column layout
- `template.full.liquid` - Optimized for full-page layout (though typically unnecessary since default is used)

## Why This Convention?

### ✅ Advantages of `template.2col.liquid`

1. **Flat structure** - No unnecessary directory nesting
2. **Clear semantics** - The dot notation clearly indicates a variant
3. **Familiar pattern** - Similar to common conventions like:
   - `file.min.js` (minified JavaScript)
   - `styles.mobile.css` (mobile-specific styles)
   - `config.production.json` (production config)
4. **Filesystem friendly** - No problematic characters or directory traversal
5. **Easy to glob** - Pattern matching works naturally: `template.*.liquid`
6. **Extensible** - Easy to add more layout types in the future

### ❌ Why NOT `template-1/2-col.liquid`

The previous convention had several issues:
- "1/2-col" looks like a fraction or division operation
- Creates unnecessary directory nesting
- Unclear what "1" represents (one-half? variant 1?)
- The slash in the middle is confusing

## Template Resolution Process

When rendering a callback with a specific layout:

1. **Try layout-specific template**: `src/callbacks/{name}/template.{layout}.liquid`
2. **Fall back to default**: `src/callbacks/{name}/template.liquid`

This happens automatically in `CallbackBase.resolveLayoutTemplate()`.

## Example: Creating a 2-Col Optimized Template

Let's say you want to create a compact version of the `weather` callback for the 2-column layout:

1. Start with your default template:
   ```
   src/callbacks/weather/template.liquid
   ```

2. Create a layout-specific version:
   ```
   src/callbacks/weather/template.2col.liquid
   ```

3. Optimize the 2-col version:
   - Use smaller fonts
   - Reduce padding/margins
   - Show less information
   - Adjust grid/flexbox sizing

4. The system automatically uses `template.2col.liquid` when the callback is rendered in a 2-col layout

## Code Example

```typescript
// In CallbackBase.resolveLayoutTemplate()
if (layout === "2-col") {
  const layoutSpecific = path.resolve(
    `./src/callbacks/${this.name}/template.2col.liquid`
  );
  if (fs.existsSync(layoutSpecific)) {
    return layoutSpecific; // Use layout-specific
  }
}
return this.template; // Fall back to default
```

## Migration Guide

If you have existing layout-specific templates using the old convention:

**Before:**
```
src/callbacks/year-progress/template-1/2-col.liquid
```

**After:**
```
src/callbacks/year-progress/template.2col.liquid
```

**Migration steps:**
1. Move the file to the callback's root directory
2. Rename using the dot-notation pattern
3. Remove the now-empty `template-1` directory

```bash
mv src/callbacks/year-progress/template-1/2-col.liquid \
   src/callbacks/year-progress/template.2col.liquid
rmdir src/callbacks/year-progress/template-1
```

## Best Practices

1. **Only create layout-specific templates when needed** - If the default template works well across all layouts, don't create variants
2. **Keep consistent structure** - Layout-specific templates should have the same data structure as the default
3. **Test both paths** - Ensure your callback works with and without the layout-specific template
4. **Document differences** - Add comments explaining what's optimized in the layout-specific version

## Future Extensions

This convention can easily support additional layout types:

- `template.3col.liquid` - Three-column layout
- `template.grid.liquid` - Grid-based layout
- `template.mobile.liquid` - Mobile-optimized layout
- `template.print.liquid` - Print-friendly layout

The pattern is extensible and self-documenting.
