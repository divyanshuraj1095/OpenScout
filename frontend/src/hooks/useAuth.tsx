import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services/auth.service";
import type { UserProfile } from "../services/auth.service";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password?: string) => Promise<void>;
  signup: (name: string, email: string, password?: string, gitHubURL?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const profile = await authService.getProfile();
      setUser(profile);
    } catch (err: any) {
      setUser(null);
      // We don't want to log error since not logged in is a normal state on init
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile(true);
  }, []);

  const login = async (email: string, password?: string) => {
    try {
      setError(null);
      await authService.login({ email, password });
      await fetchProfile(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Login failed";
      setError(msg);
      throw new Error(msg);
    }
  };

  const signup = async (name: string, email: string, password?: string, gitHubURL?: string) => {
    try {
      setError(null);
      await authService.signup({ name, email, password, gitHubURL });
      await authService.login({ email, password });
      await fetchProfile(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Signup failed";
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
      setUser(null);
    } catch (err: any) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        signup,
        logout,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
