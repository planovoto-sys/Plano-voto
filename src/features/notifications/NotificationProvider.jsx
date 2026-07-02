import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NotificationStack from './NotificationStack';
import { NotificationContext } from './useNotify';
import './notifications.css';

const DEFAULT_DURATION_MS = {
  success: 3400,
  info: 3600,
  warning: 4600,
  error: 5600,
  undo: 5200,
  loading: 0
};

const normalizeOptions = (type, options = {}) => ({
  duration: options.duration ?? DEFAULT_DURATION_MS[type] ?? DEFAULT_DURATION_MS.info,
  dedupeKey: options.dedupeKey,
  action: options.action,
  persistent: options.persistent ?? type === 'loading'
});

export default function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const nextIdRef = useRef(1);
  const timersRef = useRef(new Map());
  const dedupeRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    window.clearTimeout(timersRef.current.get(id));
    timersRef.current.delete(id);
    setNotifications((currentNotifications) => (
      currentNotifications.filter((notification) => notification.id !== id)
    ));
  }, []);

  const push = useCallback((type, message, options = {}) => {
    const text = String(message || '').trim();
    if (!text) return null;

    const normalizedOptions = normalizeOptions(type, options);
    const dedupeKey = normalizedOptions.dedupeKey || `${type}:${text}`;
    const now = Date.now();
    const lastShownAt = dedupeRef.current.get(dedupeKey) || 0;

    if (now - lastShownAt < 2800) return null;
    dedupeRef.current.set(dedupeKey, now);

    const id = `${now}-${nextIdRef.current++}`;
    const notification = {
      id,
      type,
      message: text,
      action: normalizedOptions.action || null
    };

    setNotifications((currentNotifications) => [
      notification,
      ...currentNotifications.filter((item) => item.message !== text || item.type !== type)
    ].slice(0, 3));

    if (!normalizedOptions.persistent && normalizedOptions.duration > 0) {
      timersRef.current.set(id, window.setTimeout(() => dismiss(id), normalizedOptions.duration));
    }

    return id;
  }, [dismiss]);

  const notify = useMemo(() => ({
    success: (message, options) => push('success', message, options),
    error: (message, options) => push('error', message, options),
    warning: (message, options) => push('warning', message, options),
    info: (message, options) => push('info', message, options),
    loading: (message, options) => push('loading', message, options),
    undo: (message, options) => push('undo', message, options)
  }), [push]);

  const contextValue = useMemo(() => ({
    notify,
    dismiss
  }), [dismiss, notify]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleOffline = () => {
      notify.warning('Você está offline. Algumas informações podem estar desatualizadas.', {
        dedupeKey: 'network-offline',
        duration: 5200
      });
    };
    const handleOnline = () => {
      notify.success('Conexão restabelecida.', {
        dedupeKey: 'network-online',
        duration: 2800
      });
    };
    const handlePwaUpdate = () => {
      notify.info('Nova versão disponível. Reabra o app para atualizar.', {
        dedupeKey: 'pwa-update',
        duration: 7000
      });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    window.addEventListener('bomdevoto:pwa-update-available', handlePwaUpdate);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('nossovoto:pwa-update-available', handlePwaUpdate);
    };
  }, [notify]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationStack notifications={notifications} onDismiss={dismiss} />
    </NotificationContext.Provider>
  );
}
