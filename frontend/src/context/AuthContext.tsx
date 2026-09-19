import { createContext, useContext, useState, useEffect, type ReactNode, type FC } from 'react';
import type { User, MessMembership } from '../types/auth';
import { authService } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  token: string | null;
  activeMess: MessMembership | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [activeMess, setActiveMess] = useState<MessMembership | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setUser(null);
        setActiveMess(null);
        return;
      }

      const profile = await authService.getMe();
      setUser(profile.user);
      
      // Select the first ACTIVE or PENDING mess membership if exists
      const currentActive = profile.memberships.find((m) => m.status === 'ACTIVE') || profile.memberships[0] || null;
      setActiveMess(currentActive);
      if (currentActive?.messId) {
        localStorage.setItem('activeMessId', String(currentActive.messId));
      } else {
        localStorage.removeItem('activeMessId');
      }
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('activeMessId');
      setUser(null);
      setActiveMess(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authService.login(email, password);
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      setActiveMess(data.activeMembership || null);
      if (data.activeMembership?.messId) {
        localStorage.setItem('activeMessId', String(data.activeMembership.messId));
      } else {
        localStorage.removeItem('activeMessId');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    setIsLoading(true);
    try {
      const data = await authService.register(name, email, password, phone);
      localStorage.setItem('token', data.token);
      localStorage.removeItem('activeMessId');
      setToken(data.token);
      setUser(data.user);
      setActiveMess(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('activeMessId');
    setToken(null);
    setUser(null);
    setActiveMess(null);
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeMess,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
