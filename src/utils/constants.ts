// ─── Игровое время ───────────────────────────────────────────────────────────

export const GAME_START_HOUR = 10;          // 10:00
export const GAME_END_HOUR = 19;            // 19:00
export const GOAL_RECALC_HOURS = [12, 15, 17]; // пересчёт адаптивной цели

// ─── Сцена ───────────────────────────────────────────────────────────────────

/** 12 фиксированных точек респавна предметов на сцене (нормализованные 0-1) */
export const SPAWN_POINTS: { x: number; y: number }[] = [
  { x: 0.50, y: 0.08 },
  { x: 0.17, y: 0.16 },
  { x: 0.88, y: 0.25 },
  { x: 0.47, y: 0.29 },
  { x: 0.18, y: 0.41 },
  { x: 0.52, y: 0.49 },
  { x: 0.14, y: 0.64 },
  { x: 0.91, y: 0.65 },
  { x: 0.56, y: 0.73 },
  { x: 0.70, y: 0.85 },
  { x: 0.04, y: 0.89 },
  { x: 0.20, y: 0.96 },
];

export const SCENE_WIDTH = 2160;            // px ширина иллюстрации (2× холста 1080)
export const SCENE_HEIGHT = 4800;           // px высота иллюстрации (2× холста 2400)

// ─── Экономика ───────────────────────────────────────────────────────────────

export const SPAWN_INTERVAL_MS = 10 * 60 * 1000; // 10 минут
export const HOURLY_GRANT_INTERVAL_MS = 60 * 60 * 1000; // 1 час
export const SPAWN_COUNT = 4;               // предметов за респавн
export const CATALOG_SIZE = 50;

export const COLLECTIVE_GOAL_MIN = 300;
export const COLLECTIVE_GOAL_MAX = 1500;
export const COLLECTIVE_GOAL_COEFF = 0.9;

// Каждые 10% прогресса — новый визуальный элемент на сцене
export const COLLECTIVE_VISUAL_STEPS = 10;

/** 10 фиксированных позиций элементов коллективного прогресса (нормализованные 0-1) */
/** Позиции элементов прогресса — в порядке появления (нормализованные 0-1) */
export const PROGRESS_POSITIONS: { x: number; y: number }[] = [
  { x: 0.83, y: 0.54 },  // 1  ёлка
  { x: 0.46, y: 0.14 },  // 2  конфетти
  { x: 0.63, y: 0.21 },  // 3  ромашка
  { x: 0.49, y: 0.34 },  // 4  бант
  { x: 0.26, y: 0.59 },  // 5  статуэтка мишки
  { x: 0.37, y: 0.44 },  // 6  свеча
  { x: 0.52, y: 0.83 },  // 7  розы
  { x: 0.21, y: 0.25 },  // 8  шоколадки
  { x: 0.92, y: 0.41 },  // 9  мишка плюшевый
  { x: 0.25, y: 0.88 },  // 10 шезлонг
];

/** Ключи изображений — в том же порядке появления что и PROGRESS_POSITIONS */
export const PROGRESS_IMAGES: string[] = [
  'progress-el-10', // ёлка
  'progress-el-1',  // конфетти
  'progress-el-2',  // ромашка
  'progress-el-4',  // бант
  'progress-el-9',  // статуэтка мишки
  'progress-el-5',  // свеча
  'progress-el-3',  // розы
  'progress-el-6',  // шоколадки
  'progress-el-8',  // мишка плюшевый
  'progress-el-7',  // шезлонг
];

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
  HOURLY_GRANT: 'HourlyGrantScene',
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

  // Часовая выдача
  HOURLY_ITEMS_RECEIVED: 'hourly:items-received',
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
