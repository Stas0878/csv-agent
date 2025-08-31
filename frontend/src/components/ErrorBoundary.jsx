import React from "react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // We could log to a remote service here
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error("ErrorBoundary caught:", error, info);
    }
  }
  handleReload = () => {
    window.location.reload();
  };
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-xl space-y-4">
            <Alert variant="destructive">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>
                The UI hit an unexpected error. You can reload the page or try to continue.
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button onClick={this.handleReload}>Reload</Button>
              <Button variant="outline" onClick={this.handleReset}>Try to continue</Button>
            </div>
            <details className="text-xs text-muted-foreground whitespace-pre-wrap">
              <summary>Details</summary>
              {String(this.state.error)}
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}