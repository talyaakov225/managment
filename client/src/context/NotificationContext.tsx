import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  linkUrl: string | null;
  createdAt: string;
}

interface NotificationContextType {
  unreadCount: number;
  notifications: AppNotification[];
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastCheckRef = useRef<string>(new Date().toISOString());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const requestPermission = useCallback(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const fireDesktopNotification = useCallback((title: string, body: string, linkUrl?: string | null) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/assets/לוגו תקשורת חדש.svg',
        tag: 'rl-' + Date.now(),
      });
      notification.onclick = () => {
        window.focus();
        if (linkUrl) window.location.href = linkUrl;
        notification.close();
      };
      setTimeout(() => notification.close(), 8000);
    }
  }, []);

  const checkNew = useCallback(async () => {
    try {
      const { data } = await api.get<AppNotification[]>('/notifications/new', {
        params: { since: lastCheckRef.current },
      });
      if (data.length > 0) {
        setNotifications((prev) => [...data, ...prev].slice(0, 30));
        setUnreadCount((c) => c + data.length);
        lastCheckRef.current = data[0].createdAt;

        for (const n of data) {
          fireDesktopNotification(n.title, n.body, n.linkUrl);
        }
      }
    } catch { /* silent */ }
  }, [fireDesktopNotification]);

  const markAllRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!user) return;

    requestPermission();

    api.get<AppNotification[]>('/notifications').then(({ data }) => {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
      if (data.length > 0) lastCheckRef.current = data[0].createdAt;
    }).catch(() => {});

    pollRef.current = setInterval(checkNew, 10000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [user, requestPermission, checkNew]);

  return (
    <NotificationContext.Provider value={{ unreadCount, notifications, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}
