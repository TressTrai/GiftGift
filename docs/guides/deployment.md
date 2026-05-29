# Гайд: деплой GiftGift

## Назначение

Это рабочая инструкция для девопсера по запуску GiftGift перед событием.

Схема:

```text
Timeweb Ubuntu -> Express + SQLite backend
Vercel -> Vite frontend
Frontend -> HTTPS API
```

## Backend на Timeweb

Установить Node.js 20 LTS:

```bash
ssh root@<ip>
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node -v
```

Установить PM2:

```bash
npm install -g pm2
```

Загрузить код:

```bash
git clone https://github.com/<account>/giftgift.git /opt/giftgift
cd /opt/giftgift/backend
```

Настроить окружение:

```bash
npm install
cp .env.example .env
nano .env
```

Минимальный `.env`:

```text
PORT=3000
JWT_SECRET=<long-random-secret>
DB_PATH=./game.db
```

Запустить backend:

```bash
pm2 start "npm run start" --name giftgift-backend
pm2 logs giftgift-backend
curl http://localhost:3000/api/health
pm2 save
pm2 startup
```

## Nginx и HTTPS

Vercel открывается по HTTPS, поэтому API тоже должен быть доступен по HTTPS.

```bash
apt install nginx certbot python3-certbot-nginx -y
nano /etc/nginx/sites-available/giftgift
```

```nginx
server {
    server_name api.<domain>;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/giftgift /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
certbot --nginx -d api.<domain>
```

Проверка:

```bash
curl https://api.<domain>/api/health
```

## Frontend на Vercel

Настройки проекта:

- Framework Preset: Vite.
- Build Command: `npm run build`.
- Output Directory: `dist`.
- Install Command: `npm install`.

Переменная окружения:

```text
VITE_API_URL=https://api.<domain>/api
```

После deploy открыть Vercel URL на телефоне и проверить регистрацию, логин и загрузку игры.

## Обновления

Backend:

```bash
cd /opt/giftgift/backend
git pull
npm install
pm2 restart giftgift-backend
```

Frontend:

```text
git push в main -> Vercel пересобирает проект
```

## Чеклист перед событием

- [ ] `https://api.<domain>/api/health` возвращает успешный ответ.
- [ ] Регистрация работает.
- [ ] Логин работает.
- [ ] Frontend открывается на телефоне.
- [ ] `VITE_API_URL` указывает на HTTPS API.
- [ ] `game.db` создаётся по `DB_PATH`.
- [ ] PM2 process активен.
- [ ] Nginx проксирует `/api`.
- [ ] Серверное время и timezone соответствуют расписанию события.

