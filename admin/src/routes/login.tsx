import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";

export default function Login() {
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const navigate = useNavigate();

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
        navigate("/");
      } else {
        setError(true);
        setPassword("");
      }
    } catch (err) {
      setError(true);
    } finally {
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
                <span>Incorrect password</span>
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
