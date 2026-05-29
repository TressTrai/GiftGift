# Direction Document: Девопсер

## Назначение роли

Девопсер отвечает за подготовку окружения, запуск фронтенда и бэкенда, переменные окружения, базу данных, HTTPS и быструю проверку перед событием.

Роль минимальная, но критичная: игра одноразовая, поэтому основной риск — не сложная эксплуатация, а сбой в день запуска.

## Целевая схема

```text
Vercel -> frontend Vite build
Timeweb Ubuntu -> backend Express + SQLite
Frontend -> public HTTPS API
```

Фронтенд не должен обращаться к бэкенду по небезопасному `http`, если сам открыт через Vercel HTTPS.

## Backend

Ожидаемая среда:

- Ubuntu;
- Node.js 20 LTS;
- PM2;
- SQLite-файл на сервере;
- Nginx как reverse proxy;
- HTTPS через Let's Encrypt.

Бэкенд должен иметь:

- установленный backend package;
- `.env`;
- `PORT`;
- `JWT_SECRET`;
- `DB_PATH`;
- рабочий `/api/health`.

## Frontend

Фронтенд разворачивается как Vite build.

На Vercel должны быть заданы:

- framework preset: Vite;
- build command: `npm run build`;
- output directory: `dist`;
- install command: `npm install`;
- `VITE_API_URL` с публичным HTTPS API.

## Проверка перед событием

Минимальная проверка:

- `/api/health` возвращает успешный ответ;
- регистрация работает;
- логин работает;
- игра открывается на телефоне;
- frontend использует правильный `VITE_API_URL`;
- SQLite-файл создаётся по `DB_PATH`;
- время и часовой пояс сервера соответствуют расписанию события;
- финальный таймер и пересчёты коллективной цели не сдвинуты.

## Рабочий гайд

Подробная пошаговая инструкция лежит в `guides/deployment.md`.

