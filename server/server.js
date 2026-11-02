import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { sequelize, Users } from './db.js';

const app = express();
app.use(express.json());

const sessions = {}; // token -> userId

app.post('/api/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password || password.length < 6) {
            return res.status(400).json({ error: 'Podaj e-mail i hasło (min. 6 znaków).' });
        }
        const exists = await Users.findOne({ where: { email } });
        if (exists) return res.status(409).json({ error: 'Taki e-mail już istnieje.' });

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await Users.create({ email, passwordHash, name: name || null });
        const token = crypto.randomUUID();
        sessions[token] = user.id;
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
        const token = crypto.randomUUID();
        sessions[token] = user.id;
        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/logout', (req, res) => {
    delete sessions[req.body.token];
    res.json({ ok: true });
});

try {
    await sequelize.authenticate();
    await sequelize.sync({force: true});
    app.listen(3001, () => console.log('Serwer działa na porcie 3001'));
} catch (err) {
    console.error('Nie można połączyć z bazą:', err.message);
}