import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from 'react';
import { CheckCircleIcon, ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/20/solid';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  toast: (message: string, type?: ToastItem['type']) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <ToastNotification key={t.id} item={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastNotification({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const icons = {
    success: <CheckCircleIcon className="w-4 h-4 text-green-500" />,
    error: <ExclamationCircleIcon className="w-4 h-4 text-red-500" />,
    info: <CheckCircleIcon className="w-4 h-4 text-[var(--color-accent)]" />,
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg text-sm text-[var(--color-text-primary)]">
      {icons[item.type]}
      <span className="flex-1">{item.message}</span>
      <button onClick={onDismiss} className="p-0.5 hover:bg-[var(--color-surface-secondary)] rounded">
        <XMarkIcon className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
      </button>
    </div>
  );
}
