import {
  createMutation,
  createQuery,
  useQueryClient,
} from "@tanstack/solid-query";
import { createSignal, For, Show } from "solid-js";
import { fetchAvailableCallbacks, updateClientPlaylist } from "../lib/api";

interface PlaylistItem {
  id: string;
  layout: "full" | "split";
  callbacks: Array<{
    name: string;
    options?: Record<string, unknown>;
  }>;
}

interface AvailableCallback {
  id: string;
  name: string;
  expectedConfig?: any;
}

// Shared utility function for parsing JSON options
function parseOptions(optionsStr: string): {
  result: Record<string, unknown>;
  error?: string;
} {
  try {
    const parsed = JSON.parse(optionsStr);
    return { result: parsed };
  } catch (e) {
    return {
      result: {},
      error: e instanceof Error ? e.message : "Invalid JSON",
    };
  }
}

export function PlaylistEditor(props: {
  clientName: string;
  initialPlaylist: PlaylistItem[];
}) {
  const [playlist, setPlaylist] = createSignal<PlaylistItem[]>([
    ...props.initialPlaylist,
  ]);
  const [editingIndex, setEditingIndex] = createSignal<number | null>(null);
  const [isAddingNew, setIsAddingNew] = createSignal(false);
  const [newItem, setNewItem] = createSignal<PlaylistItem>({
    id: "",
    layout: "full",
    callbacks: [{ name: "", options: {} }],
  });
  const [error, setError] = createSignal<string | null>(null);
  const [success, setSuccess] = createSignal(false);

  const queryClient = useQueryClient();

  // Fetch available callbacks
  const callbacksQuery = createQuery(() => ({
    queryKey: ["available-callbacks"],
    queryFn: fetchAvailableCallbacks,
  }));

  const updateMutation = createMutation(() => ({
    mutationFn: (newPlaylist: PlaylistItem[]) =>
      updateClientPlaylist(props.clientName, newPlaylist),
    onSuccess: () => {
      setSuccess(true);
      setError(null);
      // Invalidate client queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["client", props.clientName] });
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess(false);
    },
  }));

  const handleSave = () => {
    setError(null);
    updateMutation.mutate(playlist());
  };

  const handleAddCallback = () => {
    const item = newItem();
    if (!item.id) {
      setError("ID is required");
      return;
    }
    // Check for duplicate ID
    if (playlist().some((p) => p.id === item.id)) {
      setError("ID must be unique");
      return;
    }
    // Validate callbacks based on layout
    if (item.layout === "full" && item.callbacks.length !== 1) {
      setError("Full layout requires exactly 1 callback");
      return;
    }
    if (item.layout === "split" && item.callbacks.length !== 2) {
      setError("Split layout requires exactly 2 callbacks");
      return;
    }
    // Validate all callbacks have names
    for (const callback of item.callbacks) {
      if (!callback.name) {
        setError("All callbacks must have a name");
        return;
      }
    }
    setPlaylist([...playlist(), item]);
    setNewItem({
      id: "",
      layout: "full",
      callbacks: [{ name: "", options: {} }],
    });
    setIsAddingNew(false);
    setError(null);
  };

  const handleRemove = (index: number) => {
    setPlaylist(playlist().filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newPlaylist = [...playlist()];
    [newPlaylist[index - 1], newPlaylist[index]] = [
      newPlaylist[index],
      newPlaylist[index - 1],
    ];
    setPlaylist(newPlaylist);
  };

  const handleMoveDown = (index: number) => {
    if (index === playlist().length - 1) return;
    const newPlaylist = [...playlist()];
    [newPlaylist[index], newPlaylist[index + 1]] = [
      newPlaylist[index + 1],
      newPlaylist[index],
    ];
    setPlaylist(newPlaylist);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
  };

  const handleSaveEdit = (index: number, updatedItem: PlaylistItem) => {
    const newPlaylist = [...playlist()];
    newPlaylist[index] = updatedItem;
    setPlaylist(newPlaylist);
    setEditingIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
  };

  return (
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Playlist Editor</h2>

        <Show when={error()}>
          <div class="alert alert-error">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error()}</span>
          </div>
        </Show>

        <Show when={success()}>
          <div class="alert alert-success">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Playlist updated successfully!</span>
          </div>
        </Show>

        {/* Playlist Items */}
        <div class="space-y-4">
          <For each={playlist()}>
            {(item, index) => (
              <Show
                when={editingIndex() === index()}
                fallback={
                  <div class="flex items-center gap-2 p-4 border border-base-300 rounded-lg">
                    <div class="flex-1">
                      <div class="font-bold">{item.id}</div>
                      <div class="text-sm text-gray-500">
                        Layout: {item.layout}
                      </div>
                      <div class="text-xs font-mono mt-1">
                        Callbacks: {item.callbacks.map((cb) => cb.name).join(", ")}
                      </div>
                    </div>
                    <div class="flex gap-1">
                      <button
                        onClick={() => handleMoveUp(index())}
                        class="btn btn-sm btn-ghost"
                        disabled={index() === 0}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMoveDown(index())}
                        class="btn btn-sm btn-ghost"
                        disabled={index() === playlist().length - 1}
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => handleEdit(index())}
                        class="btn btn-sm btn-primary"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemove(index())}
                        class="btn btn-sm btn-error"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                }
              >
                <EditablePlaylistItem
                  item={item}
                  availableCallbacks={callbacksQuery.data?.callbacks || []}
                  onSave={(updatedItem) => handleSaveEdit(index(), updatedItem)}
                  onCancel={handleCancelEdit}
                />
              </Show>
            )}
          </For>
        </div>

        {/* Add New Item */}
        <Show when={!isAddingNew()}>
          <button
            onClick={() => setIsAddingNew(true)}
            class="btn btn-primary btn-outline"
          >
            + Add Playlist Item
          </button>
        </Show>

        <Show when={isAddingNew()}>
          <AddNewPlaylistItem
            availableCallbacks={callbacksQuery.data?.callbacks || []}
            onAdd={(item) => {
              handleAddCallback();
            }}
            onCancel={() => setIsAddingNew(false)}
            newItem={newItem}
            setNewItem={setNewItem}
          />
        </Show>

        {/* Save Button */}
        <div class="divider" />
        <button
          onClick={handleSave}
          class="btn btn-success"
          disabled={updateMutation.isPending}
        >
          <Show when={updateMutation.isPending}>
            <span class="loading loading-spinner" />
          </Show>
          Save Playlist
        </button>
      </div>
    </div>
  );
}

function AddNewPlaylistItem(props: {
  availableCallbacks: AvailableCallback[];
  onAdd: (item: PlaylistItem) => void;
  onCancel: () => void;
  newItem: () => PlaylistItem;
  setNewItem: (item: PlaylistItem) => void;
}) {
  const [jsonErrors, setJsonErrors] = createSignal<(string | null)[]>([null]);

  const item = props.newItem;

  const handleLayoutChange = (layout: "full" | "split") => {
    const currentItem = item();
    if (layout === "full") {
      props.setNewItem({
        ...currentItem,
        layout: "full",
        callbacks: [currentItem.callbacks[0] || { name: "", options: {} }],
      });
    } else {
      props.setNewItem({
        ...currentItem,
        layout: "split",
        callbacks: [
          currentItem.callbacks[0] || { name: "", options: {} },
          currentItem.callbacks[1] || { name: "", options: {} },
        ],
      });
    }
  };

  const handleCallbackNameChange = (index: number, name: string) => {
    const currentItem = item();
    const newCallbacks = [...currentItem.callbacks];
    newCallbacks[index] = { ...newCallbacks[index], name };
    props.setNewItem({ ...currentItem, callbacks: newCallbacks });
  };

  const handleCallbackOptionsChange = (index: number, optionsStr: string) => {
    const { result, error } = parseOptions(optionsStr);
    const errors = [...jsonErrors()];
    errors[index] = error || null;
    setJsonErrors(errors);

    if (!error) {
      const currentItem = item();
      const newCallbacks = [...currentItem.callbacks];
      newCallbacks[index] = { ...newCallbacks[index], options: result };
      props.setNewItem({ ...currentItem, callbacks: newCallbacks });
    }
  };

  return (
    <div class="p-4 border-2 border-dashed border-primary rounded-lg">
      <h3 class="font-bold mb-2">Add New Playlist Item</h3>
      
      <div class="form-control mb-4">
        <label class="label">
          <span class="label-text">ID</span>
        </label>
        <input
          type="text"
          placeholder="unique-id"
          class="input input-bordered"
          value={item().id}
          onInput={(e) =>
            props.setNewItem({ ...item(), id: e.currentTarget.value })
          }
        />
      </div>

      <div class="form-control mb-4">
        <label class="label">
          <span class="label-text">Layout</span>
        </label>
        <select
          class="select select-bordered"
          value={item().layout}
          onChange={(e) =>
            handleLayoutChange(e.currentTarget.value as "full" | "split")
          }
        >
          <option value="full">Full (1 callback)</option>
          <option value="split">Split (2 callbacks)</option>
        </select>
      </div>

      <div class="space-y-4">
        <For each={item().callbacks}>
          {(callback, callbackIndex) => (
            <div class="p-3 border border-base-300 rounded">
              <h4 class="font-semibold mb-2">
                Callback {callbackIndex() + 1}
              </h4>
              <div class="form-control mb-2">
                <label class="label">
                  <span class="label-text">Callback Name</span>
                </label>
                <select
                  class="select select-bordered"
                  value={callback.name}
                  onChange={(e) =>
                    handleCallbackNameChange(
                      callbackIndex(),
                      e.currentTarget.value
                    )
                  }
                >
                  <option value="">Select callback...</option>
                  <For each={props.availableCallbacks}>
                    {(availableCallback) => (
                      <option value={availableCallback.id}>
                        {availableCallback.name}
                      </option>
                    )}
                  </For>
                </select>
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Options (JSON)</span>
                </label>
                <textarea
                  class={`textarea textarea-bordered font-mono text-sm ${
                    jsonErrors()[callbackIndex()] ? "textarea-error" : ""
                  }`}
                  placeholder='{"key": "value"}'
                  value={JSON.stringify(callback.options || {}, null, 2)}
                  onInput={(e) =>
                    handleCallbackOptionsChange(
                      callbackIndex(),
                      e.currentTarget.value
                    )
                  }
                  rows={3}
                />
                <Show when={jsonErrors()[callbackIndex()]}>
                  <label class="label">
                    <span class="label-text-alt text-error">
                      {jsonErrors()[callbackIndex()]}
                    </span>
                  </label>
                </Show>
              </div>
            </div>
          )}
        </For>
      </div>

      <div class="flex gap-2 mt-4">
        <button
          onClick={() => props.onAdd(item())}
          class="btn btn-primary"
          disabled={jsonErrors().some((e) => e !== null)}
        >
          Add
        </button>
        <button onClick={props.onCancel} class="btn btn-ghost">
          Cancel
        </button>
      </div>
    </div>
  );
}

function EditablePlaylistItem(props: {
  item: PlaylistItem;
  availableCallbacks: AvailableCallback[];
  onSave: (item: PlaylistItem) => void;
  onCancel: () => void;
}) {
  const [editedItem, setEditedItem] = createSignal<PlaylistItem>({
    ...props.item,
  });
  const [jsonErrors, setJsonErrors] = createSignal<(string | null)[]>(
    props.item.callbacks.map(() => null)
  );

  const handleLayoutChange = (layout: "full" | "split") => {
    const currentItem = editedItem();
    if (layout === "full") {
      setEditedItem({
        ...currentItem,
        layout: "full",
        callbacks: [currentItem.callbacks[0] || { name: "", options: {} }],
      });
    } else {
      setEditedItem({
        ...currentItem,
        layout: "split",
        callbacks: [
          currentItem.callbacks[0] || { name: "", options: {} },
          currentItem.callbacks[1] || { name: "", options: {} },
        ],
      });
    }
  };

  const handleCallbackNameChange = (index: number, name: string) => {
    const currentItem = editedItem();
    const newCallbacks = [...currentItem.callbacks];
    newCallbacks[index] = { ...newCallbacks[index], name };
    setEditedItem({ ...currentItem, callbacks: newCallbacks });
  };

  const handleCallbackOptionsChange = (index: number, optionsStr: string) => {
    const { result, error } = parseOptions(optionsStr);
    const errors = [...jsonErrors()];
    errors[index] = error || null;
    setJsonErrors(errors);

    if (!error) {
      const currentItem = editedItem();
      const newCallbacks = [...currentItem.callbacks];
      newCallbacks[index] = { ...newCallbacks[index], options: result };
      setEditedItem({ ...currentItem, callbacks: newCallbacks });
    }
  };

  const handleSave = () => {
    if (jsonErrors().some((e) => e !== null)) {
      return;
    }
    props.onSave(editedItem());
  };

  return (
    <div class="p-4 border-2 border-primary rounded-lg">
      <h3 class="font-bold mb-2">Edit Playlist Item</h3>
      
      <div class="form-control mb-4">
        <label class="label">
          <span class="label-text">ID</span>
        </label>
        <input
          type="text"
          class="input input-bordered"
          value={editedItem().id}
          onInput={(e) =>
            setEditedItem({ ...editedItem(), id: e.currentTarget.value })
          }
        />
      </div>

      <div class="form-control mb-4">
        <label class="label">
          <span class="label-text">Layout</span>
        </label>
        <select
          class="select select-bordered"
          value={editedItem().layout}
          onChange={(e) =>
            handleLayoutChange(e.currentTarget.value as "full" | "split")
          }
        >
          <option value="full">Full (1 callback)</option>
          <option value="split">Split (2 callbacks)</option>
        </select>
      </div>

      <div class="space-y-4">
        <For each={editedItem().callbacks}>
          {(callback, callbackIndex) => (
            <div class="p-3 border border-base-300 rounded">
              <h4 class="font-semibold mb-2">
                Callback {callbackIndex() + 1}
              </h4>
              <div class="form-control mb-2">
                <label class="label">
                  <span class="label-text">Callback Name</span>
                </label>
                <select
                  class="select select-bordered"
                  value={callback.name}
                  onChange={(e) =>
                    handleCallbackNameChange(
                      callbackIndex(),
                      e.currentTarget.value
                    )
                  }
                >
                  <For each={props.availableCallbacks}>
                    {(availableCallback) => (
                      <option value={availableCallback.id}>
                        {availableCallback.name}
                      </option>
                    )}
                  </For>
                </select>
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Options (JSON)</span>
                </label>
                <textarea
                  class={`textarea textarea-bordered font-mono text-sm ${
                    jsonErrors()[callbackIndex()] ? "textarea-error" : ""
                  }`}
                  value={JSON.stringify(callback.options || {}, null, 2)}
                  onInput={(e) =>
                    handleCallbackOptionsChange(
                      callbackIndex(),
                      e.currentTarget.value
                    )
                  }
                  rows={3}
                />
                <Show when={jsonErrors()[callbackIndex()]}>
                  <label class="label">
                    <span class="label-text-alt text-error">
                      {jsonErrors()[callbackIndex()]}
                    </span>
                  </label>
                </Show>
              </div>
            </div>
          )}
        </For>
      </div>

      <div class="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          class="btn btn-primary"
          disabled={jsonErrors().some((e) => e !== null)}
        >
          Save
        </button>
        <button onClick={props.onCancel} class="btn btn-ghost">
          Cancel
        </button>
      </div>
    </div>
  );
}
