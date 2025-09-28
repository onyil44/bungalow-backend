# 🌲 Forest Bungalow Booking — Backend

A production-ready REST API for a bungalow/hotel booking system.  
Built with **Node.js + Express + Mongoose (MongoDB)**, featuring **JWT auth with refresh tokens**, **RBAC**, robust query features (filter/sort/paginate), safe file uploads, and UTC-first date handling with a configurable hotel time zone.

---

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Data Model (Key Entities)](#-data-model-key-entities)
- [API Overview](#-api-overview)
- [Environment Variables](#-environment-variables)
- [Getting Started](#-getting-started)
- [Demo Data & Nightly Reset](#-demo-data--nightly-reset)
- [Production](#-production)
- [Security & Hardening](#-security--hardening)
- [Conventions](#-conventions)
- [License](#-license)

---

## 🚀 Features

- **Auth**: Email/password login, JWT Access + Refresh tokens, cookie or header support
- **RBAC**: Roles like `superAdmin`, `admin`, `manager`, `receptionist`
- **Resources**: Cabins, Guests, Bookings, Settings, Uploads
- **Query Engine**: Filter (`?filter={...}`), sort (`?sort=...`), fields (`?fields=...`), pagination (`?page=1&limit=20`), safe populate
- **Dates**: All persistence in **UTC**; hotel logic uses `HOTEL_TIME_ZONE` (e.g. `Europe/Istanbul`)
- **Validation**: Mongoose schemas (optionally extendable with Zod)
- **Security**: Helmet, CORS, rate limiting, sanitization, HPP
- **Ops**: Healthchecks, structured logs, Docker-friendly
- **Demo Reset**: Optional nightly restore via protected routes

---

## 🛠 Tech Stack

- **Runtime**: Node.js (>=18)
- **Framework**: Express
- **DB**: MongoDB (>=6/7)
- **ORM**: Mongoose
- **Auth**: JWT (access/refresh)
- **Other**: Multer (+Sharp) for images, date-fns/date-fns-tz utilities

---

## 🏗 Architecture

```
/src
/config # env, db, cors, logger
/models # Mongoose models (User, Cabin, Booking, Guest, Setting, ...)
/controllers # Generic ApiController + resource controllers
/routes # Express routers per resource
/middlewares # auth, rbac, errors, sanitize, rate-limit
/utils # APIFeatures, date helpers (UTC/TR midnight), etc.
/services # domain services if needed
server.js
```

### Controller Pattern

- **ApiController** (generic) + **APIFeatures** for filter/sort/paginate/fields and whitelisted `populate` from `?populate=path:fields`.
- Each resource controller extends the generic base where useful.

---

## 📊 Data Model (Key Entities)

**Booking**

- `startDateUtc: Date` (UTC midnight of hotel start)
- `numNights: Number`
- `status: 'unconfirmed' | 'checked-in' | 'checked-out'`
- `isPaid: Boolean`
- `guest: ObjectId<Guest>`
- `cabin: ObjectId<Cabin>`
- `totalPrice: Decimal128 | Number`
- Derived hotel dates computed with `HOTEL_TIME_ZONE`

**Cabin**: capacity, price, images, etc.  
**Guest**: name, email, nationality, etc.  
**User**: role, email, password (hashed)  
**Setting**: app-level config (tax, breakfast price, min/max nights…)

---

## 📡 API Overview

**Base URLs**

- Local: `http://localhost:4001/api/v1`
- Prod: `https://api.yourdomain.com/api/v1`

**Common Endpoints**

- **Auth**: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
- **Bookings**: `GET /bookings`, `POST /bookings`, `GET /bookings/:id`, `PATCH /bookings/:id`, `DELETE /bookings/:id`
- **Cabins**: `GET /cabins`, `POST /cabins`, ...
- **Guests**: `GET /guests`, `POST /guests`, ...
- **Settings**: `GET /settings`, `PATCH /settings`
- **Uploads**: `POST /uploads/image` (Multer + Sharp pipeline)

**Query Examples**

```http
GET /bookings?filter={"status":"unconfirmed"}&sort=-startDateUtc&fields=guest,cabin,startDateUtc&limit=20&page=1
GET /bookings?filter={"$or":[{"status":"unconfirmed"},{"status":"checked-in"}]}
GET /bookings?populate=guest:name,email|cabin:name,capacity
```

## ⚙️ Environment Variables

Create .env file:

```
# Core
NODE_ENV=development
PORT=4001

# Mongo
MONGO_URI=mongodb://mongo:27017/databasename
MONGO_DB_NAME=databasename

# Auth (change in production!)
JWT_ACCESS_SECRET=change_me_access
JWT_REFRESH_SECRET=change_me_refresh
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# CORS
CORS_ORIGIN=http://localhost:5173

# Time & Locale
TZ=UTC
HOTEL_TIME_ZONE=Europe/Istanbul

# Uploads / Files
UPLOADS_DIR=/srv/data/uploads/bungalow
MAX_FILE_SIZE_MB=5

# Security / Limits
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300

# Logs
LOG_LEVEL=info
```

## ▶️ Getting Started

```
# 1) Install
npm i

# 2) Run Dev (w/ auto-reload)
npm run dev

# 3) Lint (optional)
npm run lint
```

Example package.json scripts:

```
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "lint": "eslint ./src --ext .js,.mjs",
    "seed": "node src/restore_data/seed.js",
    "restore:demo": "node src/restore_data/restoreDemo.js"
  }
}
```

## 🚀 Production

Run behind a reverse proxy (Caddy/Nginx) with TLS

Build/run via Docker:

```
docker compose up -d --build
```

Healthcheck endpoint: GET /health

Logs to stdout; centralize with your stack

## 🔒 Security & Hardening

Helmet, CORS with explicit origins, rate limiting, HPP, Mongo sanitization

Strong JWT secrets, short access token TTL, rotate refresh tokens

Validate populate paths via whitelist (already supported)

Enforce RBAC per route

Limit upload size, validate MIME, process images via Sharp

## 📐 Conventions

Dates: persist in UTC; convert for display with HOTEL_TIME_ZONE

Status rules (UTC-based):

Before/at check-in day ⇒ unconfirmed

Between check-in (exclusive) and checkout (inclusive) ⇒ checked-in

After checkout ⇒ checked-out (often isPaid=true)

## 📜 License

MIT
