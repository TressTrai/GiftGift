import 'dotenv/config';
import express from 'express';
import { authRouter } from './routes/auth';
import { gameRouter } from './routes/game';
import { startTimers } from './respawn';

// Инициализация БД при старте
import './db';

const app = express();
const PORT = process.env.PORT ?? 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(express.json());

// CORS (фронт на другом порту при разработке)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// ─── Роуты ───────────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/game', gameRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ─── Запуск ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`);
  startTimers();
});
