import { For } from "solid-js";
import type { ClientData } from "../types";

interface ClientCardProps {
  clientName: string;
  client: ClientData;
}

export function ClientCard(props: ClientCardProps) {
  return (
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">{props.clientName}</h2>
        <div class="stats stats-vertical">
          <div class="stat">
            <div class="stat-title">Current Index</div>
            <div class="stat-value text-2xl">
              {props.client.config.currCallbackIndex}
            </div>
          </div>
          <div class="stat">
            <div class="stat-title">Total Callbacks</div>
            <div class="stat-value text-2xl">
              {Object.keys(props.client.callbacks).length}
            </div>
          </div>
        </div>
        <div class="mt-4">
          <h3 class="font-bold mb-2">Available Callbacks:</h3>
          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                <For each={Object.entries(props.client.callbacks)}>
                  {([id, callback]) => (
                    <tr>
                      <td class="font-mono text-sm">{id}</td>
                      <td>{callback.name}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
