import { useEffect, useRef, useState } from 'react';
import { AuthPanel, get, storedUser } from './AuthPanel';

// Ścieżka do garażu 3D (dostosuj do swojego routingu)
const GARAGE_HREF = '/garage';

const FEATURES = [
    {
        title: 'Personalizacja 3D',
        text: 'Zmieniaj lakier, felgi, opony, spoiler i tablicę rejestracyjną i oglądaj efekt na żywo.',
    },
    {
        title: 'Zapisane buildy',
        text: 'Trzy sloty na Twoje konfiguracje, dostępne po zalogowaniu z każdego urządzenia.',
    },
    {
        title: 'Pakiet VIP',
        text: 'Dodatkowe felgi i elementy dostępne dla subskrybentów.',
    },
];

export default function MainMenu() {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('token')));
    const [user, setUser] = useState(() => storedUser());
    const menuRef = useRef(null);

    // Aktualizacja po zalogowaniu lub wylogowaniu w AuthPanel
    useEffect(() => {
        const handleAuthChanged = () => {
            setIsAuthenticated(Boolean(localStorage.getItem('token')));
            setUser(storedUser());
        };
        window.addEventListener('auth-changed', handleAuthChanged);
        return () => window.removeEventListener('auth-changed', handleAuthChanged);
    }, []);

    // Odświeżenie użytkownika z serwera przy otwarciu menu (isAdmin, subskrypcja)
    useEffect(() => {
        if (!isSettingsOpen || !localStorage.getItem('token')) return;

        get('/api/session')
            .then((result) => {
                localStorage.setItem('user', JSON.stringify(result.user));
                setUser(result.user);
            })
            .catch((error) => console.error('Nie udało się odświeżyć sesji:', error.message));
    }, [isSettingsOpen]);

    // Zamknięcie menu po kliknięciu poza nim
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
            {/* Jedyny gradient: delikatny blask u góry strony */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(14,165,233,0.22),transparent)]" />

            {/* Górny pasek: tylko przycisk ustawień po prawej */}
            <header className="relative z-20 flex justify-end px-6 py-4">
                <div ref={menuRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setIsSettingsOpen((current) => !current)}
                        aria-label="Ustawienia"
                        aria-expanded={isSettingsOpen}
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-800 bg-black/40 text-white transition hover:border-slate-600 hover:bg-white/10"
                    >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.3 2.8h3.4l.5 2.1a7.7 7.7 0 0 1 1.6.9l2-.8 1.7 2.9-1.6 1.5c.1.6.2 1.1.2 1.7s-.1 1.1-.2 1.7l1.6 1.5-1.7 2.9-2-.8a7.7 7.7 0 0 1-1.6.9l-.5 2.1h-3.4l-.5-2.1a7.7 7.7 0 0 1-1.6-.9l-2 .8-1.7-2.9 1.6-1.5a7.7 7.7 0 0 1-.2-1.7c0-.6.1-1.1.2-1.7L4.5 7.9l1.7-2.9 2 .8a7.7 7.7 0 0 1 1.6-.9l.5-2.1Z" />
                            <circle cx="12" cy="11.1" r="2.7" />
                        </svg>
                    </button>

                    {isSettingsOpen && (
                        <div className="absolute right-0 z-20 mt-2 flex w-56 flex-col gap-3 rounded-xl border border-slate-800 bg-[#0b0b12] p-3 text-white shadow-xl">
                            <AuthPanel embedded />
                            {isAuthenticated && user?.isAdmin && (
                                <a
                                    href="/admin"
                                    className="rounded-lg bg-white/10 px-3 py-2 text-center text-sm transition hover:bg-white/20"
                                >
                                    Panel Admina
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </header>

            {/* Treść */}
            <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                <p className="mb-4 text-sm font-medium uppercase tracking-[0.25em] text-sky-400">
                    Konfigurator samochodów 3D
                </p>

                <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">Torque Garage</h1>

                <p className="mt-6 max-w-xl text-lg text-slate-400">
                    Zbuduj swoje auto w wirtualnym garażu. Wybierz lakier, felgi i spoiler,
                    obejrzyj je z każdej strony i zapisz projekt.
                </p>

                <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                    <a
                        href={GARAGE_HREF}
                        className="rounded-lg bg-sky-600 px-8 py-3 text-sm font-medium transition hover:bg-sky-500"
                    >
                        Wejdź do garażu
                    </a>
                    {!isAuthenticated && (
                        <button
                            type="button"
                            onClick={() => setIsSettingsOpen(true)}
                            className="rounded-lg border border-slate-700 px-8 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/5"
                        >
                            Zaloguj się
                        </button>
                    )}
                </div>

                {isAuthenticated && displayName && (
                    <p className="mt-6 text-sm text-slate-400">
                        Zalogowano jako <span className="text-slate-200">{displayName}</span>
                        {user?.subscriptionTier === 'vip' && (
                            <span className="ml-2 rounded-md border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
                                VIP
                            </span>
                        )}
                    </p>
                )}

                {/* Funkcje */}
                <div className="mt-20 grid w-full gap-10 border-t border-slate-800 pt-10 sm:grid-cols-3">
                    {FEATURES.map((feature, index) => (
                        <div key={feature.title} className="mx-auto max-w-xs">
                            <p className="mb-2 font-mono text-xs text-slate-500">
                                {String(index + 1).padStart(2, '0')}
                            </p>
                            <h3 className="mb-2 font-semibold text-slate-100">{feature.title}</h3>
                            <p className="text-sm leading-relaxed text-slate-400">{feature.text}</p>
                        </div>
                    ))}
                </div>
            </main>

            <footer className="relative z-10 border-t border-slate-800 px-6 py-4 text-center text-xs text-slate-600">
                © {new Date().getFullYear()} Torque Garage
            </footer>
        </div>
    );
}