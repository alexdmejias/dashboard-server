import { A } from "@solidjs/router";
import { createQuery } from "@tanstack/solid-query";
import { Show } from "solid-js";
import { fetchChangelog } from "../lib/api";

export default function Changelog() {
  const changelogQuery = createQuery(() => ({
    queryKey: ["changelog"],
    queryFn: fetchChangelog,
  }));

  return (
    <main class="min-h-screen bg-base-200">
      <div class="navbar bg-base-100 shadow-lg">
        <div class="flex-1">
          <A href="/" class="btn btn-ghost text-xl">
            Dashboard Server Admin
          </A>
        </div>
        <div class="flex-none gap-2">
          <A href="/" class="btn btn-outline btn-sm">
            Home
          </A>
        </div>
      </div>
      <div class="p-4">
        <div class="card bg-base-100 shadow-lg max-w-3xl mx-auto">
          <div class="card-body">
            <Show when={changelogQuery.isLoading}>
              <div class="flex justify-center items-center py-8">
                <span class="loading loading-spinner loading-lg" />
              </div>
            </Show>
            <Show when={changelogQuery.error}>
              <div class="alert alert-error">
                <span>Failed to load changelog</span>
              </div>
            </Show>
            <Show when={changelogQuery.data}>
              <div
                class="changelog-content"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered from CHANGELOG.md, not user input
                innerHTML={changelogQuery.data?.changelogHtml}
              />
            </Show>
          </div>
        </div>
      </div>
    </main>
  );
}
