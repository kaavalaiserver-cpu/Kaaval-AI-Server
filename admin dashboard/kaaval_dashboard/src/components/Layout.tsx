import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../context/AuthContext';
import {
  LayoutDashboard,
  AlertTriangle,
  Camera,
  BarChart3,
  Activity,
  FileTerminal,
  Menu,
  Bell,
  Search,
  Code2,
  ChevronLeft,
  User,
  LogOut,
  Settings,
  Sun,
  Moon,
  MapPin,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type { SystemStatus } from '../types';
import NotificationPanel from './NotificationPanel';
import './Layout.css';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isOpen: boolean;
  badge?: number;
  roles?: Role[];
}

const NavItem = ({ to, icon, label, isOpen, badge, roles }: NavItemProps) => {
  const { hasRole } = useAuth();
  if (roles && !hasRole(...roles)) return null;
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      title={!isOpen ? label : ''}
    >
      <span className="nav-icon">{icon}</span>
      {isOpen && <span className="nav-label">{label}</span>}
      {badge !== undefined && badge > 0 && (
        <span className="nav-badge">{badge}</span>
      )}
    </NavLink>
  );
};

const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  sp: 'Superintendent of Police',
  dsp: 'Deputy Superintendent',
  nagercoil_admin: 'Nagercoil Admin',
  thuckalay_admin: 'Thuckalay Admin',
  colachel_admin: 'Colachel Admin',
  kanyakumari_admin: 'Kanyakumari Admin',
  marthandam_admin: 'Marthandam Admin',
  inspector: 'Inspector',
  sub_inspector: 'Sub-Inspector',
  operator: 'Operator',
  viewer: 'Viewer',
  developer: 'Developer',
};

const TECH_ROLES: Role[] = ['super_admin', 'developer'];
const MANAGEMENT_ROLES: Role[] = ['super_admin', 'sp', 'dsp', 'developer', 'nagercoil_admin', 'thuckalay_admin', 'colachel_admin', 'kanyakumari_admin', 'marthandam_admin', 'inspector', 'sub_inspector'];
const CAMERA_HEALTH_ROLES: Role[] = ['super_admin', 'sp', 'dsp', 'developer'];
const Layout = () => {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  
  // Mobile check state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
  const [lastAction, setLastAction] = useState<any>(null);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        if (!isSidebarOpen && window.innerWidth > 1024) setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  // Close sidebar on route change if mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  useEffect(() => {
    // Only developer and super_admin has access to /system/status endpoint
    if (!user || !TECH_ROLES.includes(user.role)) {
      setStatus({ status: 'online', uptime: 0, memory: { used: 0, total: 0 }, cpu: 0, database: 'connected', version: '1.0' });
      return;
    }

    const fetchStatus = async () => {
      try {
        const res = await axios.get<SystemStatus>(`${API_BASE}/system/status`);
        setStatus(res.data);
      } catch {
        // Backend may not be running or token expired
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // 60s polling
    return () => clearInterval(interval);
  }, [user?.role]);

  useEffect(() => {
    if (!user || hasRole('super_admin', 'developer')) return;
    const fetchLastAction = async () => {
      try {
        const res = await axios.get(`${API_BASE}/system/audit/my-last-action`);
        setLastAction(res.data);
      } catch {
        // Ignore errors if audit not available
      }
    };
    fetchLastAction();
  }, [user, hasRole]);

  return (
    <div className="layout-container">
      {/* Mobile Backdrop */}
      {isMobile && isSidebarOpen && (
        <div 
          className="mobile-backdrop" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? '' : 'collapsed'}`}>
        <div className="logo-section">
          {isSidebarOpen && (
            <div className="logo-content">
              <img src="/Kaaval AI Logo.png" alt="Logo" className="sidebar-logo" />
              <div>
                <h2>
                  <span style={{ color: theme === 'dark' ? 'var(--white)' : 'var(--navy)' }}>KAAVAL</span> <span className="text-red">AI</span>
                </h2>
                <span className="badge">ADMIN</span>
              </div>
            </div>
          )}
          <button
            className="toggle-sidebar-btn"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <ChevronLeft size={18} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="nav-menu">
          <div className="nav-section-label">{isOpen(isSidebarOpen, 'MAIN')}</div>
          <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" isOpen={isSidebarOpen} />
          
          <NavItem to="/violations" icon={<AlertTriangle size={20} />} label="Violations" isOpen={isSidebarOpen} />
            


          {hasRole(...MANAGEMENT_ROLES) && <div className="nav-section-label">{isOpen(isSidebarOpen, 'INSIGHTS')}</div>}
          <NavItem to="/analytics" icon={<BarChart3 size={20} />} label="Analytics" isOpen={isSidebarOpen} 
            roles={MANAGEMENT_ROLES} />
          
          <NavItem to="/dev-analytics" icon={<Code2 size={20} />} label="Dev Analytics" isOpen={isSidebarOpen}
            roles={TECH_ROLES} />

          {hasRole(...CAMERA_HEALTH_ROLES) && <div className="nav-section-label">{isOpen(isSidebarOpen, 'SYSTEM')}</div>}
          <NavItem to="/kit-management" icon={<MapPin size={20} />} label="Camera Network" isOpen={isSidebarOpen}
            roles={CAMERA_HEALTH_ROLES} />
            
          <NavItem to="/wanted-vehicles" icon={<ShieldAlert size={20} />} label="Wanted Vehicles" isOpen={isSidebarOpen}
            roles={CAMERA_HEALTH_ROLES} />

          <NavItem to="/system" icon={<Activity size={20} />} label="System Metrics" isOpen={isSidebarOpen}
            roles={TECH_ROLES} />

          <NavItem to="/users" icon={<User size={20} />} label="User Management" isOpen={isSidebarOpen}
            roles={['super_admin']} />

          <NavItem to="/audit-log" icon={<ShieldCheck size={20} />} label="Audit Log" isOpen={isSidebarOpen}
            roles={['super_admin']} />

          <NavItem to="/reports" icon={<BarChart3 size={20} />} label="Reports" isOpen={isSidebarOpen}
            roles={MANAGEMENT_ROLES} />

          <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" isOpen={isSidebarOpen} />
          
          {!hasRole('super_admin', 'developer') && lastAction && isSidebarOpen && (
            <div className="last-action-widget" style={{ padding: '10px 16px', margin: '15px 10px', background: 'var(--bg-card-hover)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.75rem' }}>
              <div style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.65rem' }}>Last Action</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{lastAction.action?.replace(/_/g, ' ')}</div>
              {lastAction.createdAt && <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '4px' }}>{new Date(lastAction.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</div>}
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="system-status-indicator">
            <span className={`status-dot ${status ? 'online' : 'offline'}`}></span>
            {isSidebarOpen && (
              <span>{status ? 'System Online' : 'Connecting...'}</span>
            )}
          </div>
          {isSidebarOpen && (
            <div style={{ fontSize: '0.7em', color: '#666', marginTop: '10px', textAlign: 'center' }}>
              Version 1.0.1
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={`main-content ${isSidebarOpen && !isMobile ? 'shifted' : ''}`}>
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
             {isMobile && (
                <button 
                  className="mobile-menu-btn"
                  onClick={() => setIsSidebarOpen(true)}
                  style={{ marginRight: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
                >
                  <Menu size={24} />
                </button>
             )}
            <h3>District Command Center — Kanyakumari</h3>
          </div>

          <div className="top-bar-right">
            {/* Search */}
            <div className={`search-container ${searchOpen ? 'open' : ''}`}>
              {searchOpen && (
                <input
                  type="text"
                  placeholder="Search vehicle, camera, violation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              )}
              <button
                className="icon-btn"
                onClick={() => setSearchOpen(!searchOpen)}
              >
                <Search size={18} />
              </button>
            </div>

            {/* Theme Switcher */}
            <button className="icon-btn" onClick={toggleTheme} title="Toggle Theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications */}
            <NotificationPanel />

            {/* User */}
            <div className="user-badge">
              <User size={16} />
              {!isMobile && (
              <div className="user-info">
                <span className="user-name">{user?.name}</span>
                <span className="user-role">{user ? ROLE_LABELS[user.role] : ''}</span>
              </div>
              )}
            </div>

            {/* Logout */}
            <button className="icon-btn logout-btn" onClick={logout} title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

function isOpen(open: boolean, label: string) {
  return open ? label : '';
}

export default Layout;
