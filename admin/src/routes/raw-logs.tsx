import { A } from "@solidjs/router";
import { RawLogViewer } from "../components/RawLogViewer";

export default function RawLogs() {
  return (
    <main class="min-h-screen bg-base-200">
      <div class="navbar bg-base-100 shadow-lg">
        <div class="flex-1">
          <A href="/" class="btn btn-ghost text-xl">
            Dashboard Server Admin
          </A>
          <span class="mx-2 text-gray-400">/</span>
          <span class="text-xl font-semibold">Raw Logs</span>
        </div>
      </div>
      <div class="p-4">
        <RawLogViewer />
      </div>
    </main>
  );
}
