import { createSignal, onCleanup } from "solid-js";
import type { ClientsData } from "../types";

export function createSSEConnection(url: string) {
  const [data, setData] = createSignal<ClientsData | null>(null);
  const [error, setError] = createSignal<Event | null>(null);
  const [connected, setConnected] = createSignal(false);

  const eventSource = new EventSource(url);

  eventSource.onopen = () => {
    setConnected(true);
    setError(null);
  };

  eventSource.onmessage = (event) => {
    try {
      const parsedData = JSON.parse(event.data);
      setData(parsedData);
    } catch (err) {
      console.error("Error parsing SSE data:", err);
    }
  };

  eventSource.onerror = (err) => {
    setError(err);
    setConnected(false);
  };

  onCleanup(() => {
    eventSource.close();
  });

  return { data, error, connected };
}
