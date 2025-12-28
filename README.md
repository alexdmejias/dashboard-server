1.should add a picture callback to display images/movies/gifs
2.switch to vitest
3. move pupperter to docker image
4. callback: load a notion page
5. callback: calendar

# Dashboard Server

A small Node/TypeScript server that renders HTML for a set of pluggable "callbacks", captures screenshots, and serves image or HTML responses for clients (useful for dashboards, inkplate displays, widgets, etc.).

Key ideas
- Callbacks live in `src/callbacks/*`. Each callback is responsible for fetching or producing data and exposing a template for rendering.
- Templates can be Liquid (`.liquid`) or EJS (`.ejs`). The renderer chooses a template per-callback and renders it with the provided data.
- The renderer uses Puppeteer to produce images (`src/utils/getScreenshot.ts`) and writes images to `public/images/` by default.
- Runtime configuration for callbacks is validated with Zod schemas exported from callback modules as `expectedConfig`.

## Quick start

Prerequisites
- Node 18+ (the project uses modern ESM/TS tooling).
- Chrome/Chromium is required by Puppeteer (the dependency is included in `package.json`).

Install and run in dev mode

```bash
npm install
npm run dev
```

This runs `tsx --watch src/index.ts` and starts the server. By default the app listens on the port defined in `process.env.PORT` or `3333`.

### Admin Interface

The server includes a web-based admin interface for monitoring connected clients in real-time. Access it at `http://localhost:3333/` (or your configured port).

Features:
- Real-time monitoring of connected clients via Server-Sent Events (SSE)
- Display of client callback playlists and current state
- Connection status indicator
- Responsive UI built with SolidJS and DaisyUI

To build the admin interface:

```bash
cd admin
npm install
npm run build
```

The admin interface is automatically served at the root path when you start the server.

## Environment
Create a `.env` file at the project root or export env vars. Example keys used by callbacks:

- `WEATHER_APIKEY` — API key for the weather callback (if enabled)
- `PORT` — server port

Other per-callback env variables are declared in each callback under `envVariablesNeeded`.

## How it works (high level)

1. The server registers callbacks listed in `src/index.ts` (it dynamically imports `./callbacks/{name}/index.ts`).
2. Each callback module may export:
   - `expectedConfig` (a Zod schema) — used to validate runtime options.
   - A default template file `template.liquid` or `template.ejs` under the callback folder or a shared view under `views/`.
3. When rendering, the server calls the callback's `getData` method, then renders the callback's template using `getRenderedTemplate`, passing two top-level objects to the renderer:

```js
{ data, runtimeConfig }
```

For Liquid templates use `{{ data }}` and `{{ runtimeConfig }}` to access values.

4. If the requested view is an image type (`png`, `bmp`) the server captures a screenshot via Puppeteer; otherwise it returns the HTML.

## Architecture

The diagram below shows how images are generated and delivered to clients.

```mermaid
flowchart LR
  Client[Client]
  Server[Dashboard Server]
  Callback[Callback pipeline src/callbacks/*]
  Renderer[Renderer Puppeteer / getScreenshot.ts]
  ImageStore[Image Storage public/images or Cloud storage]
  ImageServer[Image Server / CDN]

  Client -->|request HTTP / webhook| Server
  Server -->|invoke callback| Callback
  Callback -->|generate HTML/template| Renderer
  Renderer -->|capture screenshot / render| ImageStore
  ImageStore -->|served via HTTP| ImageServer
  ImageServer -->|image URL| Client
  Server -->|returns image URL / redirect| Client

  classDef infra fill:#f8f9fa,stroke:#ddd
  class ImageStore,ImageServer infra
```

Notes
- Code: callbacks live under `src/callbacks/` and templates under the callbacks' template files (e.g. `template.ejs`).
- Rendering: the renderer logic is in `src/utils/getScreenshot.ts` and related utilities (Puppeteer is used to render and capture screenshots).
- Storage/Serving: images are written to `public/images/` by default or uploaded to cloud storage (see `keys/` and any environment-specific config). Images are served over HTTP (optionally via a CDN).

This flow shows the happy-path: a client request triggers the server's callback pipeline, which renders HTML, captures an image, stores it, and then the client receives an image URL that can be fetched or embedded.

## API Endpoints

### Client Management

- **POST /register/:clientName** — Register a new client with a callback playlist
  - Body: `{ playlist: [{ id, callbackName, options? }] }`
  - Returns client configuration

- **GET /display/:clientName/:viewType/:callback?** — Render and display a callback
  - `:viewType` can be `png`, `bmp`, `html`, or `json`
  - Optional `:callback` parameter to render a specific callback (defaults to "next" in rotation)

### Monitoring

- **GET /health** — Health check endpoint
  - Returns server status, available callbacks, and connected clients

- **GET /api/clients** — Get current state of all clients (JSON)
  - Returns full client data including playlists and callback configurations

- **GET /api/clients/stream** — Real-time SSE stream of client updates
  - Server-Sent Events endpoint for monitoring client changes
  - Sends updates when clients are registered or modified
  - Includes heartbeat every 30 seconds

### Template Testing

- **POST /test-template** — Test a template with custom data
  - Body: `{ templateType, template, templateData?, screenDetails }`
  - Useful for developing and debugging templates

## Templates

- Liquid and EJS are both supported. `getRenderedTemplate` chooses the correct engine based on the template file extension.
- When writing Liquid templates, prefer `{{ data.foo }}` and `{{ runtimeConfig.bar }}`. Use the `default` filter for ternary-like fallback: `{{ data.title | default: runtimeConfig.title }}`.

## Adding a new callback

1. Create `src/callbacks/<name>/index.ts` that extends `CallbackBase` (or matches the callback shape).
2. Optionally export `expectedConfig` (a Zod schema) and ensure you validate/merge runtime options.
3. Add a template at `src/callbacks/<name>/template.liquid` or `template.ejs` (or a shared view at `views/<name>.<ext>`).
4. Register the callback in `src/index.ts` so the server imports it at startup.

Minimal callback example (pseudo):

```ts
export const expectedConfig = z.object({ zipcode: z.string() });

class CallbackFoo extends CallbackBase<TemplateShape, typeof expectedConfig> {
  constructor(options = {}) {
    super({ name: 'foo', expectedConfig, receivedConfig: options });
  }

  async getData(config) { /* return template data */ }
}

export default CallbackFoo;
```

## Debugging templates

- If a template renders nothing, inspect the shape of the `data` passed to `getRenderedTemplate` — Liquid receives `{ data, runtimeConfig }`.
- Use console logs or temporarily render HTML to the console during development.

## Tests

Run unit tests with:

```bash
npm test
```

## Development notes & TODOs

- Callbacks and templates are intentionally lightweight — add more unit tests and a CI pipeline.
- Consider moving Puppeteer into a Docker image for reproducible rendering environments.
- Possible improvements: switch to Vitest, add end-to-end tests for rendering, add a configurable image storage backend.
