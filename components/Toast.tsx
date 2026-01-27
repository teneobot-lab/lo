
import React, { useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-4 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; removeToast: (id: string) => void }> = ({ toast, removeToast }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  const config = {
    success: {
      bg: 'bg-emerald-950/90',
      border: 'border-emerald-500/30',
      text: 'text-emerald-50',
      icon: <CheckCircle2 size={20} className="text-emerald-400" />,
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]'
    },
    error: {
      bg: 'bg-rose-950/90',
      border: 'border-rose-500/30',
      text: 'text-rose-50',
      icon: <AlertCircle size={20} className="text-rose-400" />,
      glow: 'shadow-[0_0_15px_rgba(244,63,94,0.3)]'
    },
    warning: {
      bg: 'bg-amber-950/90',
      border: 'border-amber-500/30',
      text: 'text-amber-50',
      icon: <AlertTriangle size={20} className="text-amber-400" />,
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]'
    },
    info: {
      bg: 'bg-slate-900/90',
      border: 'border-blue-500/30',
      text: 'text-slate-50',
      icon: <Info size={20} className="text-blue-400" />,
      glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]'
    },
  };

  const style = config[toast.type];

  return (
    <div className={`pointer-events-auto flex items-start gap-4 p-4 rounded-xl border backdrop-blur-md transition-all animate-in slide-in-from-right-full duration-500 ease-out ${style.bg} ${style.border} ${style.glow}`}>
      <div className="mt-0.5 shrink-0">{style.icon}</div>
      <div className="flex-1">
          <h4 className="text-sm font-bold capitalize text-white mb-0.5">{toast.type}</h4>
          <p className={`text-xs font-medium leading-relaxed ${style.text} opacity-90`}>{toast.message}</p>
      </div>
      <button 
        onClick={() => removeToast(toast.id)} 
        className="text-white/40 hover:text-white transition-colors shrink-0 p-1 hover:bg-white/10 rounded-lg"
      >
        <X size={14} />
      </button>
    </div>
  );
};
