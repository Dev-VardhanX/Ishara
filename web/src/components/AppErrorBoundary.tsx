import React, { Component, ErrorInfo } from 'react';
import { IsharaLogo } from './IsharaLogo';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AppErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#E9EEF7] flex items-center justify-center p-6 text-[#2B2D42]">
          <div className="clay-card p-8 max-w-md w-full text-center flex flex-col items-center bg-[#E9EEF7] border border-white/80 rounded-[28px] shadow-clay-card">
            <IsharaLogo size="md" animate={false} showWordmark={true} />
            <div className="w-14 h-14 rounded-2xl bg-[#FFB59E]/30 text-[#FF8A8A] flex items-center justify-center my-4 text-2xl font-black">
              !
            </div>
            <h2 className="text-xl font-black text-[#2B2D42] mb-2">Something went sideways</h2>
            <p className="text-xs text-[#6E7387] mb-6 leading-relaxed">
              An unexpected render issue occurred while loading this view ({this.state.error?.message || 'Unknown error'}).
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#7C9CFF] text-white font-black text-sm shadow-clay-button hover:opacity-95 transition-all"
              >
                Reload Page
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.href = '/dashboard';
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-white text-[#2B2D42] font-black text-sm border border-black/5 hover:bg-slate-50 transition-all shadow-sm"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
