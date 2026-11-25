import { createContext, useContext, useState, type ReactNode } from "react";
import { authApi, TOKEN_STORAGE_KEY } from "../api/client";
import type { AuthUser, UserRole } from "../types/reservation";

const USER_STORAGE_KEY = "study_room_user";

interface AuthContextValue {
  user: AuthUser | null;
  login: (
    username: string,
    password: string,
    expectedRole: UserRole,
  ) => Promise<void>;
  registerStudent: (
    username: string,
    fullName: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!saved || !token) return null;
    try {
      return JSON.parse(saved) as AuthUser;
    } catch {
      return null;
    }
  });

  const persistSession = (token: string, authUser: AuthUser) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));
    setUser(authUser);
  };

  const login = async (
    username: string,
    password: string,
    expectedRole: UserRole,
  ) => {
    const res = await authApi.login(username, password, expectedRole);
    persistSession(res.token, res.user);
  };

  const registerStudent = async (
    username: string,
    fullName: string,
    password: string,
  ) => {
    const res = await authApi.registerStudent(username, fullName, password);
    persistSession(res.token, res.user);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, registerStudent, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
