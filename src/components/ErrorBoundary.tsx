import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React Error Boundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050A14] flex flex-col items-center justify-center p-6 text-center text-white font-sans">
          <div className="max-w-md w-full bg-[#0A1428] border border-cyan-500/30 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-2xl font-bold">
              🍿
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white">Something went wrong</h1>
              <p className="text-sm text-slate-400">
                An unexpected error occurred while loading the application.
              </p>
            </div>
            {this.state.error && (
              <div className="bg-black/50 p-3 rounded-xl border border-white/10 text-xs font-mono text-rose-300 text-left overflow-auto max-h-32">
                {this.state.error.message || 'Unknown error'}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full py-3 px-6 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all text-sm cursor-pointer"
            >
              Reload MondoFlix
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
