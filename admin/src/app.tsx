import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { Router, Route, useNavigate } from "@solidjs/router";
import { createSignal, onMount, Show, createEffect } from "solid-js";
import Home from "./routes/index";
import ClientDetail from "./routes/[clientName]";
import Login from "./routes/login";
import Logs from "./routes/logs";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Check if password protection is enabled
async function checkAuthRequired() {
  try {
    const response = await fetch("/api/admin/auth-required");
    const data = await response.json();
    return data.required;
  } catch {
    return false;
  }
}

function ProtectedRoute(props: { children: any }) {
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [authRequired, setAuthRequired] = createSignal(false);
  const [checking, setChecking] = createSignal(true);
  const navigate = useNavigate();

  const checkAuth = async () => {
    setChecking(true);
    const required = await checkAuthRequired();
    setAuthRequired(required);

    if (required) {
      const token = localStorage.getItem("adminToken");
      if (token) {
        try {
          const response = await fetch("/api/admin/verify", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
            localStorage.removeItem("adminToken");
            navigate("/login");
          }
        } catch {
          setIsAuthenticated(false);
          localStorage.removeItem("adminToken");
          navigate("/login");
        }
      } else {
        setIsAuthenticated(false);
        navigate("/login");
      }
    } else {
      setIsAuthenticated(true);
    }
    setChecking(false);
  };

  onMount(() => {
    checkAuth();
  });

  return (
    <Show
      when={!checking()}
      fallback={
        <div class="min-h-screen bg-base-200 flex items-center justify-center">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      }
    >
      <Show when={!authRequired() || isAuthenticated()}>
        {props.children}
      </Show>
    </Show>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Route path="/login" component={Login} />
        <Route
          path="/"
          component={() => (
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/logs"
          component={() => (
            <ProtectedRoute>
              <Logs />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/:clientName"
          component={() => (
            <ProtectedRoute>
              <ClientDetail />
            </ProtectedRoute>
          )}
        />
      </Router>
    </QueryClientProvider>
  );
}

