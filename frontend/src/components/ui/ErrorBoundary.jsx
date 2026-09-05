import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-sunken flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-surface border border-danger-600/40 rounded-[var(--radius-md)] p-8 shadow-modal">
            <h2 className="text-xl font-bold font-display text-danger-600 mb-2">
              Application Render Warning
            </h2>
            <p className="text-xs text-ink-600 mb-4">
              {this.state.error?.message || 'A transient UI rendering issue occurred.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
                className="px-4 py-2 bg-primary-600 text-surface-sunken rounded-sm text-xs font-bold hover:bg-primary-700 transition-colors"
              >
                Reload Application
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login';
                }}
                className="px-4 py-2 bg-surface-muted text-ink-900 border border-border rounded-sm text-xs font-bold hover:bg-surface transition-colors"
              >
                Reset Session & Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
