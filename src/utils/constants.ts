// ─── Игровое время ───────────────────────────────────────────────────────────

export const GAME_START_HOUR = 10;          // 10:00
export const GAME_END_HOUR = 19;            // 19:00
export const GOAL_RECALC_HOURS = [12, 15, 17]; // пересчёт адаптивной цели

// ─── Сцена ───────────────────────────────────────────────────────────────────

/** 12 фиксированных точек респавна предметов на сцене (нормализованные 0-1) */
export const SPAWN_POINTS: { x: number; y: number }[] = [
  { x: 0.12, y: 0.20 },
  { x: 0.30, y: 0.15 },
  { x: 0.55, y: 0.18 },
  { x: 0.78, y: 0.22 },
  { x: 0.90, y: 0.38 },
  { x: 0.85, y: 0.58 },
  { x: 0.68, y: 0.72 },
  { x: 0.45, y: 0.80 },
  { x: 0.22, y: 0.75 },
  { x: 0.08, y: 0.60 },
  { x: 0.15, y: 0.42 },
  { x: 0.38, y: 0.50 },
];

export const SCENE_WIDTH = 1600;            // px ширина иллюстрации
export const SCENE_HEIGHT = 1200;           // px высота иллюстрации

// ─── Экономика ───────────────────────────────────────────────────────────────

export const SPAWN_INTERVAL_MS = 10 * 60 * 1000; // 10 минут
export const SPAWN_COUNT = 4;               // предметов за респавн
export const CATALOG_SIZE = 50;

export const COLLECTIVE_GOAL_MIN = 300;
export const COLLECTIVE_GOAL_MAX = 1500;
export const COLLECTIVE_GOAL_COEFF = 0.9;

// Каждые 10% прогресса — новый визуальный элемент на сцене
export const COLLECTIVE_VISUAL_STEPS = 10;

// ─── UI ──────────────────────────────────────────────────────────────────────

export const REVEAL_ANIMATION_DURATION = 2000; // ms
export const MESSAGE_MAX_LENGTH = 100;
export const PASSWORD_MIN_LENGTH = 4;

// ─── Ключи сцен Phaser ────────────────────────────────────────────────────────

export const SCENE_KEYS = {
  BOOT: 'BootScene',
  AUTH: 'AuthScene',
  TUTORIAL: 'TutorialScene',
  GAME: 'GameScene',
  UI: 'UIScene',
  INVENTORY: 'InventoryScene',
  PROFILE: 'ProfileScene',
  ITEM_DETAIL: 'ItemDetailScene',
  GIFTING: 'GiftingScene',
  REVEAL: 'RevealScene',
  FINALE: 'FinaleScene',
} as const;

// ─── Ключи событий (EventBus) ────────────────────────────────────────────────

export const EVENTS = {
  // Синхронизация с сервером
  STATE_SYNCED: 'state:synced',
  NEW_GIFTS_RECEIVED: 'gifts:new',
  SCENE_ITEMS_UPDATED: 'scene:items-updated',

  // Действия игрока
  ITEM_COLLECTED: 'item:collected',
  GIFT_SENT: 'gift:sent',
  GIFT_REVEALED: 'gift:revealed',
  TRIO_COMPLETED: 'trio:completed',
  COLLECTIVE_PROGRESS: 'collective:progress',

  // UI
  OPEN_DETAIL: 'ui:open-detail',
  OPEN_GIFTING: 'ui:open-gifting',
  OPEN_REVEAL: 'ui:open-reveal',
  TAB_CHANGED: 'ui:tab-changed',

  // Финал
  FINALE_TRIGGERED: 'finale:triggered',
} as const;

// ─── Цвета ───────────────────────────────────────────────────────────────────

export const COLORS = {
  BG: 0x1a1a2e,
  PRIMARY: 0x7b68ee,          // фиолетово-голубой
  ACCENT_WARM: 0xffb347,      // жёлтый/золотой
  ACCENT_PINK: 0xff69b4,      // розовый
  ACCENT_BLUE: 0x87ceeb,      // голубой
  ITEM_BORDER: 0x888888,      // серая рамка (предмет)
  GIFT_BORDER: 0xffd700,      // золотая рамка (подарок)
  TEXT: 0xffffff,
  TEXT_DIM: 0xaaaaaa,
  SUCCESS: 0x4caf50,
} as const;

// ─── Ключи хранилища ─────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'giftgift_token',
  TUTORIAL_SEEN: 'giftgift_tutorial_seen',
  SOUND_ENABLED: 'giftgift_sound',
} as const;
