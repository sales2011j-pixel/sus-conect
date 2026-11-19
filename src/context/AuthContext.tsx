import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, RegisterData } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (dataOrName: RegisterData | string, email?: string, phone?: string, pass?: string) => Promise<void>;
  logout: () => void;
  switchDemoUser: (role: UserRole) => void;
  isAuthModalOpen: boolean;
  openAuthModal: (tab?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  authModalTab: 'login' | 'register';
  setAuthModalTab: (tab: 'login' | 'register') => void;
}

const DEMO_CITIZEN: User = {
  id: 'user_citizen_demo',
  name: 'Maria Silva',
  email: 'maria.silva@exemplo.com',
  phone: '(11) 98765-4321',
  role: 'citizen',
  createdAt: '2026-10-10T10:00:00.000Z',
};

const DEMO_ADMIN: User = {
  id: 'user_admin_demo',
  name: 'Coord. Dr. Roberto Sales',
  email: 'admin@susconect.gov.br',
  phone: '(11) 91234-5678',
  role: 'admin',
  createdAt: '2026-09-01T08:00:00.000Z',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  useEffect(() => {
    // Check saved session
    const saved = localStorage.getItem('sus_conect_session');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('sus_conect_session');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    setUser(res.user);
    localStorage.setItem('sus_conect_session', JSON.stringify(res.user));
    setIsAuthModalOpen(false);
  };

  const register = async (
    dataOrName: RegisterData | string,
    email?: string,
    phone?: string,
    pass?: string
  ) => {
    let payload: RegisterData;
    if (typeof dataOrName === 'string') {
      payload = {
        name: dataOrName,
        email: email || '',
        phone: phone || '',
        password: pass || '',
      };
    } else {
      payload = dataOrName;
    }
    const res = await api.register(payload);
    setUser(res.user);
    localStorage.setItem('sus_conect_session', JSON.stringify(res.user));
    setIsAuthModalOpen(false);
  };


  const logout = () => {
    setUser(null);
    localStorage.removeItem('sus_conect_session');
  };

  const switchDemoUser = (targetRole: UserRole) => {
    const target = targetRole === 'admin' ? DEMO_ADMIN : DEMO_CITIZEN;
    setUser(target);
    localStorage.setItem('sus_conect_session', JSON.stringify(target));
    setIsAuthModalOpen(false);
  };

  const openAuthModal = (tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'citizen',
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        switchDemoUser,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        authModalTab,
        setAuthModalTab,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
