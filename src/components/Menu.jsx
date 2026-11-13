import { useEffect, useRef, useState } from 'react';
import { AuthPanel, get, storedUser } from './AuthPanel';

const GARAGE_HREF = '/garage';

const FEATURES = [
    {
        title: 'Personalizacja 3D',
        text: 'Zmieniaj lakier, felgi, opony, spoiler i tablicę rejestracyjną i oglądaj efekt na żywo.',
        color: 'bg-sky-400',
    },
    {
        title: 'Zapisane buildy',
        text: 'Trzy sloty na Twoje konfiguracje. Wróć do nich z dowolnego miejsca po zalogowaniu.',
        color: 'bg-rose-500',
    },
    {
        title: 'Pakiet VIP',
        text: 'Ekskluzywne felgi i dodatki dla subskrybentów. Wyróżnij swoje auto.',
        color: 'bg-amber-400',
    },
];

export default function MainMenu() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('token')));
    const [user, setUser] = useState(() => storedUser());
    const menuRef = useRef(null);

    // Update when someone logs in or out in AuthPanel
    useEffect(() => {
        const handleAuthChanged = () => {
            setIsAuthenticated(Boolean(localStorage.getItem('token')));
            setUser(storedUser());
        };
        window.addEventListener('auth-changed', handleAuthChanged);
        return () => window.removeEventListener('auth-changed', handleAuthChanged);
    }, []);

    // Refresh the user from the server when the menu opens (picks up isAdmin / tier changes)
    useEffect(() => {
        if (!isSettingsOpen || !localStorage.getItem('token')) return;

        get('/api/session')
            .then((result) => {
                localStorage.setItem('user', JSON.stringify(result.user));
                setUser(result.user);
            })
            .catch((error) => console.error('Nie udało się odświeżyć sesji:', error.message));
    }, [isSettingsOpen]);

    // Close the dropdown on an outside click
    useEffect(() => {
        if (!isSettingsOpen) return;

        const handleClick = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsSettingsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isSettingsOpen]);

    const displayName = user?.name || user?.email;

    return (
        <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#050508] text-white">
            {/* Background glows (the same colors as the garage lights) */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
                <div className="absolute -right-40 top-20 h-96 w-96 rounded-full bg-rose-500/20 blur-3xl" />
                <div className="absolute bottom-0 left-1/2 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-purple-600/20 blur-3xl" />
                <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl" />
            </div>

            {/* Top bar */}
            <header className="relative z-20 flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-sm font-bold tracking-wider backdrop-blur-md">
                        TG
                    </div>
                    <span className="hidden text-sm font-semibold uppercase tracking-[0.3em] text-white/70 sm:block">
                        Torque Garage
                    </span>
                </div>

                <div ref={menuRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setIsSettingsOpen((current) => !current)}
                        aria-label="Ustawienia"
                        aria-expanded={isSettingsOpen}
                        className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-white shadow-lg backdrop-blur-md transition hover:border-white/30 hover:bg-white/10"
                    >
                        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.3 2.8h3.4l.5 2.1a7.7 7.7 0 0 1 1.6.9l2-.8 1.7 2.9-1.6 1.5c.1.6.2 1.1.2 1.7s-.1 1.1-.2 1.7l1.6 1.5-1.7 2.9-2-.8a7.7 7.7 0 0 1-1.6.9l-.5 2.1h-3.4l-.5-2.1a7.7 7.7 0 0 1-1.6-.9l-2 .8-1.7-2.9 1.6-1.5a7.7 7.7 0 0 1-.2-1.7c0-.6.1-1.1.2-1.7L4.5 7.9l1.7-2.9 2 .8a7.7 7.7 0 0 1 1.6-.9l.5-2.1Z" />
                            <circle cx="12" cy="11.1" r="2.7" />
                        </svg>
                    </button>

                    {isSettingsOpen && (
                        <div className="absolute right-0 mt-2 flex w-56 flex-col gap-3 rounded-2xl border border-white/10 bg-black/75 p-3 text-white shadow-xl backdrop-blur-md">
                            <AuthPanel embedded />
                            {isAuthenticated && user?.isAdmin && (
                                <a
                                    href="/admin"
                                    className="rounded-lg bg-slate-900 px-3 py-2 text-center text-sm hover:bg-slate-700"
                                >
                                    Panel Admina
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </header>

            {/* Hero */}
            <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                <p className="mb-4 rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-sky-300 backdrop-blur-md">
                    Konfigurator samochodów 3D
                </p>

                <h1 className="text-5xl font-extrabold uppercase tracking-[0.15em] sm:text-7xl">
                    Torque
                    <span className="bg-gradient-to-r from-sky-400 via-purple-500 to-rose-500 bg-clip-text text-transparent">
                        {' '}Garage
                    </span>
                </h1>

                <p className="mt-6 max-w-xl text-base text-slate-400 sm:text-lg">
                    Zbuduj swoje wymarzone auto w wirtualnym garażu. Wybierz lakier, felgi i spoiler,
                    obejrzyj je z każdej strony i zapisz swój projekt.
                </p>

                <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
                    <a
                        href={GARAGE_HREF}
                        className="rounded-xl bg-sky-600 px-8 py-3 text-sm font-semibold uppercase tracking-wider shadow-lg shadow-sky-900/40 transition hover:bg-sky-500"
                    >
                        Wejdź do garażu
                    </a>
                    {!isAuthenticated && (
                        <button
                            type="button"
                            onClick={() => setIsSettingsOpen(true)}
                            className="rounded-xl border border-white/10 bg-white/10 px-8 py-3 text-sm font-semibold uppercase tracking-wider backdrop-blur-md transition hover:bg-white/20"
                        >
                            Zaloguj się
                        </button>
                    )}
                </div>

                {isAuthenticated && displayName && (
                    <p className="mt-6 text-sm text-slate-400">
                        Zalogowano jako <span className="text-white">{displayName}</span>
                        {user?.subscriptionTier === 'vip' && (
                            <span className="ml-2 rounded-md border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
                                VIP
                            </span>
                        )}
                    </p>
                )}

                {/* Features */}
                <div className="mt-16 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
                    {FEATURES.map((feature) => (
                        <div
                            key={feature.title}
                            className="rounded-2xl border border-slate-800/80 bg-black/40 p-5 text-left backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.04]"
                        >
                            <span className={`mb-4 block h-2 w-10 rounded-full ${feature.color}`} />
                            <h3 className="mb-2 text-base font-semibold text-slate-100">{feature.title}</h3>
                            <p className="text-sm leading-relaxed text-slate-400">{feature.text}</p>
                        </div>
                    ))}
                </div>
            </main>

            <footer className="relative z-10 px-6 py-4 text-center text-xs text-slate-600">
                © {new Date().getFullYear()} Torque Garage
            </footer>
        </div>
    );
}