import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';
import {
  Settings, User, Lock, Bell, Monitor, Shield,
  Eye, EyeOff, Save, CheckCircle, AlertCircle,
  Sun, Moon, Clock, LogOut, Trash2, ChevronRight
} from 'lucide-react';
import './Settings.css';

const SECTIONS = ['Profile', 'Security', 'Appearance', 'Notifications', 'Session', 'Danger Zone'] as const;
type Section = typeof SECTIONS[number];

const SettingsPage = () => {
  const { user, logout, logoutAllDevices } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>('Profile');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="settings-page">
      {toast && (
        <div className={`settings-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="settings-header">
        <h2><Settings size={22} /> Settings</h2>
        <span className="settings-sub">Manage your account, preferences, and system configuration</span>
      </div>

      <div className="settings-layout">
        {/* Sidebar Nav */}
        <nav className="settings-nav">
          {SECTIONS.map(s => (
            <button
              key={s}
              className={`settings-nav-btn ${activeSection === s ? 'active' : ''} ${s === 'Danger Zone' ? 'danger' : ''}`}
              onClick={() => setActiveSection(s)}
            >
              <SectionIcon section={s} />
              {s}
              <ChevronRight size={14} className="nav-chevron" />
            </button>
          ))}
        </nav>

        {/* Content Panel */}
        <div className="settings-content">
          {activeSection === 'Profile'       && <ProfileSection user={user} showToast={showToast} />}
          {activeSection === 'Security'      && <SecuritySection showToast={showToast} />}
          {activeSection === 'Appearance'    && <AppearanceSection showToast={showToast} />}
          {activeSection === 'Notifications' && <NotificationsSection showToast={showToast} />}
          {activeSection === 'Session'       && <SessionSection />}
          {activeSection === 'Danger Zone'   && <DangerSection logout={logout} logoutAllDevices={logoutAllDevices} showToast={showToast} />}
        </div>
      </div>
    </div>
  );
};

// ─── Section Icon helper ─────────────────────────────────────────────────────
const SectionIcon = ({ section }: { section: Section }) => {
  const icons: Record<Section, React.ReactNode> = {
    'Profile':       <User size={16} />,
    'Security':      <Lock size={16} />,
    'Appearance':    <Monitor size={16} />,
    'Notifications': <Bell size={16} />,
    'Session':       <Clock size={16} />,
    'Danger Zone':   <Trash2 size={16} />,
  };
  return <>{icons[section]}</>;
};

// ─── Profile Section ─────────────────────────────────────────────────────────
const ProfileSection = ({ user, showToast }: { user: any; showToast: Function }) => {
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await axios.patch(`${API_BASE}/users/${user.id}`, { name });
      const saved = JSON.parse(localStorage.getItem('kaaval_user') || '{}');
      localStorage.setItem('kaaval_user', JSON.stringify({ ...saved, name }));
      showToast('success', 'Profile updated successfully');
    } catch {
      showToast('error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-section">
      <h3><User size={18} /> Profile</h3>
      <p className="section-desc">Your basic account information</p>

      <div className="settings-card">
        <div className="profile-avatar">
          <div className="avatar-circle">{user?.name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || '?'}</div>
          <div>
            <div className="avatar-name">{user?.name || user?.username}</div>
            <div className="avatar-role">{user?.role?.replace(/_/g, ' ').toUpperCase()}</div>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Display Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
          </div>
          <div className="form-group">
            <label>Username</label>
            <input value={user?.username || ''} disabled className="disabled" />
            <span className="field-note">Username cannot be changed</span>
          </div>
          <div className="form-group">
            <label>Role</label>
            <input value={(user?.role || '').replace(/_/g, ' ')} disabled className="disabled" />
          </div>
          {user?.subdivision && (
            <div className="form-group">
              <label>Subdivision</label>
              <input value={user.subdivision} disabled className="disabled" />
            </div>
          )}
        </div>

        <button className="btn-save" onClick={save} disabled={saving}>
          <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

// ─── Security Section ────────────────────────────────────────────────────────
const SecuritySection = ({ showToast }: { showToast: Function }) => {
  const { user } = useAuth();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const strength = newPw.length === 0 ? 0 : newPw.length < 6 ? 1 : newPw.length < 10 ? 2 : 3;
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong'];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#22c55e'];

  const save = async () => {
    if (!currentPw || !newPw || !confirmPw) return showToast('error', 'All fields are required');
    if (newPw !== confirmPw) return showToast('error', 'New passwords do not match');
    if (newPw.length < 8) return showToast('error', 'Password must be at least 8 characters');
    if (!/(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(newPw)) {
      return showToast('error', 'Password must contain at least one number and one special character');
    }
    setSaving(true);
    try {
      await axios.post(`${API_BASE}/auth/change-password`, {
        currentPassword: currentPw,
        newPassword: newPw,
      });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      showToast('success', 'Password changed successfully');
    } catch (err: any) {
      showToast('error', err?.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-section">
      <h3><Lock size={18} /> Security</h3>
      <p className="section-desc">Change your password and review account security</p>

      <div className="settings-card">
        <h4>Change Password</h4>
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Current Password</label>
            <div className="pw-input-wrap">
              <input type={showCurrent ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" />
              <button onClick={() => setShowCurrent(!showCurrent)}>{showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </div>
          <div className="form-group">
            <label>New Password</label>
            <div className="pw-input-wrap">
              <input type={showNew ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="••••••••" />
              <button onClick={() => setShowNew(!showNew)}>{showNew ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
            {newPw && (
              <div className="pw-strength">
                <div className="pw-strength-bar">
                  {[1, 2, 3].map(i => <div key={i} className="pw-seg" style={{ background: i <= strength ? strengthColor[strength] : 'var(--border)' }} />)}
                </div>
                <span style={{ color: strengthColor[strength], fontSize: '0.75rem' }}>{strengthLabel[strength]}</span>
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <div className="pw-input-wrap">
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••••" />
              {confirmPw && <span style={{ position: 'absolute', right: 10, color: confirmPw === newPw ? '#22c55e' : '#ef4444' }}>{confirmPw === newPw ? <CheckCircle size={16} /> : <AlertCircle size={16} />}</span>}
            </div>
          </div>
        </div>
        <button className="btn-save" onClick={save} disabled={saving}>
          <Lock size={15} /> {saving ? 'Changing...' : 'Change Password'}
        </button>
      </div>

      <div className="settings-card">
        <h4>Security Info</h4>
        <div className="info-rows">
          <div className="info-row"><span>Session Timeout</span><span className="info-val">30 minutes inactivity</span></div>
          <div className="info-row"><span>Auth Method</span><span className="info-val">JWT Bearer Token</span></div>
          <div className="info-row"><span>Token Storage</span><span className="info-val">LocalStorage (encrypted)</span></div>
        </div>
      </div>
    </div>
  );
};

// ─── Appearance Section ──────────────────────────────────────────────────────
const AppearanceSection = ({ showToast }: { showToast: Function }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'dark'
  );
  const [compact, setCompact] = useState(() => localStorage.getItem('kaaval_compact') === 'true');
  const [animations, setAnimations] = useState(() => localStorage.getItem('kaaval_animations') !== 'false');

  const applyTheme = (t: 'dark' | 'light') => {
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('kaaval_theme', t);
    showToast('success', `Switched to ${t} mode`);
  };

  const savePrefs = () => {
    localStorage.setItem('kaaval_compact', compact.toString());
    localStorage.setItem('kaaval_animations', animations.toString());
    document.body.classList.toggle('compact-mode', compact);
    document.body.classList.toggle('no-animations', !animations);
    showToast('success', 'Preferences saved');
  };

  return (
    <div className="settings-section">
      <h3><Monitor size={18} /> Appearance</h3>
      <p className="section-desc">Customize how the dashboard looks</p>

      <div className="settings-card">
        <h4>Theme</h4>
        <div className="theme-picker">
          <button className={`theme-btn dark ${theme === 'dark' ? 'selected' : ''}`} onClick={() => applyTheme('dark')}>
            <Moon size={20} />
            <span>Dark Mode</span>
            <span className="theme-desc">Default — optimized for night operations</span>
            {theme === 'dark' && <CheckCircle size={16} className="theme-check" />}
          </button>
          <button className={`theme-btn light ${theme === 'light' ? 'selected' : ''}`} onClick={() => applyTheme('light')}>
            <Sun size={20} />
            <span>Light Mode</span>
            <span className="theme-desc">High-contrast daylight use</span>
            {theme === 'light' && <CheckCircle size={16} className="theme-check" />}
          </button>
        </div>
      </div>

      <div className="settings-card">
        <h4>Display Preferences</h4>
        <div className="toggle-rows">
          <div className="toggle-row">
            <div>
              <div className="toggle-label">Compact View</div>
              <div className="toggle-desc">Reduce padding and spacing for more data density</div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={compact} onChange={e => setCompact(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="toggle-row">
            <div>
              <div className="toggle-label">Animations</div>
              <div className="toggle-desc">Enable page transitions and micro-animations</div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={animations} onChange={e => setAnimations(e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
        <button className="btn-save" onClick={savePrefs}>
          <Save size={15} /> Save Preferences
        </button>
      </div>
    </div>
  );
};

// ─── Notifications Section ───────────────────────────────────────────────────
const NotificationsSection = ({ showToast }: { showToast: Function }) => {
  const [prefs, setPrefs] = useState({
    newViolation: true,
    challanIssued: true,
    systemAlerts: true,
    cameraOffline: true,
    dailyDigest: false,
    soundAlerts: false,
  });

  const toggle = (key: keyof typeof prefs) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const save = () => {
    localStorage.setItem('kaaval_notif_prefs', JSON.stringify(prefs));
    showToast('success', 'Notification preferences saved');
  };

  const rows = [
    { key: 'newViolation',  label: 'New Violation Detected',   desc: 'When AI detects a new traffic violation' },
    { key: 'challanIssued', label: 'Challan Issued',            desc: 'When a fine is approved and issued' },
    { key: 'systemAlerts',  label: 'System Alerts',             desc: 'Critical backend or pipeline errors' },
    { key: 'cameraOffline', label: 'Camera Goes Offline',       desc: 'When a camera loses connection' },
    { key: 'dailyDigest',   label: 'Daily Summary Digest',      desc: 'End-of-day violation summary report' },
    { key: 'soundAlerts',   label: 'Sound Alerts',              desc: 'Play a sound on new violations' },
  ] as const;

  return (
    <div className="settings-section">
      <h3><Bell size={18} /> Notifications</h3>
      <p className="section-desc">Control what alerts you receive</p>

      <div className="settings-card">
        <div className="toggle-rows">
          {rows.map(({ key, label, desc }) => (
            <div className="toggle-row" key={key}>
              <div>
                <div className="toggle-label">{label}</div>
                <div className="toggle-desc">{desc}</div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={prefs[key]} onChange={() => toggle(key)} />
                <span className="toggle-slider" />
              </label>
            </div>
          ))}
        </div>
        <button className="btn-save" onClick={save}><Save size={15} /> Save Preferences</button>
      </div>
    </div>
  );
};

// ─── Session Section ─────────────────────────────────────────────────────────
const SessionSection = () => {
  const { user, token } = useAuth();
  const loginTime = localStorage.getItem('kaaval_login_time');

  return (
    <div className="settings-section">
      <h3><Clock size={18} /> Session</h3>
      <p className="section-desc">Current session and activity details</p>

      <div className="settings-card">
        <h4>Active Session</h4>
        <div className="info-rows">
          <div className="info-row"><span>Logged in as</span><span className="info-val highlight">{user?.username}</span></div>
          <div className="info-row"><span>Role</span><span className="info-val">{user?.role?.replace(/_/g, ' ')}</span></div>
          <div className="info-row"><span>Session Timeout</span><span className="info-val">30 min inactivity</span></div>
          <div className="info-row"><span>Auth Token</span><span className="info-val mono">{token?.slice(0, 20)}…</span></div>
        </div>
      </div>

      <div className="settings-card">
        <h4>Security Policies</h4>
        <div className="info-rows">
          <div className="info-row"><span>Auto-logout on inactivity</span><span className="badge-green">Enabled</span></div>
          <div className="info-row"><span>Token-based Authentication</span><span className="badge-green">Active</span></div>
          <div className="info-row"><span>Role-Based Access Control</span><span className="badge-green">Enforced</span></div>
        </div>
      </div>
    </div>
  );
};

// ─── Danger Zone Section ─────────────────────────────────────────────────────
const DangerSection = ({ logout, logoutAllDevices, showToast }: { logout: () => void; logoutAllDevices: () => void; showToast: Function }) => {
  const [confirmClear, setConfirmClear] = useState(false);

  const clearLocalData = () => {
    const token = localStorage.getItem('kaaval_token');
    const user = localStorage.getItem('kaaval_user');
    localStorage.clear();
    if (token) localStorage.setItem('kaaval_token', token);
    if (user) localStorage.setItem('kaaval_user', user);
    showToast('success', 'Local preferences cleared');
    setConfirmClear(false);
  };

  return (
    <div className="settings-section">
      <h3 style={{ color: '#f87171' }}><Shield size={18} /> Danger Zone</h3>
      <p className="section-desc">Irreversible actions — proceed with caution</p>

      <div className="settings-card danger-card">
        <div className="danger-row">
          <div>
            <div className="danger-label">Sign Out</div>
            <div className="danger-desc">End your current session and return to the login screen</div>
          </div>
          <button className="btn-danger-outline" onClick={logout}><LogOut size={15} /> Sign Out</button>
        </div>
      </div>

      <div className="settings-card danger-card">
        <div className="danger-row">
          <div>
            <div className="danger-label">Logout From All Devices</div>
            <div className="danger-desc">Sign out of all active sessions across all browsers and devices instantly</div>
          </div>
          <button className="btn-danger-solid" onClick={logoutAllDevices}><Shield size={15} /> Revoke All Sessions</button>
        </div>
      </div>

      <div className="settings-card danger-card">
        <div className="danger-row">
          <div>
            <div className="danger-label">Clear Local Preferences</div>
            <div className="danger-desc">Reset all local settings: theme, notification prefs, and cached data</div>
          </div>
          {!confirmClear ? (
            <button className="btn-danger-outline" onClick={() => setConfirmClear(true)}><Trash2 size={15} /> Clear Data</button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-danger-solid" onClick={clearLocalData}>Confirm Clear</button>
              <button className="btn-danger-outline" onClick={() => setConfirmClear(false)}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
