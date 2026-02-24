import { For, Show } from "solid-js";
import { type DiffEntry, displayValue } from "../../lib/settingsHelpers";

export function DiffModal(props: {
  diff: DiffEntry[];
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="card bg-base-100 shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div class="card-body flex flex-col overflow-hidden">
          <h3 class="card-title text-lg">Review Changes</h3>
          <p class="text-sm text-base-content/70 mb-3">
            The following settings will be updated. Please review before saving.
          </p>
          <div class="overflow-y-auto flex-1">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Current Value</th>
                  <th>New Value</th>
                </tr>
              </thead>
              <tbody>
                <For each={props.diff}>
                  {(entry) => (
                    <tr>
                      <td class="font-medium">{entry.field.label}</td>
                      <td class="font-mono text-xs text-error/80">
                        {displayValue(entry.field, entry.from)}
                      </td>
                      <td class="font-mono text-xs text-success">
                        {displayValue(entry.field, entry.to)}
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
          <div class="card-actions justify-end mt-4 gap-2">
            <button
              class="btn btn-ghost"
              onClick={props.onCancel}
              disabled={props.saving}
            >
              Cancel
            </button>
            <button
              class="btn btn-primary"
              onClick={props.onConfirm}
              disabled={props.saving}
            >
              <Show when={props.saving} fallback="Save Changes">
                <span class="loading loading-spinner loading-sm" />
                Saving…
              </Show>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
