import { v4 as uuid } from 'uuid';
import { db } from './db';

const SPAWN_INTERVAL_MS = 10 * 60 * 1000; // 10 минут
const SPAWN_COUNT = 4;
const SPAWN_POINTS_COUNT = 12;
const CATALOG_SIZE = 50;

const GAME_START_HOUR = 10;
const GAME_END_HOUR = 19;
const COLLECTIVE_GOAL_MIN = 300;
const COLLECTIVE_GOAL_MAX = 1500;
const COLLECTIVE_GOAL_COEFF = 0.9;
const GOAL_RECALC_HOURS = [12, 15, 17];

function randomCatalogId(): string {
  const n = Math.floor(Math.random() * CATALOG_SIZE) + 1;
  return `gift-${n}`;
}

/** Добавляет предметы на свободные точки сцены */
export function runRespawn(): void {
  const occupied = db
    .prepare('SELECT spawn_point_index FROM scene_items')
    .all() as { spawn_point_index: number }[];

  const occupiedSet = new Set(occupied.map(r => r.spawn_point_index));

  const freePoints: number[] = [];
  for (let i = 0; i < SPAWN_POINTS_COUNT; i++) {
    if (!occupiedSet.has(i)) freePoints.push(i);
  }

  if (freePoints.length === 0) return;

  // Перемешиваем свободные точки
  freePoints.sort(() => Math.random() - 0.5);

  const toSpawn = Math.min(SPAWN_COUNT, freePoints.length);
  const insert = db.prepare(
    'INSERT INTO scene_items (instance_id, catalog_id, spawn_point_index, spawned_at) VALUES (?, ?, ?, ?)',
  );

  const now = new Date().toISOString();
  for (let i = 0; i < toSpawn; i++) {
    insert.run(uuid(), randomCatalogId(), freePoints[i], now);
  }
}

/** Пересчёт адаптивной коллективной цели */
function recalculateGoal(): void {
  const goal = db
    .prepare('SELECT current FROM collective_goal WHERE id = 1')
    .get() as { current: number } | undefined;

  if (!goal) return;

  const now = new Date();
  const elapsedHours = now.getHours() - GAME_START_HOUR + now.getMinutes() / 60;

  if (elapsedHours <= 0) return;

  const ratePerHour = goal.current / elapsedHours;
  const totalGameHours = GAME_END_HOUR - GAME_START_HOUR;
  const projected = ratePerHour * totalGameHours;
  const newTarget = Math.round(
    Math.max(
      COLLECTIVE_GOAL_MIN,
      Math.min(COLLECTIVE_GOAL_MAX, projected * COLLECTIVE_GOAL_COEFF),
    ),
  );

  db.prepare(
    'UPDATE collective_goal SET target = ?, last_recalc_at = ? WHERE id = 1',
  ).run(newTarget, now.toISOString());

  console.log(`[goal] Recalculated target: ${newTarget} (gifted so far: ${goal.current})`);
}

/** Запускает таймеры респавна и пересчёта цели */
export function startTimers(): void {
  // Первый респавн сразу при старте сервера
  runRespawn();
  setInterval(runRespawn, SPAWN_INTERVAL_MS);

  // Пересчёт цели в 12:00, 15:00, 17:00
  scheduleGoalRecalcs();
}

function scheduleGoalRecalcs(): void {
  for (const hour of GOAL_RECALC_HOURS) {
    const now = new Date();
    const target = new Date(now);
    target.setHours(hour, 0, 0, 0);

    if (target > now) {
      const delay = target.getTime() - now.getTime();
      setTimeout(() => recalculateGoal(), delay);
    }
  }
}
