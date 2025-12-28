import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { Router, Route } from "@solidjs/router";
import Home from "./routes/index";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Route path="/" component={Home} />
      </Router>
    </QueryClientProvider>
  );
}

