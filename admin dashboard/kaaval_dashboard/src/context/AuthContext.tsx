import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';

export type Role =
  | 'super_admin'
  | 'sp'
  | 'dsp'
  | 'nagercoil_admin'
  | 'thuckalay_admin'
  | 'colachel_admin'
  | 'kanyakumari_admin'
  | 'marthandam_admin'
  | 'inspector'
  | 'sub_inspector'
  | 'operator'
  | 'viewer'
  | 'developer';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  subdivision?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  logoutAllDevices: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Set auth header globally whenever token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);


  // Restore session from localStorage on mount
  useEffect(() => {
    axios.defaults.withCredentials = true; // Ensure cookies are sent
    const savedToken = localStorage.getItem('kaaval_token');
    const savedUser = localStorage.getItem('kaaval_user');
    if (savedToken && savedUser) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      setToken(savedToken);
      const storedUser = JSON.parse(savedUser);
      if (storedUser.role) {
        storedUser.role = storedUser.role.toLowerCase();
      }
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await axios.post(`${API_BASE}/auth/login`, { username, password });
    const { access_token, user: userData } = res.data;
    
    // Set header synchronously to prevent race condition before children mount
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    
    setToken(access_token);
    const normalizedUser = {
      ...userData,
      role: (userData.role as string).toLowerCase() as Role,
    };
    setUser(normalizedUser);
    localStorage.setItem('kaaval_token', access_token);
    localStorage.setItem('kaaval_user', JSON.stringify(normalizedUser));
  };

  const logout = useCallback(async () => {
    try {
      await axios.post(`${API_BASE}/auth/logout`);
    } catch (e) {
      // Ignore network errors on logout
    }
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    localStorage.removeItem('kaaval_token');
    localStorage.removeItem('kaaval_user');
  }, []);

  const logoutAllDevices = useCallback(async () => {
    try {
      await axios.post(`${API_BASE}/auth/logout-all`);
    } catch (e) {
      // Ignore network errors
    }
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    localStorage.removeItem('kaaval_token');
    localStorage.removeItem('kaaval_user');
  }, []);

  // Auto Logout Logic (5 minutes inactivity)
  useEffect(() => {
    if (!user) return;

    let timeoutId: number;
    const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes

    const resetTimer = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        console.log("Session expired due to inactivity");
        logout();
      }, INACTIVITY_LIMIT);
    };

    // Events to track activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    // Initial start
    resetTimer();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [user, logout]);

  // Handle 401 Unauthorized globally
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [logout]);

  const hasRole = (...roles: Role[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, logoutAllDevices, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};
