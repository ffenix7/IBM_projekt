import { useState, useEffect } from 'react';

const CATEGORY_LABELS = {
    paints: 'Lakiery',
    rims: 'Felgi',
    spoilers: 'Spoilery',
};

// { paints: [{value, tier}], rims: [...] } -> [{id, name, category, tier}, ...]
const flattenCatalog = (catalog) =>
    Object.entries(catalog).flatMap(([category, items]) =>
        items.map((item) => ({
            id: `${category}:${item.value}`,
            name: item.value,
            category,
            tier: item.tier,
        }))
    );

const authFetch = (url, options = {}) =>
    fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });

// Safe JSON parsing: a readable error instead of "Unexpected token '<'"
async function readJson(res) {
    const text = await res.text();
    let data = {};
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error(`Serwer zwrócił nie-JSON (${res.status}) - sprawdź czy trasa istnieje i serwer jest zrestartowany.`);
    }
    if (!res.ok) throw new Error(data.error || `Błąd serwera (${res.status})`);
    return data;
}

export default function AdminDashboard() {
    const [authState, setAuthState] = useState('checking'); // 'checking' | 'ok' | 'denied'
    const [activeTab, setActiveTab] = useState('catalog');

    const [parts, setParts] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Edit part
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState('');

    // Delete part
    const [deletingPart, setDeletingPart] = useState(null);
    const [partDeleting, setPartDeleting] = useState(false);
    const [partDeleteError, setPartDeleteError] = useState('');

    // Edit user
    const [editingUser, setEditingUser] = useState(null);
    const [userSaving, setUserSaving] = useState(false);
    const [userEditError, setUserEditError] = useState('');

    // Delete user
    const [deletingUser, setDeletingUser] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    // Admin check: the server decides, not localStorage
    useEffect(() => {
        if (!localStorage.getItem('token')) {
            setAuthState('denied');
            return;
        }

        authFetch('/api/session')
            .then((res) => (res.ok ? res.json() : Promise.reject()))
            .then((data) => setAuthState(data.user.isAdmin ? 'ok' : 'denied'))
            .catch(() => setAuthState('denied'));
    }, []);

    // Not an admin -> back to the garage
    useEffect(() => {
        if (authState === 'denied') window.location.replace('/');
    }, [authState]);

    // Load data only after the admin check passes
    useEffect(() => {
        if (authState !== 'ok') return;

        let cancelled = false;
        setLoading(true);
        setError('');

        const request = activeTab === 'users'
            ? authFetch('/api/users')
                .then(readJson)
                .then((data) => { if (!cancelled) setUsers(data); })
            : authFetch('/api/catalog')
                .then(readJson)
                .then((data) => { if (!cancelled) setParts(flattenCatalog(data)); });

        request
            .catch((err) => { if (!cancelled) setError(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [activeTab, authState]);

    // Parts: edit
    const openEdit = (part) => {
        setEditError('');
        setEditing({
            id: part.id,
            category: part.category,
            originalValue: part.name,
            value: part.name,
            tier: part.tier,
        });
    };

    const saveEdit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setEditError('');

        try {
            const res = await authFetch('/api/catalog/item', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: editing.category,
                    value: editing.originalValue,
                    tier: editing.tier,
                    newValue: editing.value,
                }),
            });
            const data = await readJson(res);

            setParts((current) => current.map((part) =>
                part.id === editing.id
                    ? { ...part, id: `${data.category}:${data.value}`, name: data.value, tier: data.tier }
                    : part
            ));
            setEditing(null);
        } catch (err) {
            setEditError(err.message);
        } finally {
            setSaving(false);
        }
    };

    // Parts: delete
    const confirmDeletePart = async () => {
        setPartDeleting(true);
        setPartDeleteError('');

        try {
            const res = await authFetch('/api/catalog/item', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: deletingPart.category,
                    value: deletingPart.name,
                }),
            });
            await readJson(res);

            setParts((current) => current.filter((part) => part.id !== deletingPart.id));
            setDeletingPart(null);
        } catch (err) {
            setPartDeleteError(err.message);
        } finally {
            setPartDeleting(false);
        }
    };

    // Users: edit
    const openUserEdit = (user) => {
        setUserEditError('');
        setEditingUser({
            id: user.id,
            label: user.name || user.email,
            subscriptionTier: user.subscriptionTier === 'vip' ? 'vip' : 'free',
        });
    };

    const saveUserEdit = async (event) => {
        event.preventDefault();
        setUserSaving(true);
        setUserEditError('');

        try {
            const res = await authFetch(`/api/users/${editingUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscriptionTier: editingUser.subscriptionTier }),
            });
            const data = await readJson(res);

            setUsers((current) => current.map((user) =>
                user.id === data.id ? { ...user, subscriptionTier: data.subscriptionTier } : user
            ));
            setEditingUser(null);
        } catch (err) {
            setUserEditError(err.message);
        } finally {
            setUserSaving(false);
        }
    };

    // Users: delete
    const confirmDeleteUser = async () => {
        setDeleting(true);
        setDeleteError('');

        try {
            const res = await authFetch(`/api/users/${deletingUser.id}`, { method: 'DELETE' });
            const data = await readJson(res);

            setUsers((current) => current.filter((user) => user.id !== data.id));
            setDeletingUser(null);
        } catch (err) {
            setDeleteError(err.message);
        } finally {
            setDeleting(false);
        }
    };

    // All hooks are above this line
    if (authState !== 'ok') {
        return (
            <div className="flex h-screen items-center justify-center bg-[#050508] text-slate-400">
                {authState === 'checking' ? 'Sprawdzanie uprawnień...' : 'Przekierowanie...'}
            </div>
        );
    }

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
                                    {loading && (
                                        <tr><td colSpan="5" className="p-4 text-center text-slate-500">Ładowanie katalogu...</td></tr>
                                    )}
                                    {error && (
                                        <tr><td colSpan="5" className="p-4 text-center text-red-400">Błąd: {error}</td></tr>
                                    )}
                                    {!loading && !error && parts.map((part) => (
                                        <tr key={part.id} className="border-b border-slate-900/60 hover:bg-white/[0.02] transition">
                                            <td className="p-4 font-medium text-slate-200">
                                                <div className="flex items-center gap-3">
                                                    {part.category === 'paints' && (
                                                        <span
                                                            className="h-5 w-5 rounded-full border border-white/20"
                                                            style={{ backgroundColor: part.name }}
                                                        />
                                                    )}
                                                    {part.name}
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-400">{CATEGORY_LABELS[part.category] ?? part.category}</td>
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${part.tier === 'vip' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                                                    {part.tier.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-400 font-mono text-xs">—</td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => openEdit(part)}
                                                    className="text-sky-400 hover:text-sky-300 mr-4 text-sm transition"
                                                >
                                                    Edytuj
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setPartDeleteError('');
                                                        setDeletingPart(part);
                                                    }}
                                                    className="text-red-400 hover:text-red-300 text-sm transition"
                                                >
                                                    Usuń
                                                </button>
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
                                            <th className="p-4">Subskrypcja</th>
                                            <th className="p-4">Data utworzenia</th>
                                            <th className="p-4 text-right">Akcje</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="p-4 text-center text-slate-500">Brak użytkowników w bazie.</td>
                                            </tr>
                                        ) : (
                                            users.map((u) => (
                                                <tr key={u.id} className="border-b border-slate-900/60 hover:bg-white/[0.02] transition">
                                                    <td className="p-4 font-mono text-xs text-slate-400">{u.id}</td>
                                                    <td className="p-4 font-medium text-slate-200">{u.name || 'Brak imienia'}</td>
                                                    <td className="p-4 text-slate-300">{u.email}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${u.subscriptionTier === 'vip'
                                                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                            }`}>
                                                            {u.subscriptionTier === 'vip' ? 'VIP' : 'FREE'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-slate-400 text-xs">{new Date(u.createdAt).toLocaleString()}</td>
                                                    <td className="p-4 text-right">
                                                        <button
                                                            onClick={() => openUserEdit(u)}
                                                            className="text-sky-400 hover:text-sky-300 mr-4 text-sm transition"
                                                        >
                                                            Edytuj
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setDeleteError('');
                                                                setDeletingUser(u);
                                                            }}
                                                            className="text-red-400 hover:text-red-300 text-sm transition"
                                                        >
                                                            Usuń
                                                        </button>
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

            {/* Edit part */}
            {editing && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={() => setEditing(null)}
                >
                    <form
                        onSubmit={saveEdit}
                        onClick={(event) => event.stopPropagation()}
                        className="w-96 rounded-2xl border border-slate-800 bg-[#0b0b12] p-6 shadow-xl"
                    >
                        <h3 className="mb-1 text-lg font-bold">Edytuj element</h3>
                        <p className="mb-5 font-mono text-xs text-slate-400">
                            {CATEGORY_LABELS[editing.category] ?? editing.category} · {editing.originalValue}
                        </p>

                        <label className="mb-4 block text-sm text-slate-300">
                            Pakiet (Tier)
                            <select
                                value={editing.tier}
                                onChange={(event) => setEditing({ ...editing, tier: event.target.value })}
                                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-sky-400"
                            >
                                <option value="free" className="bg-slate-900">FREE</option>
                                <option value="vip" className="bg-slate-900">VIP</option>
                            </select>
                        </label>

                        {editing.category === 'paints' && (
                            <label className="mb-4 block text-sm text-slate-300">
                                Kolor
                                <div className="mt-1 flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={editing.value}
                                        onChange={(event) => setEditing({ ...editing, value: event.target.value })}
                                        className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0.5"
                                    />
                                    <span className="font-mono text-sm text-slate-400">{editing.value}</span>
                                </div>
                            </label>
                        )}

                        {editError && <p className="mb-3 text-sm text-red-400">{editError}</p>}

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setEditing(null)}
                                className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
                            >
                                Anuluj
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="rounded-lg bg-sky-600 px-4 py-2 text-sm hover:bg-sky-500 disabled:opacity-50"
                            >
                                {saving ? 'Zapisywanie...' : 'Zapisz'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Delete part */}
            {deletingPart && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={() => !partDeleting && setDeletingPart(null)}
                >
                    <div
                        onClick={(event) => event.stopPropagation()}
                        className="w-96 rounded-2xl border border-slate-800 bg-[#0b0b12] p-6 shadow-xl"
                    >
                        <h3 className="mb-2 text-lg font-bold">Usuń element</h3>
                        <p className="mb-1 flex items-center gap-2 text-sm text-slate-300">
                            Czy na pewno chcesz usunąć
                            {deletingPart.category === 'paints' && (
                                <span
                                    className="h-4 w-4 rounded-full border border-white/20"
                                    style={{ backgroundColor: deletingPart.name }}
                                />
                            )}
                            <span className="font-semibold text-white">{deletingPart.name}</span>?
                        </p>
                        <p className="mb-5 text-xs text-slate-400">
                            {CATEGORY_LABELS[deletingPart.category] ?? deletingPart.category} · {deletingPart.tier.toUpperCase()}
                            {' '}· element zniknie z katalogu konfiguratora. Tej operacji nie można cofnąć.
                        </p>

                        {partDeleteError && <p className="mb-3 text-sm text-red-400">{partDeleteError}</p>}

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDeletingPart(null)}
                                disabled={partDeleting}
                                className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20 disabled:opacity-50"
                            >
                                Anuluj
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeletePart}
                                disabled={partDeleting}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm hover:bg-red-500 disabled:opacity-50"
                            >
                                {partDeleting ? 'Usuwanie...' : 'Usuń'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit user */}
            {editingUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={() => setEditingUser(null)}
                >
                    <form
                        onSubmit={saveUserEdit}
                        onClick={(event) => event.stopPropagation()}
                        className="w-96 rounded-2xl border border-slate-800 bg-[#0b0b12] p-6 shadow-xl"
                    >
                        <h3 className="mb-1 text-lg font-bold">Edytuj subskrypcję</h3>
                        <p className="mb-5 text-xs text-slate-400">{editingUser.label}</p>

                        <label className="mb-4 block text-sm text-slate-300">
                            Subskrypcja
                            <select
                                value={editingUser.subscriptionTier}
                                onChange={(event) => setEditingUser({ ...editingUser, subscriptionTier: event.target.value })}
                                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-sky-400"
                            >
                                <option value="free" className="bg-slate-900">FREE</option>
                                <option value="vip" className="bg-slate-900">VIP</option>
                            </select>
                        </label>

                        {userEditError && <p className="mb-3 text-sm text-red-400">{userEditError}</p>}

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setEditingUser(null)}
                                className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
                            >
                                Anuluj
                            </button>
                            <button
                                type="submit"
                                disabled={userSaving}
                                className="rounded-lg bg-sky-600 px-4 py-2 text-sm hover:bg-sky-500 disabled:opacity-50"
                            >
                                {userSaving ? 'Zapisywanie...' : 'Zapisz'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Delete user */}
            {deletingUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={() => !deleting && setDeletingUser(null)}
                >
                    <div
                        onClick={(event) => event.stopPropagation()}
                        className="w-96 rounded-2xl border border-slate-800 bg-[#0b0b12] p-6 shadow-xl"
                    >
                        <h3 className="mb-2 text-lg font-bold">Usuń użytkownika</h3>
                        <p className="mb-1 text-sm text-slate-300">
                            Czy na pewno chcesz usunąć konto{' '}
                            <span className="font-semibold text-white">
                                {deletingUser.name || deletingUser.email}
                            </span>
                            ?
                        </p>
                        <p className="mb-5 text-xs text-slate-400">
                            {deletingUser.email} · wraz z kontem zostaną usunięte zapisane buildy. Tej operacji nie można cofnąć.
                        </p>

                        {deleteError && <p className="mb-3 text-sm text-red-400">{deleteError}</p>}

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDeletingUser(null)}
                                disabled={deleting}
                                className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20 disabled:opacity-50"
                            >
                                Anuluj
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteUser}
                                disabled={deleting}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm hover:bg-red-500 disabled:opacity-50"
                            >
                                {deleting ? 'Usuwanie...' : 'Usuń'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}