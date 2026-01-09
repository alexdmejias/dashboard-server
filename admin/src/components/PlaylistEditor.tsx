import { createSignal, For, Show, createMemo } from "solid-js";
import { createMutation, createQuery, useQueryClient } from "@tanstack/solid-query";
import { fetchAvailableCallbacks, updateClientPlaylist } from "../lib/api";

interface PlaylistItem {
  id: string;
  callbackName: string;
  options?: Record<string, unknown>;
}

interface AvailableCallback {
  id: string;
  name: string;
  expectedConfig?: any;
}

export function PlaylistEditor(props: { clientName: string; initialPlaylist: PlaylistItem[] }) {
  const [playlist, setPlaylist] = createSignal<PlaylistItem[]>([...props.initialPlaylist]);
  const [editingIndex, setEditingIndex] = createSignal<number | null>(null);
  const [isAddingNew, setIsAddingNew] = createSignal(false);
  const [newItem, setNewItem] = createSignal<PlaylistItem>({ id: "", callbackName: "", options: {} });
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
    if (!item.id || !item.callbackName) {
      setError("ID and Callback Name are required");
      return;
    }
    
    // Check for duplicate ID
    if (playlist().some(p => p.id === item.id)) {
      setError("ID must be unique");
      return;
    }

    setPlaylist([...playlist(), { ...item }]);
    setNewItem({ id: "", callbackName: "", options: {} });
    setIsAddingNew(false);
    setError(null);
  };

  const handleRemove = (index: number) => {
    setPlaylist(playlist().filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newPlaylist = [...playlist()];
    [newPlaylist[index - 1], newPlaylist[index]] = [newPlaylist[index], newPlaylist[index - 1]];
    setPlaylist(newPlaylist);
  };

  const handleMoveDown = (index: number) => {
    if (index === playlist().length - 1) return;
    const newPlaylist = [...playlist()];
    [newPlaylist[index], newPlaylist[index + 1]] = [newPlaylist[index + 1], newPlaylist[index]];
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

  const parseOptions = (optionsStr: string): Record<string, unknown> => {
    try {
      return JSON.parse(optionsStr);
    } catch {
      return {};
    }
  };

  return (
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Playlist Editor</h2>
        
        <Show when={error()}>
          <div class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error()}</span>
          </div>
        </Show>

        <Show when={success()}>
          <div class="alert alert-success">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                      <div class="text-sm text-gray-500">{item.callbackName}</div>
                      <Show when={item.options && Object.keys(item.options).length > 0}>
                        <div class="text-xs font-mono mt-1">{JSON.stringify(item.options)}</div>
                      </Show>
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
            + Add Callback
          </button>
        </Show>

        <Show when={isAddingNew()}>
          <div class="p-4 border-2 border-dashed border-primary rounded-lg">
            <h3 class="font-bold mb-2">Add New Callback</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text">ID</span>
                </label>
                <input
                  type="text"
                  placeholder="unique-id"
                  class="input input-bordered"
                  value={newItem().id}
                  onInput={(e) => setNewItem({ ...newItem(), id: e.currentTarget.value })}
                />
              </div>
              <div class="form-control">
                <label class="label">
                  <span class="label-text">Callback</span>
                </label>
                <select
                  class="select select-bordered"
                  value={newItem().callbackName}
                  onChange={(e) => setNewItem({ ...newItem(), callbackName: e.currentTarget.value })}
                >
                  <option value="">Select callback...</option>
                  <For each={callbacksQuery.data?.callbacks || []}>
                    {(callback: AvailableCallback) => (
                      <option value={callback.id}>{callback.name}</option>
                    )}
                  </For>
                </select>
              </div>
            </div>
            <div class="form-control mt-2">
              <label class="label">
                <span class="label-text">Options (JSON)</span>
              </label>
              <textarea
                class="textarea textarea-bordered font-mono text-sm"
                placeholder='{"key": "value"}'
                value={JSON.stringify(newItem().options || {}, null, 2)}
                onInput={(e) => setNewItem({ ...newItem(), options: parseOptions(e.currentTarget.value) })}
                rows={3}
              />
            </div>
            <div class="flex gap-2 mt-4">
              <button onClick={handleAddCallback} class="btn btn-primary">
                Add
              </button>
              <button onClick={() => setIsAddingNew(false)} class="btn btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        </Show>

        {/* Save Button */}
        <div class="divider"></div>
        <button
          onClick={handleSave}
          class="btn btn-success"
          disabled={updateMutation.isPending}
        >
          <Show when={updateMutation.isPending}>
            <span class="loading loading-spinner"></span>
          </Show>
          Save Playlist
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
  const [editedItem, setEditedItem] = createSignal<PlaylistItem>({ ...props.item });

  const parseOptions = (optionsStr: string): Record<string, unknown> => {
    try {
      return JSON.parse(optionsStr);
    } catch {
      return {};
    }
  };

  return (
    <div class="p-4 border-2 border-primary rounded-lg">
      <h3 class="font-bold mb-2">Edit Callback</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="form-control">
          <label class="label">
            <span class="label-text">ID</span>
          </label>
          <input
            type="text"
            class="input input-bordered"
            value={editedItem().id}
            onInput={(e) => setEditedItem({ ...editedItem(), id: e.currentTarget.value })}
          />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Callback</span>
          </label>
          <select
            class="select select-bordered"
            value={editedItem().callbackName}
            onChange={(e) => setEditedItem({ ...editedItem(), callbackName: e.currentTarget.value })}
          >
            <For each={props.availableCallbacks}>
              {(callback) => (
                <option value={callback.id}>{callback.name}</option>
              )}
            </For>
          </select>
        </div>
      </div>
      <div class="form-control mt-2">
        <label class="label">
          <span class="label-text">Options (JSON)</span>
        </label>
        <textarea
          class="textarea textarea-bordered font-mono text-sm"
          value={JSON.stringify(editedItem().options || {}, null, 2)}
          onInput={(e) => setEditedItem({ ...editedItem(), options: parseOptions(e.currentTarget.value) })}
          rows={3}
        />
      </div>
      <div class="flex gap-2 mt-4">
        <button onClick={() => props.onSave(editedItem())} class="btn btn-primary">
          Save
        </button>
        <button onClick={props.onCancel} class="btn btn-ghost">
          Cancel
        </button>
      </div>
    </div>
  );
}
