import {
  createMutation,
  createQuery,
  useQueryClient,
} from "@tanstack/solid-query";
import { createMemo, createSignal, For, Show } from "solid-js";
import { fetchAvailableCallbacks, updateClientPlaylist } from "../lib/api";
import type { PlaylistItem, SupportedLayout } from "../types";
import { MonacoEditor } from "./MonacoEditor";
import playlistSchema from "../../../init-payload.schema.json";

interface AvailableCallback {
  id: string;
  name: string;
  expectedConfig?: any;
  defaultOptions?: object;
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
    callbacks: { content: { name: "", options: {} } },
  });
  const [error, setError] = createSignal<string | null>(null);
  const [success, setSuccess] = createSignal(false);
  const [rawMode, setRawMode] = createSignal(false);
  const [rawJson, setRawJson] = createSignal("");
  const [rawError, setRawError] = createSignal<string | null>(null);

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

  const handleEnterRawMode = () => {
    setRawJson(JSON.stringify(playlist(), null, 2));
    setRawError(null);
    setRawMode(true);
  };

  const handleApplyRaw = () => {
    try {
      const parsed = JSON.parse(rawJson());
      setPlaylist(parsed);
      setRawMode(false);
      setRawError(null);
    } catch (e) {
      setRawError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const handleDiscardRaw = () => {
    setRawMode(false);
    setRawError(null);
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
    if (item.layout === "full" && !("content" in item.callbacks)) {
      setError("Full layout requires a 'content' callback slot");
      return;
    }
    if (
      item.layout === "2-col" &&
      (!("content_left" in item.callbacks) ||
        !("content_right" in item.callbacks))
    ) {
      setError(
        "2-col layout requires 'content_left' and 'content_right' callback slots",
      );
      return;
    }
    // Validate all callbacks have names
    for (const callback of Object.values(item.callbacks)) {
      if (!callback.name) {
        setError("All callbacks must have a name");
        return;
      }
    }
    setPlaylist([...playlist(), item]);
    setNewItem({
      id: "",
      layout: "full",
      callbacks: { content: { name: "", options: {} } },
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
        <div class="flex items-center justify-between">
          <h2 class="card-title">Playlist Editor</h2>
          <button
            onClick={() => (rawMode() ? handleDiscardRaw() : handleEnterRawMode())}
            class={`btn btn-sm ${rawMode() ? "btn-ghost" : "btn-outline"}`}
          >
            {rawMode() ? "← Structured View" : "{ } Raw JSON"}
          </button>
        </div>

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

        {/* Raw JSON editor mode */}
        <Show when={rawMode()}>
          <div class="space-y-3">
            <p class="text-sm text-base-content/60">
              Edit the full playlist config as JSON. Monaco provides schema-based validation and autocomplete.
            </p>
            <MonacoEditor
              value={rawJson()}
              onChange={setRawJson}
              schema={playlistSchema}
              height="500px"
            />
            <Show when={rawError()}>
              <div class="alert alert-error">
                <span class="font-mono text-sm">{rawError()}</span>
              </div>
            </Show>
            <div class="flex gap-2">
              <button onClick={handleApplyRaw} class="btn btn-primary">
                Apply Changes
              </button>
              <button onClick={handleDiscardRaw} class="btn btn-ghost">
                Discard
              </button>
            </div>
          </div>
        </Show>

        {/* Structured editor mode */}
        <Show when={!rawMode()}>
          {/* Playlist Items */}
          <div class="space-y-4">
            <For each={playlist()}>
              {(item, index) => (
                <Show
                  when={editingIndex() === index()}
                  fallback={
                    <div class="flex items-center gap-2 p-4 border border-base-300 rounded-lg">
                      <div class="flex-1">
                        <div class="flex items-center gap-2">
                          <span class="font-bold">{item.id}</span>
                          <a
                            href={`/display/${props.clientName}/html/${item.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="btn btn-xs btn-ghost"
                            title="Preview in new tab"
                          >
                            ↗
                          </a>
                        </div>
                        <div class="text-sm text-gray-500">
                          Layout: {item.layout}
                        </div>
                        <div class="text-xs font-mono mt-1">
                          Callbacks: {Object.values(item.callbacks).map((cb) => cb.name).join(", ")}
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
        </Show>
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
  const [jsonErrors, setJsonErrors] = createSignal<
    Record<string, string | null>
  >({});
  const [optionsRaw, setOptionsRaw] = createSignal<Record<string, string>>(
    Object.fromEntries(
      Object.entries(props.newItem().callbacks).map(([k, cb]) => [
        k,
        JSON.stringify(cb.options || {}, null, 2),
      ]),
    ),
  );

  const item = props.newItem;

  const slotNames = createMemo(() => Object.keys(item().callbacks));

  const handleLayoutChange = (layout: SupportedLayout) => {
    const currentItem = item();
    if (layout === "full") {
      const firstCallback = Object.values(currentItem.callbacks)[0] || {
        name: "",
        options: {},
      };
      props.setNewItem({
        ...currentItem,
        layout: "full",
        callbacks: { content: firstCallback },
      });
      setOptionsRaw({
        content: JSON.stringify(firstCallback.options || {}, null, 2),
      });
    } else {
      const callbackValues = Object.values(currentItem.callbacks);
      const leftCallback = callbackValues[0] || { name: "", options: {} };
      const rightCallback = callbackValues[1] || { name: "", options: {} };
      props.setNewItem({
        ...currentItem,
        layout: "2-col",
        callbacks: {
          content_left: leftCallback,
          content_right: rightCallback,
        },
      });
      setOptionsRaw({
        content_left: JSON.stringify(leftCallback.options || {}, null, 2),
        content_right: JSON.stringify(rightCallback.options || {}, null, 2),
      });
    }
  };

  const handleCallbackNameChange = (slotName: string, name: string) => {
    const currentItem = item();
    const selected = props.availableCallbacks.find((cb) => cb.id === name);
    const defaults = selected?.defaultOptions ?? {};
    const defaultsStr = JSON.stringify(defaults, null, 2);

    setOptionsRaw({ ...optionsRaw(), [slotName]: defaultsStr });
    setJsonErrors({ ...jsonErrors(), [slotName]: null });

    props.setNewItem({
      ...currentItem,
      callbacks: {
        ...currentItem.callbacks,
        [slotName]: { name, options: defaults },
      },
    });
  };

  const handleCallbackOptionsChange = (
    slotName: string,
    optionsStr: string,
  ) => {
    setOptionsRaw({ ...optionsRaw(), [slotName]: optionsStr });
    const { result, error } = parseOptions(optionsStr);
    setJsonErrors({ ...jsonErrors(), [slotName]: error || null });

    if (!error) {
      const currentItem = item();
      props.setNewItem({
        ...currentItem,
        callbacks: {
          ...currentItem.callbacks,
          [slotName]: { ...currentItem.callbacks[slotName], options: result },
        },
      });
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
            handleLayoutChange(e.currentTarget.value as SupportedLayout)
          }
        >
          <option value="full">Full (1 callback)</option>
          <option value="2-col">2-Col (2 callbacks)</option>
        </select>
      </div>

      <div class="space-y-4">
        <For each={slotNames()}>
          {(slotName) => {
            const callback = () =>
              (item().callbacks as Record<string, { name: string; options?: object }>)[slotName];
            return (
              <div class="p-3 border border-base-300 rounded">
                <h4 class="font-semibold mb-2">
                  {slotName === "content"
                    ? "Content"
                    : slotName === "content_left"
                      ? "Left Column"
                      : "Right Column"}
                </h4>
                <div class="form-control mb-2">
                  <label class="label">
                    <span class="label-text">Callback Name</span>
                  </label>
                  <select
                    class="select select-bordered"
                    value={callback().name}
                    onChange={(e) =>
                      handleCallbackNameChange(slotName, e.currentTarget.value)
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
                  <MonacoEditor
                    value={
                      optionsRaw()[slotName] ??
                      JSON.stringify(callback().options || {}, null, 2)
                    }
                    onChange={(v) => handleCallbackOptionsChange(slotName, v)}
                    height="120px"
                  />
                  <Show when={jsonErrors()[slotName]}>
                    <label class="label">
                      <span class="label-text-alt text-error">
                        {jsonErrors()[slotName]}
                      </span>
                    </label>
                  </Show>
                </div>
              </div>
            );
          }}
        </For>
      </div>

      <div class="flex gap-2 mt-4">
        <button
          onClick={() => props.onAdd(item())}
          class="btn btn-primary"
          disabled={Object.values(jsonErrors()).some((e) => e !== null)}
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
  const [jsonErrors, setJsonErrors] = createSignal<
    Record<string, string | null>
  >(Object.fromEntries(Object.keys(props.item.callbacks).map((key) => [key, null])));
  const [optionsRaw, setOptionsRaw] = createSignal<Record<string, string>>(
    Object.fromEntries(
      Object.entries(props.item.callbacks).map(([k, cb]) => [
        k,
        JSON.stringify(cb.options || {}, null, 2),
      ]),
    ),
  );

  const slotNames = createMemo(() => Object.keys(editedItem().callbacks));

  const handleLayoutChange = (layout: SupportedLayout) => {
    const currentItem = editedItem();
    if (layout === "full") {
      const firstCallback = Object.values(currentItem.callbacks)[0] || {
        name: "",
        options: {},
      };
      setEditedItem({
        ...currentItem,
        layout: "full",
        callbacks: { content: firstCallback },
      });
      setOptionsRaw({
        content: JSON.stringify(firstCallback.options || {}, null, 2),
      });
    } else {
      const callbackValues = Object.values(currentItem.callbacks);
      const leftCallback = callbackValues[0] || { name: "", options: {} };
      const rightCallback = callbackValues[1] || { name: "", options: {} };
      setEditedItem({
        ...currentItem,
        layout: "2-col",
        callbacks: {
          content_left: leftCallback,
          content_right: rightCallback,
        },
      });
      setOptionsRaw({
        content_left: JSON.stringify(leftCallback.options || {}, null, 2),
        content_right: JSON.stringify(rightCallback.options || {}, null, 2),
      });
    }
  };

  const handleCallbackNameChange = (slotName: string, name: string) => {
    const currentItem = editedItem();
    const selected = props.availableCallbacks.find((cb) => cb.id === name);
    const defaults = selected?.defaultOptions ?? {};
    const defaultsStr = JSON.stringify(defaults, null, 2);

    setOptionsRaw({ ...optionsRaw(), [slotName]: defaultsStr });
    setJsonErrors({ ...jsonErrors(), [slotName]: null });

    setEditedItem({
      ...currentItem,
      callbacks: {
        ...currentItem.callbacks,
        [slotName]: { name, options: defaults },
      },
    });
  };

  const handleCallbackOptionsChange = (
    slotName: string,
    optionsStr: string,
  ) => {
    setOptionsRaw({ ...optionsRaw(), [slotName]: optionsStr });
    const { result, error } = parseOptions(optionsStr);
    setJsonErrors({ ...jsonErrors(), [slotName]: error || null });

    if (!error) {
      const currentItem = editedItem();
      setEditedItem({
        ...currentItem,
        callbacks: {
          ...currentItem.callbacks,
          [slotName]: { ...currentItem.callbacks[slotName], options: result },
        },
      });
    }
  };

  const handleSave = () => {
    if (Object.values(jsonErrors()).some((e) => e !== null)) {
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
            handleLayoutChange(e.currentTarget.value as SupportedLayout)
          }
        >
          <option value="full">Full (1 callback)</option>
          <option value="2-col">2-Col (2 callbacks)</option>
        </select>
      </div>

      <div class="space-y-4">
        <For each={slotNames()}>
          {(slotName) => {
            const callback = () =>
              (editedItem().callbacks as Record<string, { name: string; options?: object }>)[slotName];
            return (
              <div class="p-3 border border-base-300 rounded">
                <h4 class="font-semibold mb-2">
                  {slotName === "content"
                    ? "Content"
                    : slotName === "content_left"
                      ? "Left Column"
                      : "Right Column"}
                </h4>
                <div class="form-control mb-2">
                  <label class="label">
                    <span class="label-text">Callback Name</span>
                  </label>
                  <select
                    class="select select-bordered"
                    value={callback().name}
                    onChange={(e) =>
                      handleCallbackNameChange(slotName, e.currentTarget.value)
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
                  <MonacoEditor
                    value={
                      optionsRaw()[slotName] ??
                      JSON.stringify(callback().options || {}, null, 2)
                    }
                    onChange={(v) => handleCallbackOptionsChange(slotName, v)}
                    height="120px"
                  />
                  <Show when={jsonErrors()[slotName]}>
                    <label class="label">
                      <span class="label-text-alt text-error">
                        {jsonErrors()[slotName]}
                      </span>
                    </label>
                  </Show>
                </div>
              </div>
            );
          }}
        </For>
      </div>

      <div class="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          class="btn btn-primary"
          disabled={Object.values(jsonErrors()).some((e) => e !== null)}
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
