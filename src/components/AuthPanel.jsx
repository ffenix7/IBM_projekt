import { useState } from 'react';
import { createPortal } from 'react-dom';

const API_BASE_URL = import.meta.env.PROD
    ? 'https://ibm-projekt-backend.onrender.com'
    : '';

export function storedUser() {
    try {
        const value = localStorage.getItem('user');
        return value ? JSON.parse(value) : null;
    } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        return null;
    }
}

async function responseData(res) {
    const text = await res.text();
    let data = {};
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = { error: text };
        }
    }

    if (!res.ok) {
        if (res.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.dispatchEvent(new Event('auth-changed'));
        }
        throw new Error(data.error || `Błąd serwera (${res.status})`);
    }
    return data;
}

export async function post(url, body) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });
    return responseData(res);
}

export async function get(url) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}${url}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return responseData(res);
}

export function AuthPanel({ embedded = false }) {
    const [user, setUser] = useState(storedUser);
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState('login');
    const [form, setForm] = useState({ email: '', password: '', name: '' });
    const [error, setError] = useState('');

    const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        try {
            const data = await post(`/api/${mode}`, form);
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
            setError('');
            setIsOpen(false);
            window.dispatchEvent(new Event('auth-changed'));
        } catch (err) {
            setError(err.message);
        }
    };

    const logout = async () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        window.dispatchEvent(new Event('auth-changed'));
    };

    if (user) {
        return (
            <div className={`rounded-lg bg-slate-900 p-2 text-white ${embedded ? '' : 'absolute right-4 top-16 z-20'}`}>
                <span>{user.name || user.email} {user.subscriptionTier === 'vip' && <strong className="text-amber-300">VIP</strong>}</span><br/>
                <button type="button" onClick={logout} className="text-white/70 hover:text-white cursor-pointer">Wyloguj</button>
            </div>
        );
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={`${embedded ? 'w-full' : 'absolute right-4 top-16 z-20'} rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700`}
            >
                Zaloguj się
            </button>

            {isOpen && createPortal(
                <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <form onSubmit={submit} className="relative flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            aria-label="Zamknij"
                            className="absolute right-4 top-3 text-2xl leading-none text-white/50 transition hover:text-white"
                        >
                            ×
                        </button>
                        <div className="pr-8">
                            <h2 className="text-xl font-semibold">{mode === 'login' ? 'Zaloguj się' : 'Utwórz konto'}</h2>
                            <p className="mt-1 text-sm text-white/60">
                                {mode === 'login' ? 'Wróć do swojego garażu.' : 'Zapisuj i modyfikuj swoje buildy.'}
                            </p>
                        </div>
                        {mode === 'register' && (
                            <label className="flex flex-col gap-1.5 text-sm">
                                Imię
                                <input name="name" placeholder="Twoje imię" onChange={change} className="rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-white outline-none transition placeholder:text-white/40 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20" />
                            </label>
                        )}
                        <label className="flex flex-col gap-1.5 text-sm">
                            E-mail
                            <input name="email" type="email" placeholder="ty@example.com" required onChange={change} className="rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-white outline-none transition placeholder:text-white/40 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20" />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm">
                            Hasło
                            <input name="password" type="password" placeholder="Wpisz hasło" required onChange={change} className="rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-white outline-none transition placeholder:text-white/40 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20" />
                        </label>
                        {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
                        <button type="submit" className="rounded-lg bg-sky-600 px-3 py-2.5 font-medium text-white transition hover:bg-sky-500">
                            {mode === 'login' ? 'Zaloguj' : 'Zarejestruj'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                            className="text-sm text-white/60 transition hover:text-white"
                        >
                            {mode === 'login' ? 'Nie masz konta? Zarejestruj się' : 'Masz konto? Zaloguj się'}
                        </button>
                    </form>
                </div>,
                document.body
            )}
        </>
    );
}