import { Writable } from "node:stream";

const MAX_LINES = 1000;

// Raw NDJSON log lines stored in arrival order (oldest first, newest last)
const rawLines: string[] = [];

// Subscribers that want to be pushed each new line in real-time
const subscribers = new Set<(line: string) => void>();

/**
 * Subscribe to new log lines. The callback is called once per line as it
 * arrives. Returns an unsubscribe function.
 */
export function subscribeToNewLines(cb: (line: string) => void): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

/**
 * Returns a copy of the buffered raw NDJSON log lines, newest-first.
 */
export function getRawLogLines(): string[] {
  return rawLines.slice().reverse();
}

/**
 * A pino-compatible Writable stream destination that buffers the last
 * MAX_LINES raw NDJSON log lines in memory and notifies subscribers.
 */
export const logBufferStream = new Writable({
  write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (err?: Error | null) => void,
  ) {
    // pino may flush multi-line chunks; split on newline boundaries
    const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    const lines = text.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        rawLines.push(trimmed);
        if (rawLines.length > MAX_LINES) {
          rawLines.shift();
        }
        // Push to all live SSE subscribers
        for (const cb of subscribers) {
          try {
            cb(trimmed);
          } catch {
            // subscriber already gone; it will unsubscribe on connection close
          }
        }
      }
    }
    callback();
  },
});
