import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Fixed ErrorBoundary class definition to ensure 'props' is correctly recognized 
// by TypeScript by explicitly extending React.Component and using a constructor.
export class ErrorBoundary extends React.Component<Props, State> {
  // Define initial state for the error boundary in the constructor to ensure 
  // correct inheritance and property recognition by the TypeScript compiler.
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render(): ReactNode {
    // Check for errors in state.
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="text-rose-500" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Something went wrong</h1>
            <p className="text-slate-500 mb-6 text-sm">
              An unexpected error has occurred. Our team has been notified.
              <br/>
              <span className="font-mono text-xs bg-slate-100 p-1 rounded mt-2 inline-block text-rose-600 max-w-full truncate">
                {this.state.error?.message}
              </span>
            </p>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
              <RefreshCw size={18} /> Reload Application
            </button>
          </div>
        </div>
      );
    }

    // Return the children props when no error is caught.
    return this.props.children;
  }
}
