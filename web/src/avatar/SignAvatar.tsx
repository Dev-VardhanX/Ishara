import React, { Suspense, lazy, forwardRef, Component, ErrorInfo } from 'react';
import type { SignAvatarProps, SignAvatarHandle } from './SignAvatarCanvas';

const SignAvatarCanvas = lazy(() => import('./SignAvatarCanvas'));

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onCatch?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AvatarErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('SignAvatar error boundary caught error:', error, errorInfo);
    this.props.onCatch?.(error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="w-full h-full min-h-[320px] flex flex-col items-center justify-center p-6 text-center bg-white/50 backdrop-blur rounded-[28px] border border-white/70 shadow-clay-card">
          <div className="w-16 h-16 rounded-full bg-[#7C9CFF]/15 text-[#7C9CFF] flex items-center justify-center mb-3 text-2xl font-black">
            ✦
          </div>
          <p className="text-sm font-black text-[#2B2D42] mb-1">3D Avatar Preview</p>
          <p className="text-xs text-[#6E7387] max-w-xs mb-4">
            Interactive 3D sign avatar initialized. If graphics are delayed, try refreshing or checking browser WebGL.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 rounded-xl bg-[#7C9CFF] text-white font-bold text-xs shadow-clay-button hover:opacity-95 transition-opacity"
          >
            Retry Loading 3D Canvas
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const SignAvatar = forwardRef<SignAvatarHandle, SignAvatarProps>((props, ref) => {
  return (
    <AvatarErrorBoundary onCatch={() => props.onWebGLFallback?.()}>
      <Suspense
        fallback={
          <div className="w-full h-full min-h-[380px] flex flex-col items-center justify-center bg-white/40 rounded-2xl animate-pulse">
            <div className="w-24 h-24 rounded-full bg-[#7C9CFF]/20 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-4 border-[#7C9CFF] border-t-transparent animate-spin" />
            </div>
            <span className="mt-3 text-xs font-black text-[#6E7387]">Loading 3D Sign Avatar...</span>
          </div>
        }
      >
        <SignAvatarCanvas ref={ref} {...props} />
      </Suspense>
    </AvatarErrorBoundary>
  );
});

SignAvatar.displayName = 'SignAvatar';
export default SignAvatar;
