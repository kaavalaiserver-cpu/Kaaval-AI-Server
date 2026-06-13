import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import type { NotificationItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { Bell, CheckCheck, AlertTriangle, Camera, Info, Send, Megaphone, X } from 'lucide-react';
import './NotificationPanel.css';

const BROADCAST_ROLES = ['super_admin', 'developer', 'sp', 'dsp'];

const PRIORITY_COLORS: Record<string, string> = {
  normal:  '#60a5fa',
  high:    '#f59e0b',
  urgent:  '#ef4444',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  violation:    <AlertTriangle size={16} />,
  camera:       <Camera size={16} />,
  system:       <Info size={16} />,
  broadcast:    <Megaphone size={16} />,
  daily_digest: <Bell size={16} />,
};

const NotificationPanel = () => {
  const { user, hasRole } = useAuth();
  const canBroadcast = hasRole(...BROADCAST_ROLES as any);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [bTitle, setBTitle] = useState('');
  const [bMessage, setBMessage] = useState('');
  const [bPriority, setBPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [bSending, setBSending] = useState(false);
  const [bSuccess, setBSuccess] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        axios.get<NotificationItem[]>(`${API_BASE}/notifications?limit=30`),
        axios.get<{ unread: number }>(`${API_BASE}/notifications/unread`),
      ]);
      setNotifications(Array.isArray(notifRes.data) ? notifRes.data : []);
      setUnread(countRes.data.unread ?? 0);
    } catch { /* API may not be available */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowBroadcast(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const markRead = async (id: string) => {
    try {
      await axios.post(`${API_BASE}/notifications/${encodeURIComponent(id)}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnread(c => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await axios.post(`${API_BASE}/notifications/read-all`);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    } catch { /* ignore */ }
  };

  const handleBroadcast = async () => {
    if (!bTitle.trim() || !bMessage.trim()) return;
    setBSending(true);
    try {
      await axios.post(`${API_BASE}/notifications/broadcast`, {
        title: bTitle.trim(),
        message: bMessage.trim(),
        priority: bPriority,
      });
      setBSuccess(true);
      setBTitle(''); setBMessage(''); setBPriority('normal');
      setTimeout(() => { setBSuccess(false); setShowBroadcast(false); fetchNotifications(); }, 1800);
    } catch { alert('Broadcast failed'); }
    finally { setBSending(false); }
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
      <button className="icon-btn notification-btn" onClick={() => setOpen(!open)} title="Notifications">
        <Bell size={18} />
        {unread > 0 && <span className="notif-dot">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-header">
            <h4>Notifications</h4>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {unread > 0 && (
                <button className="notif-mark-all" onClick={markAllRead}>
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
              {canBroadcast && (
                <button
                  className="notif-mark-all"
                  style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}
                  onClick={() => setShowBroadcast(!showBroadcast)}
                  title="Broadcast announcement"
                >
                  <Megaphone size={14} /> Broadcast
                </button>
              )}
            </div>
          </div>

          {/* Broadcast Composer */}
          {showBroadcast && canBroadcast && (
            <div className="broadcast-composer">
              <div className="broadcast-composer-header">
                <Megaphone size={15} /> <span>Send Broadcast</span>
                <button onClick={() => setShowBroadcast(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={14} /></button>
              </div>
              {bSuccess ? (
                <div style={{ padding: '12px', color: '#4ade80', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700 }}>
                  ✅ Broadcast sent successfully!
                </div>
              ) : (
                <>
                  <input
                    className="broadcast-input"
                    placeholder="Title (e.g. Important Alert)"
                    value={bTitle}
                    onChange={e => setBTitle(e.target.value)}
                    maxLength={80}
                  />
                  <textarea
                    className="broadcast-textarea"
                    placeholder="Message for all users..."
                    value={bMessage}
                    onChange={e => setBMessage(e.target.value)}
                    rows={3}
                    maxLength={400}
                  />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select className="broadcast-select" value={bPriority} onChange={e => setBPriority(e.target.value as any)}>
                      <option value="normal">Normal</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">🚨 Urgent</option>
                    </select>
                    <button
                      className="broadcast-send-btn"
                      onClick={handleBroadcast}
                      disabled={bSending || !bTitle.trim() || !bMessage.trim()}
                    >
                      <Send size={14} /> {bSending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <Bell size={24} />
                <span>No notifications yet</span>
              </div>
            ) : (
              notifications.map(n => {
                const priority = (n as any).priority ?? 'normal';
                const title = (n as any).title;
                const sentBy = (n as any).sentBy;
                return (
                  <div
                    key={n.id}
                    className={`notif-item ${n.read ? '' : 'unread'} ${n.type}`}
                    onClick={() => !n.read && markRead(n.id)}
                  >
                    <div className={`notif-icon ${n.type}`} style={{ color: priority !== 'normal' ? PRIORITY_COLORS[priority] : undefined }}>
                      {TYPE_ICONS[n.type] ?? <Info size={16} />}
                    </div>
                    <div className="notif-content">
                      {title && <span className="notif-title">{title}</span>}
                      <span className="notif-message">{n.message}</span>
                      <div className="notif-meta">
                        {sentBy && <span className="notif-sentby">by {sentBy}</span>}
                        {priority !== 'normal' && (
                          <span className="notif-priority" style={{ color: PRIORITY_COLORS[priority] }}>
                            {priority.toUpperCase()}
                          </span>
                        )}
                        <span className="notif-time">{timeAgo(n.createdAt)}</span>
                      </div>
                    </div>
                    {!n.read && <span className="notif-unread-dot" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
