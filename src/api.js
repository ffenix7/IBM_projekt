export const API_BASE_URL = import.meta.env.VITE_API_URL
    || (import.meta.env.PROD ? 'https://ibm-projekt-backend.onrender.com' : '');

export function apiUrl(path) {
    return `${API_BASE_URL}${path}`;
}

export function authHeaders(headers = {}) {
    const token = localStorage.getItem('token');
    return {
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

export function authFetch(path, options = {}) {
    return fetch(apiUrl(path), {
        ...options,
        headers: authHeaders(options.headers),
    });
}
