# Browser Rendering Configuration

This application supports multiple browser rendering backends for generating screenshots and images. You can choose between a local Puppeteer renderer or external services like Cloudflare Browser Rendering and Browserless.io. You can also enable multiple services simultaneously with automatic rotation and fallback.

## Configuration

The browser renderer is configured via environment variables. See `.env.sample` for a template.

### Required Environment Variables

- `BROWSER_RENDERER`: Specifies which renderer to use
  - `puppeteer` (default): Uses local Puppeteer with Chromium
  - `cloudflare`: Uses Cloudflare Browser Rendering API
  - `browserless`: Uses Browserless.io API
  - `multi`: Uses multiple services with round-robin rotation and automatic fallback

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

### Browserless.io Browser Rendering

When using the Browserless.io renderer, the following environment variables are required:

- `BROWSERLESS_IO_TOKEN`: Your Browserless.io API token
- `BROWSERLESS_IO_ENDPOINT`: Your Browserless.io endpoint URL (e.g., `https://chrome.browserless.io`)

**No additional installation required** - uses Browserless.io's remote rendering service.

**Example configuration:**

```env
BROWSER_RENDERER=browserless
BROWSERLESS_IO_TOKEN=your-api-token
BROWSERLESS_IO_ENDPOINT=https://chrome.browserless.io
```

#### Getting Browserless.io Credentials

1. Sign up for Browserless.io at https://www.browserless.io/
2. Navigate to your account dashboard to find your API token
3. Note your endpoint URL (typically `https://chrome.browserless.io` or a custom endpoint for enterprise plans)

### Multi-Service Mode with Rotation and Fallback

The multi-service mode enables using multiple rendering services simultaneously with round-robin load distribution and automatic fallback when services fail.

**Configuration:**

```env
BROWSER_RENDERER=multi

# Enable/disable specific services
ENABLE_CLOUDFLARE_BROWSER_RENDERING=true
ENABLE_BROWSERLESS_IO=true

# Cloudflare credentials (required if enabled)
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token

# Browserless.io credentials (required if enabled)
BROWSERLESS_IO_TOKEN=your-api-token
BROWSERLESS_IO_ENDPOINT=https://chrome.browserless.io
```

**How it works:**

1. **Round-robin rotation**: Each rendering request is distributed to the next service in the rotation
2. **Automatic fallback**: If a service fails, the request automatically retries with the next available service
3. **Graceful degradation**: If no external services are configured or all fail, the system falls back to Puppeteer
4. **Flexible configuration**: Enable only the services you need by setting the appropriate flags

**Example scenarios:**

- Both services enabled: Requests alternate between Cloudflare and Browserless.io
- One service enabled: All requests use that service with no rotation
- No services enabled: Falls back to Puppeteer renderer
- Service failure: Automatically tries the next service in rotation

## Architecture

The browser rendering functionality is abstracted through the `BrowserRenderer` interface, which allows different implementations to be plugged in without changing core application code.

### Key Components

- **BrowserRenderer Interface** (`src/types/browser-renderer.ts`): Defines the contract for all browser rendering implementations
- **CloudflareBrowserRenderer** (`src/utils/CloudflareBrowserRenderer.ts`): Implementation using Cloudflare's Browser Rendering API
- **PuppeteerBrowserRenderer** (`src/utils/PuppeteerBrowserRenderer.ts`): Implementation using local Puppeteer
- **BrowserlessIOBrowserRenderer** (`src/utils/BrowserlessIOBrowserRenderer.ts`): Implementation using Browserless.io API
- **ServiceRotator** (`src/utils/ServiceRotator.ts`): Implements round-robin rotation and fallback logic for multiple services
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
import {
  BrowserRenderer,
  RenderOptions,
  RenderResult,
} from "../types/browser-renderer";

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

### Browserless.io

- No need to install Chromium/Puppeteer locally
- Reduced server resource usage
- Supports WebSockets and additional browser automation features
- Enterprise-grade browser automation with monitoring
- Flexible pricing options including self-hosted

### Puppeteer (Local)

- Works offline
- No external API dependency
- No usage costs
- Full control over browser configuration

### Multi-Service Mode

- Load distribution across multiple services
- High availability with automatic fallback
- Reduced dependency on single provider
- Cost optimization by balancing usage

## Migration Guide

If you're migrating from the old Puppeteer-only setup:

1. Update your `.env` file to include `BROWSER_RENDERER=puppeteer` to maintain current behavior
2. (Optional) Switch to a remote service by setting `BROWSER_RENDERER=cloudflare` or `BROWSER_RENDERER=browserless` and adding credentials
3. (Optional) Enable multi-service mode with `BROWSER_RENDERER=multi` and configure multiple services
4. No code changes are required - the abstraction handles the switching automatically

## Troubleshooting

### Error: "Puppeteer is not installed"

If you get this error, either:

- Install Puppeteer: `npm install puppeteer`
- Switch to a remote renderer: `BROWSER_RENDERER=cloudflare` or `BROWSER_RENDERER=browserless`

### Error: "Cloudflare Browser Rendering requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN"

Make sure you've set both required environment variables in your `.env` file.

### Error: "Browserless.io Browser Renderer requires BROWSERLESS_IO_TOKEN and BROWSERLESS_IO_ENDPOINT"

Make sure you've set both required environment variables in your `.env` file.

### Cloudflare API Errors

- Check that your API token has the correct permissions
- Verify your account ID is correct
- Check Cloudflare's status page for service issues

### Browserless.io API Errors

- Check that your API token is valid
- Verify your endpoint URL is correct
- Check your usage limits and quota
- Verify network connectivity to the endpoint
