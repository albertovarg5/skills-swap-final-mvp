import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { api, setCsrfToken, setSessionExpiredHandler } from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while we check for an existing session
  const [flash, setFlash] = useState(null); // { type: "success" | "error", text }

  const clearSession = useCallback(() => {
    setCsrfToken(null);
    setUser(null);
  }, []);

  // Restore the session after a page refresh. The server checks the cookie and expiry.
  useEffect(() => {
    let cancelled = false;
    api("/auth/me")
      .then((data) => {
        if (cancelled) return;
        setCsrfToken(data.csrfToken);
        setUser(data.user);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  // If any request later gets a 401, the token expired: log out and explain why.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      clearSession();
      setFlash({ type: "error", text: "Your session expired. Please log in again." });
    });
  }, [clearSession]);

  const startSession = useCallback((data, text) => {
    setCsrfToken(data.csrfToken);
    setUser(data.user);
    setFlash({ type: "success", text });
  }, []);

  const register = useCallback(async (form) => {
    const data = await api("/auth/register", { method: "POST", body: form });
    startSession(data, `Account created. Welcome, ${data.user.name}!`);
  }, [startSession]);

  const login = useCallback(async (form) => {
    const data = await api("/auth/login", { method: "POST", body: form });
    startSession(data, `Welcome back, ${data.user.name}!`);
  }, [startSession]);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // Even if the request fails, forget the user locally.
    }
    clearSession();
    setFlash({ type: "success", text: "You have been logged out." });
  }, [clearSession]);

  const clearFlash = useCallback(() => setFlash(null), []);

  const value = useMemo(
    () => ({ user, loading, flash, register, login, logout, clearFlash }),
    [user, loading, flash, register, login, logout, clearFlash]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = { children: PropTypes.node.isRequired };

export function useAuth() {
  return useContext(AuthContext);
}
