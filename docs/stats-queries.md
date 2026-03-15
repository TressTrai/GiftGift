# Статистика после игры — SQL запросы

Все запросы готовы к копированию. Формат: `sqlite3 <путь> "<запрос>"`.

---

## Место для заметок

| Метрика                       | Результат                                           |
| ----------------------------- | --------------------------------------------------- |
| Игроков зарегистрировалось    | 20                                                  |
| Коллективная цель выполнена   | 687\|677\|101.5%                                    |
| Кто не заходил совсем         | 0                                                   |
| Самый щедрый игрок            | Соне4ка - 119                                       |
| Больше всего получил подарков | Дарья - 33                                          |
| Кто ни разу не подарил        | Fanatglenta<br>Олег                                 |
| Кто ни разу не получил        | Екатерина                                           |
| Анонимных подарков всего      | 3                                                   |
| Закрыто троек (макс.)         | Вероника - 2                                        |
| Кто не закрыл ни одной тройки | 12                                                  |
| Самый популярный подарок      | Плакат ПМ и подписка на Perplexity                  |
| Нераскрытых подарков к концу  | 144                                                 |
| Пик активности                | 18:00 - 117                                         |
| Первый / последний подарок    | 2026-03-13T07:21:01.829Z и 2026-03-15T09:51:28.034Z |

---

## Общее

**Сколько зарегистрировалось игроков**
```bash
sqlite3 /home/GiftGift/backend/game.db "SELECT COUNT(*) AS total_users FROM users;"
```

20

**Итог коллективной цели**
```bash
sqlite3 /home/GiftGift/backend/game.db "SELECT current, target, ROUND(current * 100.0 / target, 1) || '%' AS progress FROM collective_goal WHERE id = 1;"
```
687\|677\|101.5%

**Кто не заходил в игру совсем (зарегистрировался, но не играл)**
```bash
sqlite3 /home/GiftGift/backend/game.db "SELECT name FROM users WHERE substr(last_seen_at, 1, 19) = substr(created_at, 1, 19);"
```
0

---

## Активность игроков

**Кто больше всех подарил**
```bash
sqlite3 /home/GiftGift/backend/game.db "SELECT from_user_name, COUNT(*) AS gifts_sent FROM (SELECT from_user_name FROM wrapped_gifts WHERE from_user_id IS NOT NULL UNION ALL SELECT from_user_name FROM inventory WHERE type = 'gift' AND from_user_id IS NOT NULL) GROUP BY from_user_name ORDER BY gifts_sent DESC;"
```

Соне4ка|119
максим|58
Аня Арланова|56
Вероника|42
Екатерина|41
Мухтар|37
Филипп|36
Даша|16
Алина|16
Вика|15
Максим|7
Соня|6
Дарья|6
Алексей|3
Mazilaa|3
Alex|2
даня_|1
Анна|1

**Кто больше всех получил подарков (раскрытых)**
```bash
sqlite3 /home/GiftGift/backend/game.db "SELECT u.name, COUNT(i.instance_id) AS gifts_received FROM users u LEFT JOIN inventory i ON i.owner_id = u.id AND i.type = 'gift' GROUP BY u.id, u.name ORDER BY gifts_received DESC;"
```

Дарья|33
Мухтар|32
Вика|29
Соня|26
Анна|26
Алина|25
Максим|24
Даша|23
Алексей|18
Аня Арланова|17
максим|16
Fanatglenta|12
даня_|11
Филипп|9
Mazilaa|8
Вероника|8
Alex|5
Соне4ка|2
Олег|0
Екатерина|0

**Кто ни разу не подарил**
```bash
sqlite3 /home/GiftGift/backend/game.db "SELECT u.name FROM users u WHERE u.id NOT IN (SELECT from_user_id FROM wrapped_gifts WHERE from_user_id IS NOT NULL UNION SELECT from_user_id FROM inventory WHERE type = 'gift' AND from_user_id IS NOT NULL);"
```

Олег

**Кто ни разу не получил подарка**
```bash
sqlite3 /home/GiftGift/backend/game.db "SELECT u.name FROM users u LEFT JOIN inventory i ON i.owner_id = u.id AND i.type = 'gift' LEFT JOIN wrapped_gifts w ON w.owner_id = u.id WHERE i.instance_id IS NULL AND w.instance_id IS NULL;"
```

Екатерина

**Кто дарил анонимно и сколько раз**
```bash
sqlite3 /home/GiftGift/backend/game.db "SELECT from_user_name, COUNT(*) AS anon_gifts FROM (SELECT from_user_name FROM wrapped_gifts WHERE is_anonymous = 1 UNION ALL SELECT from_user_name FROM inventory WHERE type = 'gift' AND is_anonymous = 1) GROUP BY from_user_name ORDER BY anon_gifts DESC;"
```
|3

**Сколько всего анонимных подарков**
```bash
sqlite3 /home/GiftGift/backend/game.db "SELECT COUNT(*) AS anon_total FROM (SELECT instance_id FROM wrapped_gifts WHERE is_anonymous = 1 UNION ALL SELECT instance_id FROM inventory WHERE type = 'gift' AND is_anonymous = 1);"
```
3

---

## Тройки целей

**Сколько троек закрыл каждый игрок**
```bash
sqlite3 /home/GiftGift/backend/game.db "SELECT u.name, p.completed_count FROM personal_goals p JOIN users u ON u.id = p.user_id ORDER BY completed_count DESC;"
```

Вероника|2
Аня Арланова|1
Соне4ка|1
Соня|1
Вика|1
Максим|1
Филипп|1
максим|1
Даша|0
Мухтар|0
Fanatglenta|0
Екатерина|0
Mazilaa|0
Олег|0
Дарья|0
Анна|0
Алина|0
Alex|0
Алексей|0
даня_|0

**Кто не закрыл ни одной тройки**
```bash
sqlite3 /home/GiftGift/backend/game.db "SELECT u.name FROM personal_goals p JOIN users u ON u.id = p.user_id WHERE p.completed_count = 0;"
```

Даша|0
Мухтар|0
Fanatglenta|0
Екатерина|0
Mazilaa|0
Олег|0
Дарья|0
Анна|0
Алина|0
Alex|0
Алексей|0
даня_|0

---

## Инвентарь игроков

**Самый частый предмет/подарок у каждого игрока (предметы + раскрытые подарки + нераскрытые)**
```bash
sqlite3 /home/GiftGift/backend/game.db "
WITH all_items AS (
  SELECT owner_id, catalog_id FROM inventory
  UNION ALL
  SELECT owner_id, catalog_id FROM wrapped_gifts
),
counts AS (
  SELECT owner_id, catalog_id, COUNT(*) AS cnt
  FROM all_items
  GROUP BY owner_id, catalog_id
),
max_per_user AS (
  SELECT owner_id, MAX(cnt) AS max_cnt
  FROM counts
  GROUP BY owner_id
)
SELECT u.name, c.catalog_id, c.cnt AS count
FROM counts c
JOIN max_per_user m ON c.owner_id = m.owner_id AND c.cnt = m.max_cnt
JOIN users u ON u.id = c.owner_id
ORDER BY u.name, c.catalog_id;"
```

---

## Подарки

**Самый популярный подарок (топ-10 по catalog_id)**
```bash
sqlite3 /home/GiftGift/backend/game.db "SELECT catalog_id, COUNT(*) AS times_gifted FROM (SELECT catalog_id FROM wrapped_gifts UNION ALL SELECT catalog_id FROM inventory WHERE type = 'gift') GROUP BY catalog_id ORDER BY times_gifted DESC LIMIT 10;"
```

gift-24|16
gift-14|16
gift-28|15
gift-39|14
gift-18|14
gift-6|12
gift-33|12
gift-32|12
gift-30|12
gift-2|12

**Сколько подарков нераскрыто к концу игры**
```bash
sqlite3 /home/GiftGift/backend/game.db "SELECT COUNT(*) AS unwrapped FROM wrapped_gifts;"
```

**У кого нераскрытые подарки (и сколько)**
```bash
sqlite3 /home/GiftGift/backend/game.db "SELECT u.name, COUNT(w.instance_id) AS unwrapped FROM users u JOIN wrapped_gifts w ON w.owner_id = u.id GROUP BY u.id, u.name ORDER BY unwrapped DESC;"
```
131

**Самые длинные сообщения к подаркам (топ-10)**
```bash
sqlite3 /home/GiftGift/backend/game.db "SELECT from_user_name, message, length(message) AS len FROM (SELECT from_user_name, owner_id, message FROM wrapped_gifts WHERE message IS NOT NULL AND message != '' UNION ALL SELECT from_user_name, owner_id, message FROM inventory WHERE message IS NOT NULL AND message != '') ORDER BY len DESC LIMIT 10;"
```

Алексей|Если найду "Костю", подарю его тоже, будет играть тебе|54
Аня Арланова|От сердца и почек, дарю я вам цветочек|38
Филипп|Хоть где-то кальян пригодится тебе))|36
Алексей|Дарить нужно то, что человек любит|34
Филипп|Флаг в руки и барабан на шею)|29
Alex|Работается лучше, ага, верю|27
Филипп|Главное, не злоупотреблять)|27
даня_|За голос против плкоголизма|27
Аня Арланова|Тебе нужны такие наушники|25
Даша|букетик через интернетик|24

**Все сообщения к подаркам (для прочтения вслух)**
```bash
sqlite3 /home/GiftGift/backend/game.db "SELECT from_user_name, message FROM (SELECT from_user_name, message FROM wrapped_gifts WHERE message IS NOT NULL AND message != '' UNION ALL SELECT from_user_name, message FROM inventory WHERE type = 'gift' AND message IS NOT NULL AND message != '') ORDER BY from_user_name;"
```

Alex|Работается лучше, ага, верю
Алексей|Дарить нужно то, что человек любит
Алексей|Если найду "Костю", подарю его тоже, будет играть тебе
Алексей|Вам пора возобновлять)
Аня Арланова|На, конфетку
Аня Арланова|Кто ты
Аня Арланова|С нг!
Аня Арланова|Не грусти
Аня Арланова|Точно не Фотошоп
Аня Арланова|Поиграй в vr
Аня Арланова|От сердца и почек, дарю я вам цветочек
Аня Арланова|Когда поооооооост
Аня Арланова|Тебе нужны такие наушники
Аня Арланова|Хехе
Аня Арланова|Го сундуки тестеровать
Аня Арланова|С новым годом!
Аня Арланова|Липа
Аня Арланова|привет!
Аня Арланова|Поздравляю! Ты первая)
Аня Арланова|Беби фокс
Аня Арланова|Улыбочку
Аня Арланова|Для тестирования
Аня Арланова|Мяв
Аня Арланова|Бррррр
Аня Арланова|Вкусное
Аня Арланова|Когда пост новый
Аня Арланова|На, подписку
Аня Арланова|Чтоб было
Аня Арланова|Будь креативным
Аня Арланова|Брям
Аня Арланова|Мяу
Аня Арланова|Мягкое
Аня Арланова|Только верни)))
Аня Арланова|Потыкайся, поиграйся
Аня Арланова|Удачи
Аня Арланова|Спокойствия и корвалола
Аня Арланова|Пикми
Даша|для тебя
Даша|я нашла флаг
Даша|это мы тоже делали
Даша|букетик через интернетик
Максим|Пропади всё проподом
Мухтар|MAX
Мухтар|Надо?
Мухтар|Угадай что внутри
Соне4ка|лови вкусняшку
Соне4ка|от всего сердца
Филипп|чаек в хату)
Филипп|Бреньк-бреньк)
Филипп|Флаг в руки и барабан на шею)
Филипп|)))
Филипп|Главному настраивателю)
Филипп|Полетели)
Филипп|Главное, не злоупотреблять)
Филипп|Хоть где-то кальян пригодится тебе))
даня_|За голос против плкоголизма
максим|:жаба:
максим|няманяма
максим|золотое

---

## Активность по времени + 5 часов

**Сколько подарков отправлено по часам**
```bash
sqlite3 /home/GiftGift/backend/game.db "SELECT substr(received_at, 12, 2) || ':00' AS hour, COUNT(*) AS gifts FROM (SELECT received_at FROM wrapped_gifts UNION ALL SELECT received_at FROM inventory WHERE type = 'gift') GROUP BY hour ORDER BY hour;"
```

07:00|11
08:00|68
09:00|69
10:00|28
11:00|73
12:00|81
13:00|117
14:00|13
15:00|1
18:00|7

**Пик активности — самый горячий час**
```bash
sqlite3 /home/GiftGift/backend/game.db "SELECT substr(received_at, 12, 2) || ':00' AS hour, COUNT(*) AS gifts FROM (SELECT received_at FROM wrapped_gifts UNION ALL SELECT received_at FROM inventory WHERE type = 'gift') GROUP BY hour ORDER BY gifts DESC LIMIT 1;"
```

13:00|115

**Когда был отправлен первый и последний подарок**
```bash
sqlite3 /home/GiftGift/backend/game.db "SELECT MIN(received_at) AS first_gift, MAX(received_at) AS last_gift FROM (SELECT received_at FROM wrapped_gifts UNION ALL SELECT received_at FROM inventory WHERE type = 'gift');"
```

2026-03-13T07:21:01.829Z|2026-03-15T09:51:28.034Z