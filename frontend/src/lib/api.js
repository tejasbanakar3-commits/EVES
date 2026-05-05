import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API_BASE = `${BACKEND_URL}/api`;
export const WS_BASE = BACKEND_URL;

export const TOKEN_KEY = "eves_token";
export const USER_KEY = "eves_user";

const api = axios.create({
    baseURL: API_BASE,
    timeout: 20000,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
    onUnauthorized = fn;
}

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err?.response?.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            if (onUnauthorized) onUnauthorized();
        }
        return Promise.reject(err);
    }
);

export function extractError(err, fallback = "Something went wrong") {
    const data = err?.response?.data;
    if (data?.error?.message) {
        try {
            const parsed = JSON.parse(data.error.message);
            if (parsed?.message) return parsed.message;
        } catch {
            /* not JSON */
        }
        return data.error.message;
    }
    return err?.message || fallback;
}

export default api;
