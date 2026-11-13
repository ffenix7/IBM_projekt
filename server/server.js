import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sequelize, Users } from './db.js';
import fs from 'node:fs/promises';

const app = express();
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-me';
const BUILD_SLOT_COUNT = 3;
const CATALOG = {
    paints: [
        { value: '#ffffff', tier: 'free' },
        { value: '#101211', tier: 'free' },
        { value: '#8a8d91', tier: 'free' },
        { value: '#c0210c', tier: 'free' },
        { value: '#f97316', tier: 'free' },
        { value: '#facc15', tier: 'free' },
        { value: '#00c946', tier: 'free' },
        { value: '#1091b1', tier: 'free' },
        { value: '#176193', tier: 'free' },
        { value: '#6d28d9', tier: 'free' },
        { value: '#db2777', tier: 'free' },
    ],
    rims: [
        { value: 'Felgi1', tier: 'free' },
        { value: 'Felgi2', tier: 'vip' },
    ],
    spoilers: [
        { value: 'Spoiler1', tier: 'free' },
        { value: 'Spoiler2', tier: 'free' },
    ]
};

const CATALOG_FILE = new URL('catalog.json', import.meta.url);
const TIERS = ['free', 'vip'];

try {
    Object.assign(CATALOG, JSON.parse(await fs.readFile(CATALOG_FILE, 'utf-8')));
    console.log('Wczytano katalog z catalog.json');
} catch (err) {
    if (err.code === 'ENOENT') {
        console.warn('Brak pliku catalog.json - używam domyślnego katalogu z server.js.');
    } else {
        console.warn(`Nie udało się wczytać catalog.json (${err.message}) - używam domyślnego katalogu.`);
    }
}

const saveCatalog = () => fs.writeFile(CATALOG_FILE, JSON.stringify(CATALOG, null, 2));


function createToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email, name: user.name, subscriptionTier: user.subscriptionTier },
        JWT_SECRET,
        { expiresIn: '1h' },
    );
}

function hasVipAccess(subscriptionTier) {
    return String(subscriptionTier || '').trim().toLowerCase() === 'vip';
}

async function requireAuth(req, res, next) {
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : null;

    if (!token) {
        return res.status(401).json({ error: 'Wymagane logowanie.' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const user = await Users.findByPk(payload.sub);
        if (!user) {
            return res.status(401).json({ error: 'Użytkownik nie istnieje.' });
        }
        req.userId = user.id;
        req.user = user;
        next();
    } catch {
        return res.status(401).json({ error: 'Nieprawidłowy lub wygasły token.' });
    }
}

function requireAdmin(req, res, next) {
    if (!req.user?.isAdmin) {
        return res.status(404).json({ error: 'Brak uprawnień administratora.' });
    }
    next();
}

app.post('/api/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password || password.length < 6) {
            return res.status(400).json({ error: 'Podaj e-mail i hasło (min. 6 znaków).' });
        }
        const exists = await Users.findOne({ where: { email } });
        if (exists) return res.status(409).json({ error: 'Taki e-mail już istnieje.' });

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await Users.create({
            email,
            passwordHash,
            name: name || null,
            build_slots: [],
        });
        const token = createToken(user);
        res.json({
            token,
            user: {
                id: user.id,
                email,
                name: user.name,
                subscriptionTier: user.subscriptionTier,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await Users.findOne({ where: { email } });

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ error: 'Nieprawidłowy e-mail lub hasło.' });
        }

        const token = createToken(user);
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                subscriptionTier: user.subscriptionTier,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/catalog', (req, res) => {
    res.json(CATALOG);
});

app.patch('/api/catalog/item', requireAdmin, async (req, res) => {
    try {
        const { category, value, tier, newValue } = req.body;

        const items = CATALOG[category];
        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Nieznana kategoria.' });
        }

        const item = items.find((entry) => entry.value === value);
        if (!item) {
            return res.status(404).json({ error: 'Nie znaleziono elementu.' });
        }

        if (tier !== undefined) {
            if (!TIERS.includes(tier)) {
                return res.status(400).json({ error: 'Tier musi być "free" lub "vip".' });
            }
            item.tier = tier;
        }

        if (newValue !== undefined && newValue.toLowerCase() !== item.value) {
            if (category !== 'paints') {
                return res.status(400).json({ error: 'Nazwę można zmienić tylko dla lakierów.' });
            }
            if (!/^#[0-9a-f]{6}$/i.test(newValue)) {
                return res.status(400).json({ error: 'Kolor musi mieć format #rrggbb.' });
            }
            const color = newValue.toLowerCase();
            if (items.some((entry) => entry.value === color)) {
                return res.status(409).json({ error: 'Taki kolor już istnieje w katalogu.' });
            }
            item.value = color;
        }

        await saveCatalog();
        res.json({ category, value: item.value, tier: item.tier });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Nie udało się zapisać katalogu.' });
    }
});

app.delete('/api/catalog/item', requireAdmin, async (req, res) => {
    try {
        const { category, value } = req.body;

        const items = CATALOG[category];
        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Nieznana kategoria.' });
        }

        const index = items.findIndex((entry) => entry.value === value);
        if (index === -1) {
            return res.status(404).json({ error: 'Nie znaleziono elementu.' });
        }

        if (items.length === 1) {
            return res.status(400).json({ error: 'Kategoria musi zawierać co najmniej jeden element.' });
        }

        items.splice(index, 1);
        await saveCatalog();
        res.json({ ok: true, category, value });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Nie udało się usunąć elementu.' });
    }
});

app.patch('/api/users/:id', requireAdmin, async (req, res) => {
    try {
        const { subscriptionTier } = req.body;

        if (!TIERS.includes(subscriptionTier)) {
            return res.status(400).json({ error: 'Tier musi być "free" lub "vip".' });
        }

        const user = await Users.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Nie znaleziono użytkownika.' });
        }
        if (user.isAdmin) {
            return res.status(403).json({ error: 'Nie można modyfikować administratora.' });
        }

        await user.update({ subscriptionTier });
        res.json({ id: user.id, subscriptionTier: user.subscriptionTier });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Nie udało się zaktualizować użytkownika.' });
    }
});

app.delete('/api/users/:id', requireAdmin, async (req, res) => {
    try {
        const user = await Users.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'Nie znaleziono użytkownika.' });
        }
        if (user.isAdmin) {
            return res.status(403).json({ error: 'Nie można modyfikować administratora.' });
        }

        await user.destroy();
        res.json({ ok: true, id: user.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Nie udało się usunąć użytkownika.' });
    }
});

app.get('/api/session', requireAuth, (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            email: req.user.email,
            name: req.user.name,
            subscriptionTier: req.user.subscriptionTier,
            isAdmin: req.user.isAdmin
        },
    });
});

app.post('/api/logout', (req, res) => {
    res.json({ ok: true });
});

function parseSlot(value) {
    const slot = Number(value);
    return Number.isInteger(slot) && slot >= 1 && slot <= BUILD_SLOT_COUNT ? slot : null;
}

app.get('/api/builds', requireAuth, async (req, res) => {
    try {
        const user = req.user;

        const slots = Array.isArray(user.build_slots) ? user.build_slots : [];
        return res.json({
            slots: Array.from({ length: BUILD_SLOT_COUNT }, (_, index) => {
                const slot = slots.find((item) => item.slot === index + 1);
                return {
                    slot: index + 1,
                    updatedAt: slot?.updatedAt || null,
                    hasBuild: Boolean(slot),
                };
            }),
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Nie udało się pobrać slotów buildów.' });
    }
});

app.get('/api/builds/:slot', requireAuth, async (req, res) => {
    const slotNumber = parseSlot(req.params.slot);
    if (!slotNumber) {
        return res.status(400).json({ error: 'Slot musi mieć wartość od 1 do 3.' });
    }

    try {
        const user = req.user;

        const slot = (Array.isArray(user.build_slots) ? user.build_slots : [])
            .find((item) => item.slot === slotNumber);
        return res.json({ slot: slotNumber, config: slot?.config || null });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Nie udało się pobrać buildu.' });
    }
});

app.post('/api/saveBuild', requireAuth, async (req, res) => {
    const slotNumber = parseSlot(req.body.slot);
    if (!slotNumber || !req.body.config || typeof req.body.config !== 'object') {
        return res.status(400).json({ error: 'Podaj poprawny slot i konfigurację buildu.' });
    }

    try {
        const user = req.user;

        const selectedRim = req.body.config.rim || req.body.config.tire;

        const rim = CATALOG.rims.find((item) => item.value === selectedRim);
        const spoiler = CATALOG.spoilers.find((item) => item.value === req.body.config.spoiler);

        const vipParts = [rim, spoiler].filter((item) => item?.tier === 'vip');

        if (vipParts.length && user.subscriptionTier !== 'vip') {
            return res.status(403).json({ error: 'Tylko użytkownik VIP może zapisywać części VIP.' });
        }

        const slots = Array.isArray(user.build_slots) ? user.build_slots : [];
        const nextSlot = {
            slot: slotNumber,
            config: req.body.config,
            updatedAt: new Date().toISOString(),
        };
        const nextSlots = [
            ...slots.filter((item) => item.slot !== slotNumber),
            nextSlot,
        ];

        await user.update({ build_slots: nextSlots });
        console.log(`Zapisano build użytkownika ${user.id} w slocie ${slotNumber}`);
        return res.json({ ok: true, slot: nextSlot });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Nie udało się zapisać buildu.' });
    }
});

try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true }); //TODO: delete alter: true; before deploying 
    const port = process.env.PORT || 3001;
    app.listen(port, () => console.log(`Serwer działa na porcie ${port}`));
} catch (err) {
    console.error('Nie można połączyć z bazą:', err.message);
}

app.get('/api/users', async (req, res) => {
    try {
        const users = await Users.findAll({
            where: { isAdmin: false },
            attributes: ['id', 'name', 'email', 'subscriptionTier', 'createdAt']
        });
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});