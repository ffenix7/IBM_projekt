import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sequelize, Users } from './db.js';

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-me';
const BUILD_SLOT_COUNT = 3;

function createToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '1h' },
    );
}

function requireAuth(req, res, next) {
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : null;

    if (!token) {
        return res.status(401).json({ error: 'Wymagane logowanie.' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.userId = payload.sub;
        next();
    } catch {
        return res.status(401).json({ error: 'Nieprawidłowy lub wygasły token.' });
    }
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
        res.json({ token, user: { id: user.id, email, name: user.name } });
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
        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
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
        const user = await Users.findByPk(req.userId);
        if (!user) {
            return res.status(401).json({ error: 'Użytkownik nie istnieje.' });
        }

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
        const user = await Users.findByPk(req.userId);
        if (!user) {
            return res.status(401).json({ error: 'Użytkownik nie istnieje.' });
        }

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
        const user = await Users.findByPk(req.userId);
        if (!user) {
            return res.status(401).json({ error: 'Użytkownik nie istnieje.' });
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
    await sequelize.sync({ alter: true });
    app.listen(3001, () => console.log('Serwer działa na porcie 3001'));
} catch (err) {
    console.error('Nie można połączyć z bazą:', err.message);
}