import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff, Lock } from 'lucide-react';
import './Login.css';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

const Login = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockout, setLockout] = useState(0); // seconds remaining
  const lockoutTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown ticker
  useEffect(() => {
    if (lockout <= 0) return;
    lockoutTimer.current = setInterval(() => {
      setLockout(prev => {
        if (prev <= 1) {
          clearInterval(lockoutTimer.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(lockoutTimer.current!);
  }, [lockout > 0]);

  const isLocked = lockout > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      setAttempts(0); // reset on success
    } catch {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_ATTEMPTS) {
        setLockout(LOCKOUT_SECONDS);
        setError(`Too many failed attempts. Try again in ${LOCKOUT_SECONDS} seconds.`);
      } else {
        setError(`Invalid username or password. ${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next !== 1 ? 's' : ''} remaining.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-shield">
            <Shield size={32} />
          </div>
          <h1>KAAVAL AI</h1>
          <p className="login-subtitle">Admin Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div className="login-error">{error}</div>}

          {isLocked ? (
            <button type="button" className="login-btn locked" disabled>
              <Lock size={16} /> Locked — retry in {lockout}s
            </button>
          ) : (
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          )}
        </form>

        <div className="login-footer">
          <p>Authorized personnel only</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
