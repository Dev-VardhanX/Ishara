// src/context/ToastContext.tsx — Friendly Toast Notification & Offline Notice System
import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, CloudOff } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'offline';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  showOfflineNotice: boolean;
  setShowOfflineNotice: (show: boolean) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showOfflineNotice, setShowOfflineNotice] = useState<boolean>(false);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        removeToast,
        showOfflineNotice,
        setShowOfflineNotice,
      }}
    >
      {children}

      {/* Floating Offline Notice Banner if Supabase is unreachable */}
      {showOfflineNotice && (
        <div className="fixed bottom-5 left-5 z-50 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#FFE8E2] border border-[#FFB59E] text-[#2B2D42] text-xs font-bold shadow-clay-raised animate-fade-in select-none">
          <CloudOff className="w-4 h-4 text-[#FF8A8A] shrink-0" />
          <span>Offline, saved on this device</span>
          <button
            type="button"
            onClick={() => setShowOfflineNotice(false)}
            className="p-1 hover:bg-black/5 rounded-lg text-[#6E7387]"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Toasts Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none">
        {toasts.map((toast) => {
          const typeStyles = {
            success: 'bg-[#E5F8E2] border-[#A8E6A1] text-emerald-900',
            error: 'bg-[#FFE8E2] border-[#FFB59E] text-red-900',
            info: 'bg-white/95 border-slate-200 text-[#2B2D42]',
            offline: 'bg-[#FFE8E2] border-[#FF8A8A] text-[#2B2D42]',
          };

          const IconComponent =
            toast.type === 'success'
              ? CheckCircle2
              : toast.type === 'error'
              ? AlertCircle
              : toast.type === 'offline'
              ? CloudOff
              : Info;

          const iconColor =
            toast.type === 'success'
              ? 'text-emerald-500'
              : toast.type === 'error' || toast.type === 'offline'
              ? 'text-[#FF8A8A]'
              : 'text-[#7C9CFF]';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-2xl border shadow-clay-raised flex items-start gap-3 backdrop-blur-md transition-all animate-fade-in ${typeStyles[toast.type]}`}
            >
              <IconComponent className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 text-xs font-bold leading-relaxed">{toast.message}</div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
