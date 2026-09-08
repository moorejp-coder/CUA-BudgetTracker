import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./hooks/useAuth";
import ErrorBoundary, { reportClientError } from "./components/ErrorBoundary";
import "./styles/index.css";

// Catches what the React error boundary can't — errors thrown in event handlers, timers,
// or async code, and unhandled promise rejections. These don't crash the component tree
// (so there's no fallback UI to show), but they should still reach server-side logs
// instead of only ever existing in whichever user's browser console happened to be open.
window.addEventListener("error", (event) => {
  reportClientError(event.message, event.error?.stack);
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  reportClientError(`Unhandled promise rejection: ${message}`, stack);
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
