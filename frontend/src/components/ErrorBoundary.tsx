import { Component, type ErrorInfo, type ReactNode } from "react";
import { api } from "@/api/client";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export function reportClientError(message: string, stack?: string, componentStack?: string) {
  // Fire-and-forget — this must never itself throw or the error report becomes another
  // unhandled error. Reported server-side (see backend/app/api/routes/client_errors.py)
  // rather than left in the browser console, so a crash is visible without needing the
  // affected user to open devtools and paste it to you.
  api
    .post("/client-errors", {
      message: message.slice(0, 2000),
      stack: (stack || "").slice(0, 8000),
      component_stack: (componentStack || "").slice(0, 8000),
      url: window.location.href.slice(0, 500),
    })
    .catch(() => {});
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    reportClientError(message, stack, info.componentStack ?? undefined);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-canvas text-ink/90 flex items-center justify-center p-6">
          <div className="card max-w-sm text-center space-y-3">
            <p className="text-lg font-semibold">Something went wrong</p>
            <p className="text-sm text-ink/50">
              This page hit an unexpected error. Try reloading — your data hasn't been affected.
            </p>
            <button className="btn-primary w-full" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
