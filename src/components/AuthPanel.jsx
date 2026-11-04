import { useState } from 'react';

export async function post(url, body) {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(data.error || `Błąd serwera (${res.status})`);
    return data;
}

export async function get(url) {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(data.error || `Błąd serwera (${res.status})`);
    return data;
}

export function AuthPanel({ embedded = false }) {
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')));
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
        localStorage.clear();
        setUser(null);
        window.dispatchEvent(new Event('auth-changed'));
    };

    if (user) {
        return (
            <div className={`rounded-lg bg-slate-900 p-2 text-white ${embedded ? '' : 'absolute right-4 top-16 z-20'}`}>
                <span>{user.name || user.email}</span><br/>
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

            {isOpen && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60">
                    <form onSubmit={submit} className="relative flex w-80 flex-col gap-3 rounded-lg bg-white p-6">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="absolute right-3 top-2 text-2xl text-slate-500"
                        >
                            ×
                        </button>
                        <h2 className="text-xl font-bold">{mode === 'login' ? 'Logowanie' : 'Rejestracja'}</h2>
                        {mode === 'register' && (
                            <input name="name" placeholder="Imię" onChange={change} className="border p-2" />
                        )}
                        <input name="email" type="email" placeholder="E-mail" required onChange={change} className="border p-2" />
                        <input name="password" type="password" placeholder="Hasło" required onChange={change} className="border p-2" />
                        {error && <p className="text-red-600">{error}</p>}
                        <button type="submit" className="bg-slate-900 p-2 text-white">
                            {mode === 'login' ? 'Zaloguj' : 'Zarejestruj'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                            className="underline"
                        >
                            {mode === 'login' ? 'Nie masz konta? Zarejestruj się' : 'Masz konto? Zaloguj się'}
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}