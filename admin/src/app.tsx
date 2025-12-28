import { Router, Route } from "@solidjs/router";
import Home from "./routes/index";

export default function App() {
  return (
    <Router>
      <Route path="/" component={Home} />
    </Router>
  );
}

