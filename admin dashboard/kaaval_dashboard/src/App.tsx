import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { Role } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Violations from './pages/Violations';
import ReviewEvidence from './pages/ReviewEvidence';
import Cameras from './pages/Cameras';
import Analytics from './pages/Analytics';
import DevAnalytics from './pages/DevAnalytics';
import SystemStatus from './pages/SystemStatus';
import SystemLogs from './pages/SystemLogs';
import CameraConfig from './pages/CameraConfig';
import UsersManagement from './pages/UsersManagement';
import SettingsPage from './pages/Settings';
import WeeklyReports from './pages/WeeklyReports';

const FULL_ACCESS_ROLES: Role[] = ['super_admin', 'sp', 'dsp', 'developer'];
const ALL_EXCEPT_VIEWERS: Role[] = ['super_admin', 'sp', 'dsp', 'nagercoil_admin', 'thuckalay_admin', 'colachel_admin', 'kanyakumari_admin', 'marthandam_admin', 'inspector', 'sub_inspector', 'developer', 'operator'];
const TECH_ROLES: Role[] = ['super_admin', 'developer'];
const REPORTS_ROLES: Role[] = ['super_admin', 'developer', 'sp', 'dsp'];
const CAMERA_HEALTH_ROLES: Role[] = ['super_admin', 'developer', 'sp', 'dsp', 'inspector', 'sub_inspector', 'nagercoil_admin', 'thuckalay_admin', 'colachel_admin', 'kanyakumari_admin', 'marthandam_admin'];

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode; roles?: Role[] }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="violations" element={
          <ProtectedRoute roles={ALL_EXCEPT_VIEWERS}>
            <Violations />
          </ProtectedRoute>
        } />
        <Route path="cameras" element={
          <ProtectedRoute roles={FULL_ACCESS_ROLES}>
            <Cameras />
          </ProtectedRoute>
        } />
        <Route path="analytics" element={
          <ProtectedRoute roles={FULL_ACCESS_ROLES}>
            <Analytics />
          </ProtectedRoute>
        } />
        <Route path="dev-analytics" element={
          <ProtectedRoute roles={TECH_ROLES}>
            <DevAnalytics />
          </ProtectedRoute>
        } />

        <Route path="system" element={
          <ProtectedRoute roles={TECH_ROLES}>
            <SystemStatus />
          </ProtectedRoute>
        } />
        <Route path="logs" element={
          <ProtectedRoute roles={TECH_ROLES}>
            <SystemLogs />
          </ProtectedRoute>
        } />
        <Route path="users" element={
          <ProtectedRoute roles={['super_admin']}>
            <UsersManagement />
          </ProtectedRoute>
        } />
        <Route path="camera-config" element={
          <ProtectedRoute roles={['super_admin']}>
            <CameraConfig />
          </ProtectedRoute>
        } />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="reports" element={
          <ProtectedRoute roles={REPORTS_ROLES}>
            <WeeklyReports />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
