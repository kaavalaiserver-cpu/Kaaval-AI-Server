import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import type { NotificationItem } from '../types';
import { Bell, CheckCheck, AlertTriangle, Camera, Info } from 'lucide-react';
import './NotificationPanel.css';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  violation: <AlertTriangle size={16} />,
  camera: <Camera size={16} />,
  system: <Info size={16} />,
};

const NotificationPanel = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        axios.get<NotificationItem[]>(`${API_BASE}/notifications?limit=20`),
        axios.get<{ unread: number }>(`${API_BASE}/notifications/unread`),
      ]);
      setNotifications(Array.isArray(notifRes.data) ? notifRes.data : []);
      setUnread(countRes.data.unread ?? 0);
    } catch {
      // API may not be available
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close panel on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const markRead = async (id: string) => {
    try {
      await axios.post(`${API_BASE}/notifications/${encodeURIComponent(id)}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnread((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await axios.post(`${API_BASE}/notifications/read-all`);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch { /* ignore */ }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="notif-wrapper" ref={panelRef}>
      <button
        className="icon-btn notification-btn"
        onClick={() => setOpen(!open)}
        title="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && <span className="notif-dot">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-header">
            <h4>Notifications</h4>
            {unread > 0 && (
              <button className="notif-mark-all" onClick={markAllRead}>
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <Bell size={24} />
                <span>No notifications yet</span>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${n.read ? '' : 'unread'}`}
                  onClick={() => !n.read && markRead(n.id)}
                >
                  <div className={`notif-icon ${n.type}`}>
                    {TYPE_ICONS[n.type] ?? <Info size={16} />}
                  </div>
                  <div className="notif-content">
                    <span className="notif-message">{n.message}</span>
                    <span className="notif-time">{timeAgo(n.createdAt)}</span>
                  </div>
                  {!n.read && <span className="notif-unread-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
