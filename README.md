# GiftGift — Февромарт 🎁

Веб-игра дарения подарков для корпоратива на 20–30 человек.
Тема: **Февромарт** (объединение 23 февраля и 8 марта).
Одноразовое событие: один день, 12:00–20:00.

## Стек

- **Фронтенд:** Phaser 3 + TypeScript + Vite
- **Бэкенд:** Express + SQLite (better-sqlite3)
- **Фокус:** мобильный (portrait, touch)

## Как запустить

**Фронтенд:**
```bash
npm install
npm run dev        # http://localhost:5173
```

Создай `.env` в корне:
```
VITE_API_URL=http://localhost:3000/api
```

**Бэкенд:**
```bash
cd backend
npm install
cp .env.example .env
npm run dev        # http://localhost:3000
```

## Игровой процесс

- Собирай предметы с интерактивной сцены
- Дари их коллегам с личным сообщением (анонимно или нет)
- Получай подарки — раскрывай их с анимацией
- Выполняй личную тройку целей (только подарки от других)
- Вместе приближайте коллективную цель команды

## Структура проекта

```
src/scenes/     — все сцены Phaser (Game, Inventory, Profile, Gifting...)
src/api/        — fetch-обёртки для бэкенда
src/store/      — GameStore, синглтон состояния игры
backend/src/    — Express API, SQLite, JWT, респавн предметов
public/assets/  — каталог 50 подарков, изображения, аудио
```
