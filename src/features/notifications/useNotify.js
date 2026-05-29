import { createContext, useContext } from 'react';

const noop = () => null;

export const NotificationContext = createContext({
  notify: {
    success: noop,
    error: noop,
    warning: noop,
    info: noop,
    loading: noop,
    undo: noop
  },
  dismiss: noop
});

export const useNotify = () => useContext(NotificationContext).notify;

export const useNotificationCenter = () => useContext(NotificationContext);
