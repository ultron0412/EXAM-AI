import { createContext, useContext, useMemo, useState } from "react";
import { api, apiErrorMessage } from "../services/api";

const AuthContext = createContext(null);

const USER_KEY = "exam_ai_user";
const TOKEN_KEY = "exam_ai_token";

const loadUser = () => {
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(loadUser);
  const [loading, setLoading] = useState(false);

  const persistSession = (nextUser, token) => {
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    localStorage.setItem(TOKEN_KEY, token);
    setUser(nextUser);
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      persistSession(data.user, data.token);
      return data.user;
    } catch (error) {
      throw new Error(apiErrorMessage(error, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", { name, email, password });
      persistSession(data.user, data.token);
      return data.user;
    } catch (error) {
      throw new Error(apiErrorMessage(error, "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("exam_ai_last_analysis");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      login,
      register,
      logout,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};

