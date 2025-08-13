## CHIP — Poker Money Calculator (PMC)

Мобильное веб‑приложение для расчёта фишек и выплат, с авторизацией и историей сессий.

### Основные возможности
- Быстрый калькулятор возвратов по итоговым фишкам
- Авторизация, регистрация и профиль с аватаром
- Сохранение «сессий» и список моих сессий
- Современный адаптивный интерфейс

## Требования
- Node.js LTS (рекомендуется последняя LTS)
- npm

## Структура проекта (упрощённо)
```
my-chip-poker/
├── server/                # Бэкенд (Node.js, Express, SQLite)
│   ├── index.js           # API (порт 3001)
│   └── pmc.db             # SQLite база данных (создаётся автоматически)
├── public/                # Фронтенд (если используется папка public)
│   ├── index.html
│   └── assets/...         # css, js, картинки
├── (или файлы в корне)    # index.html, style.css, main.js и др.
├── package.json
└── README.md
```

## Быстрый старт (Windows PowerShell)
1) Перейдите в папку проекта:
```
cd "C:\Users\gchad\source\repos\my-chip-poker"
```

2) Установите зависимости:
```
npm ci
```
Если команда не доступна или падает, используйте:
```
npm install
```

3) Запустите API (порт 3001) в отдельном окне:
```
node .\server\index.js
```
API поднимется на `http://localhost:3001`.

4) Запустите статический фронтенд в другом окне:
- Если используется папка `public`:
```
npx serve public
```
- Если страницы лежат в корне проекта:
```
npx serve .
```
По умолчанию сайт будет доступен на `http://localhost:3000`.

5) Откройте в браузере `http://localhost:3000`.

### Авторизация и куки
Фронтенд по умолчанию обращается к API по адресу `http://localhost:3001` (см. `API_BASE` в `api.js`). CORS и куки включены для `localhost`.

## База данных пользователей
- Файл базы: `server/pmc.db` (SQLite). Создаётся автоматически при первом запуске API.
- Таблица пользователей: `users` (пароли хранятся как хэши в поле `password_hash`).

Как посмотреть базу:
- Установите «DB Browser for SQLite» и откройте файл `server/pmc.db`.
- Или через плагин VS Code для SQLite.
- Через CLI (если установлен `sqlite3`):
```
sqlite3 server/pmc.db
SELECT id, handle, display_name, email, created_at FROM users ORDER BY created_at DESC;
```

## Переменные окружения
- `JWT_SECRET` — секрет для подписи JWT. По умолчанию используется дев‑секрет. В проде обязательно задайте свой, например:
```
$env:JWT_SECRET="your-strong-secret"; node .\server\index.js
```

## Полезные скрипты (рекомендация)
Можно добавить в `package.json`:
```json
{
  "scripts": {
    "api": "node server/index.js",
    "web": "serve .",
    "web:public": "serve public"
  }
}
```
И запускать так:
```
npm run api
npm run web
```

## Типичные проблемы и решения
- Порт занят: запустите фронтенд на другом порту, например `npx serve . -l 5173`.
- Ошибка установки `better-sqlite3` или `sharp`: обновите Node.js до LTS и выполните `npm rebuild`.
- Куки не сохраняются: открывайте сайт на `http://localhost:<порт>`, а не с файловой системой (`file:///`).

## Лицензия
MIT
