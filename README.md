# Podium Rare — Backend API

Node.js + Express + SQLite (libsql) + Cloudinary

## Быстрый старт

```bash
cd backend
cp .env.example .env      # заполни Cloudinary ключи
npm install
npm run dev               # http://localhost:3001
```

## Env переменные

| Переменная | Что это |
|---|---|
| `PORT` | Порт (по умолчанию 3001) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary → Settings → Account |
| `CLOUDINARY_API_KEY` | Cloudinary → API Keys |
| `CLOUDINARY_API_SECRET` | Cloudinary → API Keys |

---

## API

### Creators

| Метод | URL | Описание |
|---|---|---|
| `POST` | `/creators` | Создать креатора |
| `GET` | `/creators` | Список (фильтр: `?city=NYC&type=photo`) |
| `GET` | `/creators/:id` | Профиль + работы |
| `DELETE` | `/creators/:id` | Удалить |

**POST /creators** — `multipart/form-data`

| Поле | Тип | Обязательно |
|---|---|---|
| `name` | string | ✓ |
| `type` | `ugc` / `photo` / `video` / `model` / `art_director` | ✓ |
| `cities` | JSON string `["NYC","Paris"]` | ✓ |
| `bio` | string | |
| `price_min` | number | |
| `price_max` | number | |
| `instagram` | string | |
| `avatar` | file (jpg/png/webp) | |

```bash
curl -X POST http://localhost:3001/creators \
  -F name="Masha K" \
  -F type="photo" \
  -F 'cities=["NYC","London"]' \
  -F price_min=290 \
  -F price_max=690 \
  -F instagram="@masha" \
  -F avatar=@avatar.jpg
```

---

### Brands

| Метод | URL | Описание |
|---|---|---|
| `POST` | `/brands` | Создать бренд |
| `GET` | `/brands` | Список |
| `GET` | `/brands/:id` | Профиль |
| `DELETE` | `/brands/:id` | Удалить |

**POST /brands** — `multipart/form-data`

| Поле | Тип | Обязательно |
|---|---|---|
| `name` | string | ✓ |
| `bio` | string | |
| `website` | string | |
| `instagram` | string | |
| `logo` | file (jpg/png/webp) | |

```bash
curl -X POST http://localhost:3001/brands \
  -F name="Acne Studios" \
  -F website="https://acnestudios.com" \
  -F logo=@logo.png
```

---

### Works (портфолио)

| Метод | URL | Описание |
|---|---|---|
| `POST` | `/works` | Загрузить фото/видео |
| `GET` | `/works?creator_id=1` | Все работы креатора |
| `DELETE` | `/works/:id` | Удалить (+ из Cloudinary) |

**POST /works** — `multipart/form-data`

| Поле | Тип | Обязательно |
|---|---|---|
| `creator_id` | number | ✓ |
| `file` | jpg/png/webp/mp4/mov | ✓ |
| `caption` | string | |

```bash
curl -X POST http://localhost:3001/works \
  -F creator_id=1 \
  -F caption="Street style, NYC 2025" \
  -F file=@shoot.jpg
```

---

## Структура файлов

```
backend/
├── src/
│   ├── index.js          # точка входа
│   ├── db.js             # SQLite схема и подключение
│   ├── cloudinary.js     # Cloudinary + multer
│   └── routes/
│       ├── creators.js
│       ├── brands.js
│       └── works.js
├── .env.example
└── package.json
```
