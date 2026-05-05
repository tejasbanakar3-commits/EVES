import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
} from "react";
import api, { TOKEN_KEY, USER_KEY, setUnauthorizedHandler } from "./api";
import { disconnectSocket } from "./socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    });
    const [token, setTokenState] = useState(() =>
        localStorage.getItem(TOKEN_KEY)
    );

    const persist = useCallback((nextToken, nextUser) => {
        if (nextToken) localStorage.setItem(TOKEN_KEY, nextToken);
        else localStorage.removeItem(TOKEN_KEY);
        if (nextUser)
            localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        else localStorage.removeItem(USER_KEY);
        setTokenState(nextToken || null);
        setUser(nextUser || null);
    }, []);

    const login = useCallback(
        async (email, password) => {
            const res = await api.post("/auth/login", { email, password });
            const { token: t, user: u } = res.data.data;
            persist(t, u);
            return u;
        },
        [persist]
    );

    const register = useCallback(
        async (payload) => {
            const res = await api.post("/auth/register", payload);
            const { token: t, user: u } = res.data.data;
            persist(t, u);
            return u;
        },
        [persist]
    );

    const logout = useCallback(() => {
        persist(null, null);
        disconnectSocket();
    }, [persist]);

    useEffect(() => {
        setUnauthorizedHandler(() => {
            persist(null, null);
            disconnectSocket();
        });
    }, [persist]);

    const value = { user, token, login, register, logout, isAuthenticated: !!token };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
