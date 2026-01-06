import { createSignal, Show } from "solid-js";

export default function Login() {
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal(false);
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(false);
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: password() }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("adminToken", data.token);
        // Use window.location to force a full page reload and re-authentication
        window.location.href = "/";
      } else {
        setError(true);
        setPassword("");
        setLoading(false);
      }
    } catch (err) {
      setError(true);
      setPassword("");
      setLoading(false);
    }
  };

  return (
    <div class="min-h-screen bg-base-200 flex items-center justify-center">
      <div class="card w-96 bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-center justify-center mb-4">
            Dashboard Server Admin
          </h2>
          <p class="text-center text-sm mb-6">Enter password to continue</p>
          <form onSubmit={handleSubmit}>
            <div class="form-control">
              <input
                type="password"
                placeholder="Password"
                class="input input-bordered"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                disabled={loading()}
                autofocus
              />
            </div>
            <Show when={error()}>
              <div class="alert alert-error mt-4">
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
                <span>Incorrect password. Please try again.</span>
              </div>
            </Show>
            <div class="card-actions justify-end mt-6">
              <button
                type="submit"
                class="btn btn-primary w-full"
                disabled={loading() || !password()}
              >
                <Show when={loading()} fallback="Login">
                  <span class="loading loading-spinner loading-sm"></span>
                  Logging in...
                </Show>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
