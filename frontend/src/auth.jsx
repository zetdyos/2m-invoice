import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setToken, getToken, setUnauthorizedHandler } from "./api.js";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => { setToken(null); setUser(null); }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => { setToken(null); setUser(null); });
    (async () => {
      if (getToken()) {
        try { setUser(await api.get("/auth/me")); } catch { setToken(null); }
      }
      setReady(true);
    })();
  }, []);

  async function login(username, password) {
    const data = await api.post("/auth/login", { username, password });
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }

  return (
    <AuthCtx.Provider value={{ user, setUser, ready, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() { return useContext(AuthCtx); }
