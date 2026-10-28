import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('campusbid-token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      if (!token) {
        delete api.defaults.headers.common.Authorization;
        if (active) setLoading(false);
        return;
      }

      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      try {
        const response = await api.get('/auth/me');
        if (active) setUser(response.data.user);
      } catch {
        localStorage.removeItem('campusbid-token');
        delete api.defaults.headers.common.Authorization;
        if (active) {
          setUser(null);
          setToken('');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadSession();
    return () => { active = false; };
  }, [token]);

  const login = async ({ email, password, role }) => {
    const response = await api.post('/auth/login', { email, password, role });
    const { user: nextUser, token: nextToken } = response.data;
    localStorage.setItem('campusbid-token', nextToken);
    api.defaults.headers.common.Authorization = `Bearer ${nextToken}`;
    setToken(nextToken);
    setUser(nextUser);
    return nextUser;
  };

  const register = async (payload) => {
    const response = await api.post('/auth/register', payload);
    const { user: nextUser, token: nextToken } = response.data;
    localStorage.setItem('campusbid-token', nextToken);
    api.defaults.headers.common.Authorization = `Bearer ${nextToken}`;
    setToken(nextToken);
    setUser(nextUser);
    return nextUser;
  };

  const logout = () => {
    localStorage.removeItem('campusbid-token');
    delete api.defaults.headers.common.Authorization;
    setUser(null);
    setToken('');
  };

  const value = useMemo(() => ({ user, token, loading, login, register, logout }), [user, token, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
