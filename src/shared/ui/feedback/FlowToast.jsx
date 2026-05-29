import { useEffect, useRef } from 'react';
import { useNotify } from '@/features/notifications/useNotify';
import './FlowToast.css';

export default function FlowToast({ message }) {
  const notify = useNotify();
  const lastMessageRef = useRef('');

  useEffect(() => {
    const nextMessage = String(message || '').trim();
    if (!nextMessage || lastMessageRef.current === nextMessage) return;

    lastMessageRef.current = nextMessage;
    notify.info(nextMessage, { dedupeKey: `flow-toast:${nextMessage}` });
  }, [message, notify]);

  return null;
}
