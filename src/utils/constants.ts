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
// Палитра взята из цветов сцены (f7a590 ebb838 93a25d d5d4b5 59a9b0)
// и иконок (b1d2e2 e9876d f9ebd0). Всё централизовано здесь.

export const COLORS = {
  // Фоны
  BG:           0xfdf0e4,  // тёплый крем (из f9ebd0 иконок)
  BG_CARD:      0xfff8ef,  // карточки — чуть светлее
  BG_CARD_ALT:  0xeef6f7,  // карточки голубоватые (из b1d2e2)
  BG_INPUT:     0xfdf0e4,  // поля ввода

  // Акценты из сцены и иконок
  ACCENT_AMBER: 0xebb838,  // янтарный (сцена)
  ACCENT_CORAL: 0xe9876d,  // коралловый (иконки)
  ACCENT_TEAL:  0x59a9b0,  // бирюзовый (сцена)
  ACCENT_OLIVE: 0x93a25d,  // оливковый (сцена)
  ACCENT_BEIGE: 0xd5d4b5,  // бежевый (сцена)
  ACCENT_PINK:  0xdb9ccf,  // сиреневый (предметы)

  // Текст
  TEXT:         0x3d2b1f,  // тёмно-коричневый (на светлом фоне)
  TEXT_DIM:     0x8a7060,  // приглушённый коричневый
  TEXT_LIGHT:   0xfdf0e4,  // светлый текст (на тёмных элементах)

  // Кнопки
  BUTTON_PRIMARY:   0xe9876d,  // коралловый — основная кнопка
  BUTTON_HOVER:     0xf5a48a,  // светлее — ховер
  BUTTON_SECONDARY: 0xd5d4b5,  // бежевый — вторичная

  // Рамки и разделители
  ITEM_BORDER:  0xd5d4b5,  // бежевая рамка предмета
  GIFT_BORDER:  0xebb838,  // янтарная рамка подарка
  DIVIDER:      0xe8d0b8,  // тёплый разделитель

  // Статусы
  SUCCESS:      0x93a25d,  // оливковый
  ERROR:        0xe9876d,  // коралловый
  BADGE:        0xe9876d,  // коралловый бейдж

  // Алиасы для обратной совместимости
  PRIMARY:      0xe9876d,
  ACCENT_WARM:  0xebb838,
  ACCENT_BLUE:  0x59a9b0,
} as const;

/** CSS-строки, точно соответствующие значениям COLORS.
 *  Используй для: Phaser text color, DOM-элементов (inputs, кнопки). */
export const CSS = {
  BG:           '#fdf0e4',
  BG_CARD:      '#fff8ef',
  BG_CARD_ALT:  '#eef6f7',
  BG_INPUT:     '#fdf0e4',
  BG_DARK:      '#2a1a10',

  ACCENT_AMBER: '#ebb838',
  ACCENT_CORAL: '#e9876d',
  ACCENT_TEAL:  '#59a9b0',
  ACCENT_OLIVE: '#93a25d',
  ACCENT_BEIGE: '#d5d4b5',
  ACCENT_PINK:  '#db9ccf',

  TEXT:         '#3d2b1f',
  TEXT_DIM:     '#8a7060',
  TEXT_LIGHT:   '#fdf0e4',

  BUTTON_PRIMARY:   '#e9876d',
  BUTTON_SECONDARY: '#d5d4b5',
  DIVIDER:          '#e8d0b8',

  SUCCESS:      '#93a25d',
  ERROR:        '#e9876d',
} as const;

/** Базовые радиусы скругления (px при width=390).
 *  В коде умножай на коэффициент s = width/390. */
export const RADIUS = {
  SM:  6,   // мелкие элементы, инпуты
  MD:  10,  // карточки, кнопки
  LG:  16,  // модальные панели
} as const;

/** Шрифты. TITLE — Comfortaa (заголовки), BODY — Nunito (основной текст). */
export const FONT = {
  TITLE: '"Comfortaa", "Nunito", sans-serif',
  BODY:  '"Nunito", sans-serif',
} as const;

/** Базовые размеры шрифта (px при width=390).
 *  В коде: fontSize: `${Math.round(FS.MD * s)}px` */
export const FS = {
  XS:   13,  // подписи к карточкам, мелкие метки
  SM:   16,  // подзаголовки, счётчики
  MD:   19,  // основной текст, кнопки
  LG:   22,  // крупный текст, лейблы форм
  XL:   26,  // заголовки экранов
  XXL:  31,  // крупные заголовки
  XXXL: 38,  // главный заголовок (Февромарт)
} as const;

// ─── Ключи хранилища ─────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'giftgift_token',
  TUTORIAL_SEEN: 'giftgift_tutorial_seen',
  SOUND_ENABLED: 'giftgift_sound',
} as const;
