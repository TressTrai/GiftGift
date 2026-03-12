# Деплой GiftGift

## Обзор

```
Timeweb (Ubuntu) — Express + SQLite (бэкенд)
Vercel            — Vite build (фронтенд)
```

Фронт обращается к беку по публичному URL: `https://ваш-сервер/api/...`

---

## Часть 1. Бэкенд на Timeweb (Ubuntu)

### 1.1 Подключись по SSH и установи Node.js

```bash
ssh root@<твой-ip>

# Установи nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# Node 20 LTS
nvm install 20
nvm use 20
node -v  # должно быть v20.x
```

### 1.2 Установи PM2 (менеджер процессов)

```bash
npm install -g pm2
```

### 1.3 Залей код на сервер

**Вариант A — git clone (рекомендую):**
```bash
git clone https://github.com/тво-аккаунт/giftgift.git /opt/giftgift
cd /opt/giftgift/backend
```

**Вариант B — scp с локалки:**
```bash
# На локалке:
scp -r D:/Git/GiftGift/backend root@<ip>:/opt/giftgift/backend
```

### 1.4 Настрой окружение

```bash
cd /opt/giftgift/backend
npm install          # установит и скомпилирует better-sqlite3

cp .env.example .env
nano .env
```

Заполни `.env`:
```
PORT=3000
JWT_SECRET=замени-на-длинную-случайную-строку-минимум-32-символа
DB_PATH=./game.db
```

### 1.5 Запусти через PM2

```bash
cd /opt/giftgift/backend
pm2 start "npm run start" --name giftgift-backend

# Проверь что работает
pm2 logs giftgift-backend
curl http://localhost:3000/api/health  # должно вернуть {"ok":true}

# Автозапуск при перезагрузке сервера
pm2 save
pm2 startup
# Выполни команду которую выведет pm2 startup
```

### 1.6 Открой порт в фаерволе

```bash
ufw allow 3000
ufw status
```

Теперь бек доступен по `http://<твой-ip>:3000/api/health`.

---

### 1.7 (Рекомендую) Nginx + домен вместо голого порта

Если хочешь `https://api.твой-домен.ru/api/...` вместо `http://ip:3000`:

```bash
apt install nginx certbot python3-certbot-nginx -y

nano /etc/nginx/sites-available/giftgift
```

```nginx
server {
    server_name api.твой-домен.ru;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/giftgift /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# HTTPS (Let's Encrypt)
certbot --nginx -d api.твой-домен.ru
```

После этого бек будет на `https://api.твой-домен.ru/api`.

> **Важно:** Vercel — это HTTPS. Если бек без SSL (голый http://ip), браузеры заблокируют запросы из-за Mixed Content. Поэтому nginx + certbot — не опция, а необходимость при использовании Vercel.

---

## Часть 2. Фронтенд на Vercel

### 2.1 Залей код в GitHub

Если ещё не залито — создай репо на GitHub и запушь весь проект.

### 2.2 Создай проект на Vercel

1. Иди на [vercel.com](https://vercel.com), войди через GitHub
2. **New Project** → выбери репозиторий
3. Vercel автоматически определит Vite

**Настройки сборки** (обычно определяет сам, но проверь):
- Framework Preset: **Vite**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

### 2.3 Добавь переменную окружения

В Vercel → Settings → Environment Variables:

```
VITE_API_URL = https://api.твой-домен.ru/api
```

### 2.4 Deploy

Нажми **Deploy**. Vercel соберёт фронт и отдаст URL типа `https://giftgift-xxx.vercel.app`.

---

## Часть 3. Проверка

```bash
curl https://api.твой-домен.ru/api/health
# → {"ok":true}
```

Открой `https://giftgift-xxx.vercel.app` → должна загрузиться игра.

---

## Часть 4. Деплой обновлений

**Бэкенд** (на сервере):
```bash
cd /opt/giftgift/backend
git pull
npm install  # если изменились зависимости
pm2 restart giftgift-backend
```

**Фронтенд** — автоматически: любой `git push` в main → Vercel пересобирает.

---

## Чеклист перед событием

- [ ] `curl https://api.../api/health` возвращает `{"ok":true}`
- [ ] Регистрация и логин работают
- [ ] Фронт открывается на телефоне
- [ ] `game.db` создаётся в `backend/game.db` (или путь из `DB_PATH`)
- [ ] Время на сервере правильное — влияет на таймеры 12:00/15:00/17:00 и финал 19:00:
  ```bash
  timedatectl set-timezone Europe/Moscow
  date
  ```
