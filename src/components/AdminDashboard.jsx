import { useState, useEffect } from 'react';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('catalog');

    const [parts, setParts] = useState([
        { id: 1, name: 'Główny model auta', category: 'car', tier: 'Free', url: './compressed/Car.glb' },
        { id: 2, name: 'Felgi Sportowe (1)', category: 'rims', tier: 'Free', url: './compressed/Felgi1.glb' },
        { id: 3, name: 'Felgi Klasyczne (2)', category: 'rims', tier: 'Free', url: './compressed/Felgi2.glb' },
        { id: 4, name: 'Opony', category: 'tires', tier: 'Free', url: './compressed/Opony.glb' },
        { id: 5, name: 'Spoiler V1', category: 'spoilers', tier: 'Free', url: './compressed/Spoiler.glb' },
        { id: 6, name: 'Spoiler V2', category: 'spoilers', tier: 'Free', url: './compressed/Spoiler2.glb' },
    ]);

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (activeTab === 'users') {
            setLoading(true);
            fetch('/api/users')
                .then(res => {
                    if (!res.ok) throw new Error('Błąd pobierania użytkowników');
                    return res.json();
                })
                .then(data => {
                    setUsers(data);
                    setLoading(false);
                })
                .catch(err => {
                    setError(err.message);
                    setLoading(false);
                });
        }
    }, [activeTab]);

    return (
        <div className="flex h-screen bg-[#050508] text-white">
            <aside className="w-64 border-r border-slate-800 bg-black/70 p-6 flex flex-col justify-between backdrop-blur-md">
                <div>
                    <h1 className="text-xl font-bold mb-8 text-white tracking-wide">Panel Admina</h1>
                    <nav className="flex flex-col gap-2 text-sm">
                        <button
                            onClick={() => setActiveTab('catalog')}
                            className={`text-left px-4 py-2.5 rounded-lg transition ${activeTab === 'catalog' ? 'bg-white/20 text-white font-medium' : 'hover:bg-white/10 text-slate-300'}`}
                        >
                            Katalog 3D
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`text-left px-4 py-2.5 rounded-lg transition ${activeTab === 'users' ? 'bg-white/20 text-white font-medium' : 'hover:bg-white/10 text-slate-300'}`}
                        >
                            Użytkownicy i Subskrypcje
                        </button>
                    </nav>
                </div>
                <div>
                    <a
                        href="/"
                        className="block text-center bg-white/10 hover:bg-white/20 text-slate-200 py-2.5 rounded-lg text-sm transition"
                    >
                        Wróć do garażu
                    </a>
                </div>
            </aside>

            <main className="flex-1 p-8 overflow-y-auto">
                {activeTab === 'catalog' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold">Katalog Assetów 3D</h2>
                                <p className="text-sm text-slate-400 mt-1">Zarządzaj modelami 3D wykorzystywanymi w konfiguratorze auta.</p>
                            </div>
                            <button className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition backdrop-blur-md">
                                + Wgraj nowy model (.glb)
                            </button>
                        </div>

                        <div className="bg-black/40 rounded-xl border border-slate-800/80 overflow-hidden backdrop-blur-md">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-800 text-slate-400 text-sm">
                                        <th className="p-4">Nazwa części</th>
                                        <th className="p-4">Kategoria</th>
                                        <th className="p-4">Pakiet (Tier)</th>
                                        <th className="p-4">Ścieżka / Plik</th>
                                        <th className="p-4 text-right">Akcje</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parts.map((part) => (
                                        <tr key={part.id} className="border-b border-slate-900/60 hover:bg-white/[0.02] transition">
                                            <td className="p-4 font-medium text-slate-200">{part.name}</td>
                                            <td className="p-4 text-slate-400 capitalize">{part.category}</td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${part.tier === 'VIP' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                                                    {part.tier}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-400 font-mono text-xs">{part.url}</td>
                                            <td className="p-4 text-right">
                                                <button className="text-sky-400 hover:text-sky-300 mr-4 text-sm transition">Edytuj</button>
                                                <button className="text-red-400 hover:text-red-300 text-sm transition">Usuń</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Administracja Użytkownikami</h2>
                        <p className="text-sm text-slate-400 mb-6">Lista zarejestrowanych użytkowników pobrana z bazy danych.</p>

                        {loading && <p className="text-slate-400">Ładowanie użytkowników...</p>}
                        {error && <p className="text-red-400">Błąd: {error}</p>}

                        {!loading && !error && (
                            <div className="bg-black/40 rounded-xl border border-slate-800/80 overflow-hidden backdrop-blur-md">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-800 text-slate-400 text-sm">
                                            <th className="p-4">ID</th>
                                            <th className="p-4">Imię</th>
                                            <th className="p-4">E-mail</th>
                                            <th className="p-4">Data utworzenia</th>
                                            <th className="p-4 text-right">Akcje</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="p-4 text-center text-slate-500">Brak użytkowników w bazie.</td>
                                            </tr>
                                        ) : (
                                            users.map((u) => (
                                                <tr key={u.id} className="border-b border-slate-900/60 hover:bg-white/[0.02] transition">
                                                    <td className="p-4 font-mono text-xs text-slate-400">{u.id}</td>
                                                    <td className="p-4 font-medium text-slate-200">{u.name || 'Brak imienia'}</td>
                                                    <td className="p-4 text-slate-300">{u.email}</td>
                                                    <td className="p-4 text-slate-400 text-xs">{new Date(u.createdAt).toLocaleString()}</td>
                                                    <td className="p-4 text-right">
                                                        <button className="text-sky-400 hover:text-sky-300 text-sm transition">Edytuj</button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}