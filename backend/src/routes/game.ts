import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';

export const gameRouter = Router();
gameRouter.use(requireAuth);

// ─── GET /game/state ──────────────────────────────────────────────────────────

gameRouter.get('/state', (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;

  const user = db
    .prepare('SELECT id, name, created_at FROM users WHERE id = ?')
    .get(userId) as UserRow | undefined;

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    userId,
  );

  const inventory = (
    db
      .prepare('SELECT * FROM inventory WHERE owner_id = ? ORDER BY received_at ASC')
      .all(userId) as InventoryRow[]
  ).map(rowToInventoryItem);

  const wrappedGifts = (
    db
      .prepare('SELECT * FROM wrapped_gifts WHERE owner_id = ? ORDER BY received_at ASC')
      .all(userId) as WrappedGiftRow[]
  ).map(rowToWrappedGift);

  const sceneItems = (
    db.prepare('SELECT * FROM scene_items').all() as SceneItemRow[]
  ).map(rowToSceneItem);

  const goalRow = db
    .prepare('SELECT * FROM personal_goals WHERE user_id = ?')
    .get(userId) as PersonalGoalRow | undefined;

  // Если цели ещё нет — создаём (на случай если при регистрации не создались)
  const personalGoal = goalRow
    ? rowToPersonalGoal(goalRow)
    : createAndReturnGoal(userId);

  const collectiveGoal = db
    .prepare('SELECT current, target, last_recalc_at FROM collective_goal WHERE id = 1')
    .get() as CollectiveGoalRow;

  const allUsers = (
    db.prepare('SELECT id, name, created_at FROM users').all() as UserRow[]
  ).map(u => ({ id: u.id, name: u.name, createdAt: u.created_at }));

  const isFinale = new Date().getHours() >= 19;

  res.json({
    user: { id: user.id, name: user.name, createdAt: user.created_at },
    inventory,
    wrappedGifts,
    sceneItems,
    personalGoal,
    collectiveGoal: {
      current: collectiveGoal.current,
      target: collectiveGoal.target,
      lastRecalcAt: collectiveGoal.last_recalc_at,
    },
    allUsers,
    isFinale,
  });
});

// ─── POST /game/collect ───────────────────────────────────────────────────────

gameRouter.post('/collect', (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const { instanceId } = req.body as { instanceId?: string };

  if (!instanceId) {
    res.status(400).json({ error: 'instanceId required' });
    return;
  }

  // Атомарная транзакция: проверить → удалить → добавить в инвентарь
  const collectTx = db.transaction(() => {
    const item = db
      .prepare('SELECT * FROM scene_items WHERE instance_id = ?')
      .get(instanceId) as SceneItemRow | undefined;

    if (!item) {
      throw new Error('already_collected');
    }

    db.prepare('DELETE FROM scene_items WHERE instance_id = ?').run(instanceId);

    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO inventory
       (instance_id, owner_id, catalog_id, type, received_at)
       VALUES (?, ?, ?, 'item', ?)`,
    ).run(instanceId, userId, item.catalog_id, now);

    return db.prepare('SELECT * FROM scene_items').all() as SceneItemRow[];
  });

  try {
    const remaining = collectTx() as SceneItemRow[];
    res.json(remaining.map(rowToSceneItem));
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'already_collected') {
      res.status(409).json({ error: 'Предмет уже подобран' });
    } else {
      throw e;
    }
  }
});

// ─── POST /game/gift ──────────────────────────────────────────────────────────

gameRouter.post('/gift', (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const { instanceId, toUserId, isAnonymous, message, resultCatalogId } =
    req.body as {
      instanceId?: string;
      toUserId?: string;
      isAnonymous?: boolean;
      message?: string;
      resultCatalogId?: string;
    };

  if (!instanceId || !toUserId || !resultCatalogId) {
    res.status(400).json({ error: 'instanceId, toUserId, resultCatalogId required' });
    return;
  }

  if (toUserId === userId) {
    res.status(400).json({ error: 'Нельзя подарить себе' });
    return;
  }

  const giftTx = db.transaction(() => {
    // Проверяем что предмет есть в инвентаре отправителя
    const item = db
      .prepare('SELECT * FROM inventory WHERE instance_id = ? AND owner_id = ?')
      .get(instanceId, userId) as InventoryRow | undefined;

    if (!item) throw new Error('not_found');

    const recipient = db
      .prepare('SELECT name FROM users WHERE id = ?')
      .get(toUserId) as { name: string } | undefined;

    if (!recipient) throw new Error('recipient_not_found');

    const sender = db
      .prepare('SELECT name FROM users WHERE id = ?')
      .get(userId) as { name: string };

    // Удаляем из инвентаря отправителя
    db.prepare('DELETE FROM inventory WHERE instance_id = ?').run(instanceId);

    // Создаём нераскрытый подарок для получателя
    const newInstanceId = uuid();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO wrapped_gifts
       (instance_id, owner_id, catalog_id, from_user_id, from_user_name, is_anonymous, message, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      newInstanceId,
      toUserId,
      resultCatalogId,
      isAnonymous ? null : userId,
      isAnonymous ? null : sender.name,
      isAnonymous ? 1 : 0,
      message ?? null,
      now,
    );

    // Увеличиваем коллективный счётчик
    db.prepare('UPDATE collective_goal SET current = current + 1 WHERE id = 1').run();

    return {
      instanceId: newInstanceId,
      catalogId: resultCatalogId,
      type: 'gift' as const,
      fromUserId: isAnonymous ? undefined : userId,
      fromUserName: isAnonymous ? undefined : sender.name,
      isAnonymous: isAnonymous ?? false,
      message: message ?? undefined,
      receivedAt: now,
    };
  });

  try {
    const result = giftTx();
    res.json(result);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'not_found') {
      res.status(404).json({ error: 'Предмет не найден в инвентаре' });
    } else if (e instanceof Error && e.message === 'recipient_not_found') {
      res.status(404).json({ error: 'Получатель не найден' });
    } else {
      throw e;
    }
  }
});

// ─── POST /game/reveal ────────────────────────────────────────────────────────

gameRouter.post('/reveal', (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const { instanceId } = req.body as { instanceId?: string };

  if (!instanceId) {
    res.status(400).json({ error: 'instanceId required' });
    return;
  }

  const revealTx = db.transaction(() => {
    const wrapped = db
      .prepare('SELECT * FROM wrapped_gifts WHERE instance_id = ? AND owner_id = ?')
      .get(instanceId, userId) as WrappedGiftRow | undefined;

    if (!wrapped) throw new Error('not_found');

    // Удаляем нераскрытый подарок
    db.prepare('DELETE FROM wrapped_gifts WHERE instance_id = ?').run(instanceId);

    const now = new Date().toISOString();

    // Добавляем в инвентарь как раскрытый подарок
    db.prepare(
      `INSERT INTO inventory
       (instance_id, owner_id, catalog_id, type, from_user_id, from_user_name, is_anonymous, message, received_at)
       VALUES (?, ?, ?, 'gift', ?, ?, ?, ?, ?)`,
    ).run(
      instanceId,
      userId,
      wrapped.catalog_id,
      wrapped.from_user_id,
      wrapped.from_user_name,
      wrapped.is_anonymous,
      wrapped.message,
      now,
    );

    // Проверяем личную тройку целей
    checkPersonalGoal(userId, wrapped.catalog_id);

    return {
      instanceId,
      catalogId: wrapped.catalog_id,
      type: 'gift' as const,
      fromUserId: wrapped.from_user_id ?? undefined,
      fromUserName: wrapped.from_user_name ?? undefined,
      isAnonymous: wrapped.is_anonymous === 1,
      message: wrapped.message ?? undefined,
      receivedAt: now,
    };
  });

  try {
    const result = revealTx();
    res.json(result);
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'not_found') {
      res.status(404).json({ error: 'Подарок не найден' });
    } else {
      throw e;
    }
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function checkPersonalGoal(userId: string, catalogId: string): void {
  const goal = db
    .prepare('SELECT * FROM personal_goals WHERE user_id = ?')
    .get(userId) as PersonalGoalRow | undefined;

  if (!goal) return;

  let updated = false;

  if (goal.catalog_id_1 === catalogId && !goal.collected_1) {
    db.prepare('UPDATE personal_goals SET collected_1 = 1 WHERE user_id = ?').run(userId);
    updated = true;
  } else if (goal.catalog_id_2 === catalogId && !goal.collected_2) {
    db.prepare('UPDATE personal_goals SET collected_2 = 1 WHERE user_id = ?').run(userId);
    updated = true;
  } else if (goal.catalog_id_3 === catalogId && !goal.collected_3) {
    db.prepare('UPDATE personal_goals SET collected_3 = 1 WHERE user_id = ?').run(userId);
    updated = true;
  }

  if (!updated) return;

  // Проверяем завершение тройки
  const fresh = db
    .prepare('SELECT * FROM personal_goals WHERE user_id = ?')
    .get(userId) as PersonalGoalRow;

  if (fresh.collected_1 && fresh.collected_2 && fresh.collected_3) {
    // Генерируем новую тройку
    const all = Array.from({ length: 50 }, (_, i) => `gift-${i + 1}`);
    all.sort(() => Math.random() - 0.5);
    const [a, b, c] = all;
    db.prepare(
      `UPDATE personal_goals SET
       catalog_id_1 = ?, catalog_id_2 = ?, catalog_id_3 = ?,
       collected_1 = 0, collected_2 = 0, collected_3 = 0,
       completed_count = completed_count + 1
       WHERE user_id = ?`,
    ).run(a, b, c, userId);
  }
}

function createAndReturnGoal(userId: string) {
  const all = Array.from({ length: 50 }, (_, i) => `gift-${i + 1}`);
  all.sort(() => Math.random() - 0.5);
  const [a, b, c] = all;
  db.prepare(
    `INSERT OR IGNORE INTO personal_goals
     (user_id, catalog_id_1, catalog_id_2, catalog_id_3)
     VALUES (?, ?, ?, ?)`,
  ).run(userId, a, b, c);
  return {
    catalogIds: [a, b, c] as [string, string, string],
    collected: [false, false, false] as [boolean, boolean, boolean],
    completedCount: 0,
  };
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  name: string;
  created_at: string;
}

interface InventoryRow {
  instance_id: string;
  owner_id: string;
  catalog_id: string;
  type: 'item' | 'gift';
  from_user_id: string | null;
  from_user_name: string | null;
  is_anonymous: number;
  message: string | null;
  received_at: string;
}

interface WrappedGiftRow {
  instance_id: string;
  owner_id: string;
  catalog_id: string;
  from_user_id: string | null;
  from_user_name: string | null;
  is_anonymous: number;
  message: string | null;
  received_at: string;
}

interface SceneItemRow {
  instance_id: string;
  catalog_id: string;
  spawn_point_index: number;
  spawned_at: string;
}

interface PersonalGoalRow {
  user_id: string;
  catalog_id_1: string;
  catalog_id_2: string;
  catalog_id_3: string;
  collected_1: number;
  collected_2: number;
  collected_3: number;
  completed_count: number;
}

interface CollectiveGoalRow {
  current: number;
  target: number;
  last_recalc_at: string;
}

function rowToInventoryItem(r: InventoryRow) {
  return {
    instanceId: r.instance_id,
    catalogId: r.catalog_id,
    type: r.type,
    fromUserId: r.from_user_id ?? undefined,
    fromUserName: r.from_user_name ?? undefined,
    isAnonymous: r.is_anonymous === 1,
    message: r.message ?? undefined,
    receivedAt: r.received_at,
  };
}

function rowToWrappedGift(r: WrappedGiftRow) {
  return {
    instanceId: r.instance_id,
    receivedAt: r.received_at,
    fromUserId: r.from_user_id ?? undefined,
    fromUserName: r.from_user_name ?? undefined,
    message: r.message ?? undefined,
  };
}

function rowToSceneItem(r: SceneItemRow) {
  return {
    instanceId: r.instance_id,
    catalogId: r.catalog_id,
    spawnPointIndex: r.spawn_point_index,
    spawnedAt: r.spawned_at,
  };
}

function rowToPersonalGoal(r: PersonalGoalRow) {
  return {
    catalogIds: [r.catalog_id_1, r.catalog_id_2, r.catalog_id_3] as [string, string, string],
    collected: [!!r.collected_1, !!r.collected_2, !!r.collected_3] as [boolean, boolean, boolean],
    completedCount: r.completed_count,
  };
}
