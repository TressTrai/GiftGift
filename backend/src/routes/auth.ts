import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { signToken } from '../jwt';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';

export const authRouter = Router();

// ─── POST /auth/register ──────────────────────────────────────────────────────

authRouter.post('/register', (req: Request, res: Response) => {
  const { name, password } = req.body as { name?: string; password?: string };

  if (!name?.trim() || !password || password.length < 4) {
    res.status(400).json({ error: 'Имя обязательно, пароль минимум 4 символа' });
    return;
  }

  const id = uuid();
  const passwordHash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO users (id, name, password_hash, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, name.trim(), passwordHash, now, now);

  // Генерируем личную тройку целей
  createPersonalGoal(id);

  const token = signToken(id);
  res.json({ token, user: { id, name: name.trim(), createdAt: now } });
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────

authRouter.post('/login', (req: Request, res: Response) => {
  const { name, password } = req.body as { name?: string; password?: string };

  if (!name?.trim() || !password) {
    res.status(400).json({ error: 'Имя и пароль обязательны' });
    return;
  }

  const users = db
    .prepare('SELECT * FROM users WHERE name = ?')
    .all(name.trim()) as UserRow[];

  // Перебираем всех с таким именем (имена могут совпадать)
  const user = users.find(u => bcrypt.compareSync(password, u.password_hash));

  if (!user) {
    res.status(401).json({ error: 'Неверное имя или пароль' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(now, user.id);

  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, name: user.name, createdAt: user.created_at } });
});

// ─── PATCH /auth/name ─────────────────────────────────────────────────────────

authRouter.patch('/name', requireAuth, (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const { name } = req.body as { name?: string };

  if (!name?.trim()) {
    res.status(400).json({ error: 'Имя не может быть пустым' });
    return;
  }

  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), userId);
  res.json({});
});

// ─── PATCH /auth/password ─────────────────────────────────────────────────────

authRouter.patch('/password', requireAuth, (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const { oldPassword, newPassword } = req.body as {
    oldPassword?: string;
    newPassword?: string;
  };

  if (!oldPassword || !newPassword || newPassword.length < 4) {
    res.status(400).json({ error: 'Новый пароль минимум 4 символа' });
    return;
  }

  const user = db
    .prepare('SELECT password_hash FROM users WHERE id = ?')
    .get(userId) as { password_hash: string } | undefined;

  if (!user || !bcrypt.compareSync(oldPassword, user.password_hash)) {
    res.status(401).json({ error: 'Неверный текущий пароль' });
    return;
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);
  res.json({});
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  name: string;
  password_hash: string;
  created_at: string;
  last_seen_at: string;
}

function createPersonalGoal(userId: string): void {
  // 3 случайных подарка без повторов
  const all = Array.from({ length: 50 }, (_, i) => `gift-${i + 1}`);
  all.sort(() => Math.random() - 0.5);
  const [a, b, c] = all;

  db.prepare(
    `INSERT OR IGNORE INTO personal_goals
     (user_id, catalog_id_1, catalog_id_2, catalog_id_3)
     VALUES (?, ?, ?, ?)`,
  ).run(userId, a, b, c);
}
