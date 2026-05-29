# Interface Contract: Frontend ↔ Backend

## Frontend ожидает от Backend

- Публичный API с базовым URL из `VITE_API_URL`.
- `POST /auth/register` принимает `{name, password}` и возвращает `{token, user}`.
- `POST /auth/login` принимает `{name, password}` и возвращает `{token, user}`.
- `PATCH /auth/name` принимает `{name}`.
- `PATCH /auth/password` принимает `{oldPassword, newPassword}`.
- `GET /game/state` возвращает `GameState`.
- `POST /game/collect` принимает `{instanceId}` и возвращает `SceneItem[]`.
- `POST /game/gift` принимает `GiftPayload` и `resultCatalogId`, возвращает `InventoryItem`.
- `POST /game/reveal` принимает `{instanceId}` и возвращает `InventoryItem`.
- `GET /api/health` возвращает успешный health check.

Все `/game/*` требуют `Authorization: Bearer <token>`.

## Backend ожидает от Frontend

- Bearer token во всех игровых запросах.
- Корректный `instanceId` при сборе и раскрытии.
- `resultCatalogId` при дарении.
- Соблюдение правила трансформации подарка:
  - item -> gift: тот же `catalogId`;
  - gift -> gift: случайный другой `catalogId`.
- Локальную загрузку каталога из `assets/catalog.json`.

## Общие правила

- Backend не знает названия, описания и `imageKey`.
- Backend хранит только идентификаторы и состояние.
- При конфликте сбора предмета backend возвращает ошибку конфликта; frontend должен обработать её как нормальную гонку.
- Frontend не показывает точное значение коллективной цели.

## Требует уточнения

- Полная структура `GameState`.
- Полная структура `InventoryItem`.
- Полная структура `SceneItem`.
- Полная структура `GiftPayload`.
- Единый формат ошибок API.

