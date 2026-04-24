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
import EvidenceArchive from './pages/EvidenceArchive';
import SystemStatus from './pages/SystemStatus';
import SystemLogs from './pages/SystemLogs';
import CameraConfig from './pages/CameraConfig';

const FULL_ACCESS_ROLES: Role[] = ['super_admin', 'traffic_admin', 'dev_admin'];

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
          <ProtectedRoute roles={FULL_ACCESS_ROLES}>
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
          <ProtectedRoute roles={['dev_admin']}>
            <DevAnalytics />
          </ProtectedRoute>
        } />
        <Route path="evidence-archive" element={
          <ProtectedRoute roles={FULL_ACCESS_ROLES}>
            <EvidenceArchive />
          </ProtectedRoute>
        } />
        <Route path="system" element={
          <ProtectedRoute roles={['dev_admin']}>
            <SystemStatus />
          </ProtectedRoute>
        } />
        <Route path="logs" element={
          <ProtectedRoute roles={['dev_admin']}>
            <SystemLogs />
          </ProtectedRoute>
        } />
        <Route path="camera-config" element={
          <ProtectedRoute roles={['dev_admin']}>
            <CameraConfig />
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
