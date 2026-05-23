import { createContext, useState, type ReactNode } from 'react';

type AuthStatus = 'checking' | 'setup' | 'login' | 'authenticated';

interface AuthContextValue {
  status: AuthStatus;
  setStatus: (status: AuthStatus) => void;
  displayName: string;
  setDisplayName: (name: string) => void;
}

export const AuthContext = createContext<AuthContextValue>({
  status: 'checking',
  setStatus: () => {},
  displayName: 'Admin',
  setDisplayName: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [displayName, setDisplayName] = useState('Admin');

  return (
    <AuthContext.Provider value={{ status, setStatus, displayName, setDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
}
