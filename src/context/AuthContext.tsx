import { apiFetch } from '../services/api';
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
}

export interface UserSettings {
  streaming_quality?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  isSettingsModalOpen: boolean;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>({});
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('mondoflix_token');
    const storedUser = localStorage.getItem('mondoflix_user');
    const storedSettings = localStorage.getItem('mondoflix_settings');
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {}
    }
    if (storedSettings) {
      try {
        setSettings(JSON.parse(storedSettings));
      } catch (e) {}
    }
  }, []);

  // Fetch settings when user logs in
  useEffect(() => {
    if (token) {
      apiFetch('/settings')
        .then(data => {
          if (data && data.settings) {
            setSettings(data.settings);
            localStorage.setItem('mondoflix_settings', JSON.stringify(data.settings));
          }
        })
        .catch(console.error);
    } else {
      setSettings({});
      localStorage.removeItem('mondoflix_settings');
    }
  }, [token]);

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('mondoflix_settings', JSON.stringify(updated));
    if (token) {
      try {
        await apiFetch('/settings', {
          method: 'POST',
          body: JSON.stringify({ settings: newSettings })
        });
      } catch (e) {
        console.error('Failed to save settings to server', e);
      }
    }
  };

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('mondoflix_token', newToken);
    localStorage.setItem('mondoflix_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('mondoflix_token');
    localStorage.removeItem('mondoflix_user');
  };

  return (
    <AuthContext.Provider value={{ 
      user, token, settings, updateSettings, login, logout, 
      isAuthModalOpen, 
      openAuthModal: () => setIsAuthModalOpen(true), 
      closeAuthModal: () => setIsAuthModalOpen(false),
      isSettingsModalOpen,
      openSettingsModal: () => setIsSettingsModalOpen(true),
      closeSettingsModal: () => setIsSettingsModalOpen(false)
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
