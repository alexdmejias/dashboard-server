# Browser Rendering Configuration

This application supports multiple browser rendering backends for generating screenshots and images. You can choose between a local Puppeteer renderer or external services like Cloudflare Browser Rendering.

## Configuration

The browser renderer is configured via environment variables. See `.env.sample` for a template.

### Required Environment Variables

- `BROWSER_RENDERER`: Specifies which renderer to use
  - `puppeteer` (default): Uses local Puppeteer with Chromium
  - `cloudflare`: Uses Cloudflare Browser Rendering API

### Puppeteer Renderer (Default)

When using the Puppeteer renderer, the following optional environment variable can be set:

- `CHROMIUM_BIN`: Path to Chromium binary (optional, uses bundled Chromium if not specified)

**Installation:**
```bash
npm install puppeteer
```

**Example configuration:**
```env
BROWSER_RENDERER=puppeteer
CHROMIUM_BIN=/usr/bin/chromium-browser  # Optional
```

### Cloudflare Browser Rendering

When using the Cloudflare renderer, the following environment variables are required:

- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token with Browser Rendering permissions

**No additional installation required** - uses Cloudflare's remote rendering service.

**Example configuration:**
```env
BROWSER_RENDERER=cloudflare
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

#### Getting Cloudflare Credentials

1. Sign up for Cloudflare at https://dash.cloudflare.com/sign-up
2. Navigate to your account settings to find your Account ID
3. Create an API token with Browser Rendering permissions:
   - Go to https://dash.cloudflare.com/profile/api-tokens
   - Click "Create Token"
   - Select or create a custom token with Browser Rendering permissions
   - Save the generated token

## Architecture

The browser rendering functionality is abstracted through the `BrowserRenderer` interface, which allows different implementations to be plugged in without changing core application code.

### Key Components

- **BrowserRenderer Interface** (`src/types/browser-renderer.ts`): Defines the contract for all browser rendering implementations
- **CloudflareBrowserRenderer** (`src/utils/CloudflareBrowserRenderer.ts`): Implementation using Cloudflare's Browser Rendering API
- **PuppeteerBrowserRenderer** (`src/utils/PuppeteerBrowserRenderer.ts`): Implementation using local Puppeteer
- **browserRendererFactory** (`src/utils/browserRendererFactory.ts`): Factory function that creates the appropriate renderer based on configuration

### Adding New Renderers

To add a new browser rendering provider:

1. Create a new class that implements the `BrowserRenderer` interface
2. Implement the `renderPage(options: RenderOptions): Promise<RenderResult>` method
3. Update the `browserRendererFactory.ts` to include your new renderer
4. Add any required environment variables to `.env.sample`
5. Update this documentation

Example:

```typescript
import { BrowserRenderer, RenderOptions, RenderResult } from "../types/browser-renderer";

class MyCustomRenderer implements BrowserRenderer {
  async renderPage(options: RenderOptions): Promise<RenderResult> {
    // Your implementation here
    const { htmlContent, imagePath, size } = options;
    
    // Render the HTML and return the result
    return {
      path: imagePath,
      buffer: resultBuffer,
    };
  }
}

export default MyCustomRenderer;
```

## Benefits

### Cloudflare Browser Rendering
- No need to install Chromium/Puppeteer locally
- Reduced server resource usage
- Easier deployment and scaling
- No browser binary maintenance

### Puppeteer (Local)
- Works offline
- No external API dependency
- No usage costs
- Full control over browser configuration

## Migration Guide

If you're migrating from the old Puppeteer-only setup:

1. Update your `.env` file to include `BROWSER_RENDERER=puppeteer` to maintain current behavior
2. (Optional) Switch to Cloudflare by setting `BROWSER_RENDERER=cloudflare` and adding Cloudflare credentials
3. No code changes are required - the abstraction handles the switching automatically

## Troubleshooting

### Error: "Puppeteer is not installed"
If you get this error, either:
- Install Puppeteer: `npm install puppeteer`
- Switch to Cloudflare renderer: `BROWSER_RENDERER=cloudflare`

### Error: "Cloudflare Browser Rendering requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN"
Make sure you've set both required environment variables in your `.env` file.

### Cloudflare API Errors
- Check that your API token has the correct permissions
- Verify your account ID is correct
- Check Cloudflare's status page for service issues
