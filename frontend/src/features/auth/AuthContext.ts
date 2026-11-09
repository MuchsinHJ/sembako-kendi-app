import { createContext } from 'react';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  bootstrapDone: boolean;
  setAuthenticated: (token: string | null) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
