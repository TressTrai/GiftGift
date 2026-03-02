# CLAUDE.md — GiftGift / Февромарт

## Что это

Веб-игра дарения подарков для корпоратива на 20-30 человек.
Одноразовое событие: **10:00–19:00**, один день.
Тема: Февромарт (объединение 23 февраля и 8 марта).

Стек: **Phaser 3 + TypeScript + Vite** (фронт) + **Express + SQLite** (бэк). Мобильный фокус (portrait, touch).

---

## Быстрый старт

**Фронтенд:**
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # сборка в dist/
```

`.env` в корне:
```
VITE_API_URL=http://localhost:3000/api
```

**Бэкенд:**
```bash
cd backend
npm install
cp .env.example .env   # поменяй JWT_SECRET
npm run dev            # http://localhost:3000
```

`.env` в backend/:
```
PORT=3000
JWT_SECRET=replace-me-with-something-random
DB_PATH=./game.db
```

---

## Проверка и сборка

**TypeScript (фронтенд):**
```bash
npx tsc --noEmit          # проверка типов без сборки
npm run build             # полная сборка в dist/ (тоже проверяет типы)
```

**TypeScript (бэкенд):**
```bash
cd backend
npx tsc --noEmit          # проверка типов бэкенда
```

**Запуск обоих серверов одновременно** (в разных терминалах):
```bash
# Терминал 1 — бэкенд
cd backend && npm run dev

# Терминал 2 — фронтенд
npm run dev
```

---

## Структура проекта

```
├── public/assets/
│   ├── catalog.json             # 50 подарков: id, name, description, imageKey
│   ├── images/
│   │   ├── scene/background.jpg          # 1600×1200
│   │   ├── scene/progress-el-1..12.png   # элементы коллективного прогресса
│   │   ├── gifts/gift-1..gift-50.png     # 256×256, прозрачный фон
│   │   └── ui/wrapped-gift.png, icon-*.png, particle.png
│   └── audio/collect.mp3, reveal.mp3, gift-sent.mp3, trio-complete.mp3, finale.mp3
│
├── src/
│   ├── main.ts                  # Phaser.Game (390×844), список всех сцен
│   ├── types/index.ts           # Все типы: User, InventoryItem, SceneItem, GameState...
│   │
│   ├── utils/
│   │   ├── constants.ts         # SCENE_KEYS, EVENTS, COLORS, SPAWN_POINTS, числовые параметры
│   │   ├── eventBus.ts          # Глобальный Phaser.Events.EventEmitter для связи сцен
│   │   └── storage.ts           # localStorage: токен, флаг туториала, звук
│   │
│   ├── api/
│   │   ├── client.ts            # fetch-обёртка с Bearer-токеном и BASE_URL из env
│   │   ├── auth.ts              # register, login, updateName, updatePassword
│   │   └── game.ts              # fetchState, collectItem, sendGift, revealGift
│   │
│   ├── store/
│   │   └── GameStore.ts         # Singleton состояния игры. Инит через fetchState().
│   │                            # Каталог: initCatalog() + getCatalogEntry(catalogId).
│   │                            # Все мутации через методы, каждая эмитит EventBus.
│   │
│   ├── systems/
│   │   └── SyncSystem.ts        # Polling каждые 30с, таймер финала 19:00,
│   │                            # статический метод calculateAdaptiveGoal()
│   │
│   └── scenes/
│       ├── BootScene.ts         # Preload ассетов + catalog.json → Auth или Game+UI
│       ├── AuthScene.ts         # Логин / Регистрация (DOM inputs в Phaser)
│       ├── TutorialScene.ts     # 2-экранный онбординг, только при первом заходе
│       ├── GameScene.ts         # TAB 1 — интерактивная сцена (1600×1200)
│       │                        # Pan/zoom камеры, предметы на 12 точках,
│       │                        # визуальный прогресс коллективной цели
│       ├── UIScene.ts           # Постоянный оверлей (layered scene поверх Game)
│       │                        # Tab bar (Сцена / Инвентарь / Профиль) + badge
│       ├── InventoryScene.ts    # TAB 2 — три секции:
│       │                        # тройка целей | нераскрытые подарки | инвентарь
│       ├── ProfileScene.ts      # TAB 3 — имя, пароль, звук вкл/выкл, туториал
│       ├── ItemDetailScene.ts   # Модал: картинка + описание + от кого + кнопка "Подарить"
│       ├── GiftingScene.ts      # Модал: выбор получателя, превью трансформации,
│       │                        # сообщение (≤100 символов), анонимность
│       ├── RevealScene.ts       # Модал: анимация раскрытия shake→burst→reveal (2 сек)
│       └── FinaleScene.ts       # Fullscreen: фейерверк + поздравление в 19:00
│
└── backend/
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    └── src/
        ├── index.ts             # Express app, CORS, запуск таймеров
        ├── db.ts                # SQLite (better-sqlite3), схема, инициализация
        ├── jwt.ts               # signToken / verifyToken
        ├── respawn.ts           # респавн каждые 10 мин + пересчёт цели в 12/15/17
        ├── middleware/
        │   └── requireAuth.ts   # Bearer-токен → req.userId
        └── routes/
            ├── auth.ts          # POST /auth/register|login, PATCH /auth/name|password
            └── game.ts          # GET /game/state, POST /game/collect|gift|reveal
```

---

## Архитектура сцен

Phaser **layered scenes** (несколько сцен активны одновременно):

```
GameScene   ← основная сцена (сон во время инвентаря/профиля)
UIScene     ← всегда активна поверх всего, содержит tab bar
─────────────────────────────
InventoryScene / ProfileScene  ← запускаются через scene.launch, GameScene спит
─────────────────────────────
ItemDetailScene / GiftingScene / RevealScene / FinaleScene  ← модальные оверлеи
```

Сцены **не ссылаются напрямую** друг на друга — общение только через `EventBus`.

---

## Основные потоки данных

**Заход в игру:**
```
BootScene → catalog.json → gameStore.initCatalog() → fetchState() → gameStore.init(state) → GameScene + UIScene
```

**Сбор предмета:**
```
Tap на спрайте → collectItem(id) → gameStore.applyItemCollected() → EventBus.emit(ITEM_COLLECTED)
```

**Дарение:**
```
ItemDetailScene → GiftingScene → sendGift({..., resultCatalogId}) → gameStore.applyGiftSent()
→ EventBus.emit(GIFT_SENT) + emit(COLLECTIVE_PROGRESS)
```
`resultCatalogId`: для item→gift = тот же catalogId; для gift→gift = случайный id из каталога (≠ текущего), выбирается в `GiftingScene` в момент дарения.

**Раскрытие подарка:**
```
Tap wrapped gift → RevealScene → revealGift() → gameStore.applyGiftRevealed()
→ проверка тройки целей → EventBus.emit(GIFT_REVEALED) [→ TRIO_COMPLETED]
```

---

## Каталог подарков

`public/assets/catalog.json` — статический файл, **только на клиенте**. Бэкенд его не знает.

- Загружается в `BootScene.preload()` через `this.load.json('catalog', 'assets/catalog.json')`
- Инициализируется в `BootScene.create()` через `gameStore.initCatalog(catalog)`
- Доступен в любой сцене через `gameStore.getCatalogEntry(catalogId)`
- Трансформации при передаривании: случайный `gift-N` (≠ исходного), вычисляется в `GiftingScene.pickRandomCatalogId()` в момент дарения

---

## Схема БД (SQLite, `backend/game.db`)

| Таблица | Назначение |
|---|---|
| `users` | id, name, password_hash, created_at, last_seen_at |
| `inventory` | раскрытые предметы и подарки у игроков |
| `wrapped_gifts` | нераскрытые подарки (catalog_id скрыт до reveal) |
| `scene_items` | предметы на сцене (глобальный пул) |
| `personal_goals` | тройка целей каждого игрока + прогресс |
| `collective_goal` | singleton: current, target, last_recalc_at |

---

## Backend API

Все `/game/*` требуют `Authorization: Bearer <token>`.

| Метод | Путь | Тело запроса | Ответ |
|---|---|---|---|
| POST | `/auth/register` | `{name, password}` | `{token, user}` |
| POST | `/auth/login` | `{name, password}` | `{token, user}` |
| PATCH | `/auth/name` | `{name}` | `{}` |
| PATCH | `/auth/password` | `{oldPassword, newPassword}` | `{}` |
| GET | `/game/state` | — | `GameState` |
| POST | `/game/collect` | `{instanceId}` | `SceneItem[]` |
| POST | `/game/gift` | `GiftPayload` + `resultCatalogId` | `InventoryItem` |
| POST | `/game/reveal` | `{instanceId}` | `InventoryItem` |
| GET | `/api/health` | — | `{ok: true}` |

---

## Игровые параметры

| Параметр | Значение |
|---|---|
| Игровой день | 10:00 – 19:00 |
| Каталог подарков | 50 уникальных (gift-1..gift-50) |
| Точек респавна на сцене | 12 |
| Интервал респавна | 10 мин, 4 шт |
| Анимация раскрытия | 2000 мс |
| Длина сообщения | макс 100 символов |
| Минимум пароля | 4 символа |
| Пересчёт коллективной цели | 12:00, 15:00, 17:00 |
| Коэффициент цели | 0.9 от прогноза |
| Bounds цели | [300, 1500] подарков |
| Элементы прогресса на сцене | 10-15 (каждые 10% прогресса) |

---

## Дизайн-решения

- **Каталог на клиенте**: имена/описания/imageKey только в `public/assets/catalog.json`. Бэкенд оперирует только `catalogId` и `instanceId`. Клиент передаёт `resultCatalogId` при дарении.
- **Предмет vs Подарок**: предметы собираются со сцены, не участвуют в целях. При дарении становятся подарком для получателя (вид не меняется). Подарки при передаривании трансформируются в случайный другой подарок из каталога.
- **Анонимность**: выбирается при каждом дарении отдельно.
- **Коллективная цель**: адаптируется 3 раза в день, скрыта от игроков (только визуальный прогресс).
- **Личная тройка целей**: засчитываются только подарки от других игроков — мотивирует живое общение.
- **Race condition при сборе**: транзакция SQLite — кто первый, тот получил; второй получает 409.
- **Нет Competition**: только Fellowship и Gift-Giving Delight. Нет лидербордов, нет "кто больше".

---

## Документация уровней

| Файл | Содержание |
|---|---|
| `docs/L0-context.md` | Платформа, команда (1 человек, 4 дня), бюджет (0₽) |
| `docs/L1-aesthetic.md` | Gift-Giving Delight (primary), Wonder, Fellowship |
| `docs/L2-dynamics.md` | Core loop, экономика изобилия, anti-dynamics |
| `docs/L3-temporal.md` | Micro/Meso/Macro петли, расчёт контента (50 подарков) |
| `docs/L4-paradigm.md` | Adaptive (коллективная цель) + Consistency (всё остальное) |
| `docs/L5-mechanics.md` | 7 систем, data flow, conflicts matrix, state persistence |
| `docs/L6-presentation.md` | UI/UX spec, мокапы всех экранов, cognitive budget |
| `docs/L7-parameters.md` | Все параметры с обоснованием, риски, playtesting priorities |
