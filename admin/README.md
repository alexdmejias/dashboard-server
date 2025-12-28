# Dashboard Server Admin Interface

A SolidJS-based admin interface for monitoring and managing dashboard-server clients in real-time.

## Features

- **Real-time Updates**: Uses Server-Sent Events (SSE) for live client monitoring
- **TanStack Query Integration**: Efficient data fetching with caching and stale-while-revalidate strategy
- **Client Overview**: Display all connected clients with their current state
- **Callback Information**: View callback playlists, current index, and available callbacks
- **Connection Status**: Visual indicator showing connection status
- **Responsive Design**: Built with DaisyUI and Tailwind CSS

## Architecture

The admin interface uses a hybrid approach:
1. **TanStack Query** fetches initial client data from `/api/clients` with caching
2. **SSE Connection** provides real-time updates via `/api/clients/stream`
3. Updates from SSE override the cached data for instant UI updates

This approach provides:
- Fast initial page load (cached data)
- Real-time updates without polling
- Automatic error handling and retry logic
- Optimistic UI updates

## Development

### Prerequisites

- Node.js 18+
- npm

### Install Dependencies

```bash
npm install
```

### Development Server

```bash
npm run dev
```

This will start the Vite dev server on port 3001. For full integration testing, run the main dashboard-server instead.

### Build for Production

```bash
npm run build
```

This builds the admin interface to `../public/admin/` directory, which is then served by the main Fastify server.

## Architecture

### Components

- **ClientCard**: Displays individual client information including callbacks and current state
- **ClientsList**: Manages the grid layout of all client cards
- **SSE Connection**: Manages real-time connection to `/api/clients/stream`

### Directory Structure

```
admin/
├── src/
│   ├── routes/
│   │   └── index.tsx          # Main dashboard view
│   ├── components/
│   │   ├── ClientCard.tsx     # Individual client display
│   │   └── ClientsList.tsx    # Client list container
│   ├── lib/
│   │   ├── api.ts            # API client functions
│   │   └── sse.ts            # SSE connection management
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   ├── app.tsx               # App root component
│   └── entry-client.tsx      # Client entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Integration

The admin interface is automatically served by the main dashboard-server at the root path (`/`). All API routes (starting with `/api/`) are handled by the Fastify server, while unmatched routes serve the admin interface for client-side routing.

## API Endpoints Used

- **GET /api/clients**: Fetches current state of all clients
- **GET /api/clients/stream**: SSE endpoint for real-time client updates

## Technologies

- **SolidJS**: Reactive UI framework
- **TanStack Query**: Server state management with caching
- **Vite**: Build tool and dev server
- **TypeScript**: Type safety
- **DaisyUI**: Component library
- **Tailwind CSS**: Utility-first CSS framework
