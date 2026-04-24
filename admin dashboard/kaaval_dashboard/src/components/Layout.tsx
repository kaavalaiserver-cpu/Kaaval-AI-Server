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
  Archive,
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
  traffic_admin: 'Traffic Admin',
  dev_admin: 'Dev Admin',
  colachel_admin: 'Colachel Subdivision',
  marthandam_admin: 'Marthandam Subdivision',
  nagercoil_admin: 'Nagercoil Subdivision',
  kanyakumari_admin: 'Kanyakumari Subdivision',
  thuckalay_admin: 'Thuckalay Subdivision',
};

const FULL_ACCESS_ROLES: Role[] = ['super_admin', 'traffic_admin', 'dev_admin'];

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  
  // Mobile check state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    const fetchStatus = async () => {
      try {
        const res = await axios.get<SystemStatus>(`${API_BASE}/system/status`);
        setStatus(res.data);
      } catch {
        // Backend may not be running
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

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
              <div className="logo-shield">K</div>
              <div>
                <h2>KAAVAL AI</h2>
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
          <NavItem to="/violations" icon={<AlertTriangle size={20} />} label="Violations" isOpen={isSidebarOpen}
            roles={FULL_ACCESS_ROLES} />
          <NavItem to="/cameras" icon={<Camera size={20} />} label="Cameras" isOpen={isSidebarOpen}
            roles={FULL_ACCESS_ROLES} />

          <div className="nav-section-label">{isOpen(isSidebarOpen, 'INSIGHTS')}</div>
          <NavItem to="/analytics" icon={<BarChart3 size={20} />} label="Analytics" isOpen={isSidebarOpen}
            roles={FULL_ACCESS_ROLES} />
          <NavItem to="/dev-analytics" icon={<Code2 size={20} />} label="Dev Analytics" isOpen={isSidebarOpen}
            roles={['dev_admin']} />
          <NavItem to="/evidence-archive" icon={<Archive size={20} />} label="Evidence Archive" isOpen={isSidebarOpen}
            roles={FULL_ACCESS_ROLES} />

          <div className="nav-section-label">{isOpen(isSidebarOpen, 'SYSTEM')}</div>
          <NavItem to="/system" icon={<Activity size={20} />} label="System Status" isOpen={isSidebarOpen}
            roles={['dev_admin']} />
          <NavItem to="/logs" icon={<FileTerminal size={20} />} label="System Logs" isOpen={isSidebarOpen}
            roles={['dev_admin']} />
          <NavItem to="/camera-config" icon={<Settings size={20} />} label="Camera Config" isOpen={isSidebarOpen}
            roles={['dev_admin']} />
        </nav>

        <div className="sidebar-footer">
          <div className="system-status-indicator">
            <span className={`status-dot ${status ? 'online' : 'offline'}`}></span>
            {isSidebarOpen && (
              <span>{status ? 'System Online' : 'Connecting...'}</span>
            )}
          </div>
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
