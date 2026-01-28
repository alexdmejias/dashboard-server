import { For, Show } from "solid-js";
import type { ClientsData } from "../types";
import { ClientCard } from "./ClientCard";

interface ClientsListProps {
  data: ClientsData | null;
}

export function ClientsList(props: ClientsListProps) {
  return (
    <div class="container mx-auto p-4">
      <Show
        when={props.data && Object.keys(props.data.clients).length > 0}
        fallback={
          <div class="text-center py-8">
            <p class="text-lg">No clients connected</p>
          </div>
        }
      >
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <For each={Object.entries(props.data?.clients || {})}>
            {([clientName, client]) => (
              <ClientCard clientName={clientName} client={client} />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
