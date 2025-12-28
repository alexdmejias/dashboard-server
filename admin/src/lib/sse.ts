import { createSignal, onCleanup, onMount } from "solid-js";
import type { ClientsData } from "../types";

interface SSEConnectionOptions {
  initialData?: ClientsData | null;
  onData?: (data: ClientsData) => void;
}

export function createSSEConnection(
  url: string,
  options?: SSEConnectionOptions,
) {
  const [data, setData] = createSignal<ClientsData | null>(
    options?.initialData ?? null,
  );
  const [error, setError] = createSignal<Event | null>(null);
  const [connected, setConnected] = createSignal(false);

  let eventSource: EventSource | null = null;

  onMount(() => {
    eventSource = new EventSource(url);

    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        setData(parsedData);
        options?.onData?.(parsedData);
      } catch (err) {
        console.error("Error parsing SSE data:", err);
        setError(new Event("error"));
      }
    };

    eventSource.onerror = (err) => {
      setError(err);
      setConnected(false);
    };
  });

  onCleanup(() => {
    eventSource?.close();
  });

  return { data, error, connected };
}
