# Eves — Real-time seat booking with phantom-lock recovery

Premium consumer ticketing UI on top of a battle-tested booking engine.

- **Backend** — Node 20, Express, Socket.IO, Prisma, PostgreSQL, Redis, BullMQ (in `/app/backend`).
- **Frontend** — React 19 + Tailwind + Framer Motion (in `/app/frontend`).
- **Realtime** — Socket.IO mounted at `/socket.io`, broadcasts every state change to every connected tab.

## Local dev (Emergent preview)
Backend, frontend, Postgres and Redis are all managed by supervisor:

```bash
sudo supervisorctl status
# backend  postgres  redis  frontend
sudo supervisorctl restart backend
```

Re-seed demo data any time:

```bash
cd /app/backend
npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss
npx tsx prisma/seed.ts
```

Demo accounts: `admin@eves.io / admin123` · `user@eves.io / user123`.

## Deploy anywhere

The backend is environment-driven. Provide:

| Var | Example |
|-----|---------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/eves?schema=public` |
| `REDIS_URL`    | `redis://host:6379` |
| `JWT_SECRET`   | `<long random string>` |
| `JWT_EXPIRES_IN` | `7d` |
| `LOCK_TTL_SECONDS` | `300` |
| `RECOVERY_INTERVAL_MS` | `10000` |
| `CORS_ORIGIN`  | `https://your-frontend.example.com` (or `*`) |
| `PORT`         | `8001` (or platform-provided) |

### Docker

```bash
cd /app/backend
docker compose up -d            # starts postgres + redis
docker build -t eves-api .
docker run --rm --env-file .env -p 8001:8001 eves-api
```

The included `Dockerfile` uses `tsup` to build the TypeScript API to `dist/server.js`,
then runs `node dist/server.js`.

### Vercel / Railway / Fly / Render

- Backend: deploy the `apps/api` service as a Node 20 worker (or a serverless container with WebSocket support — Vercel/Netlify don't support WS, prefer Railway/Fly/Render). Provide the env vars above.
- Frontend: build `/app/frontend` (`yarn build`), deploy to any static host, set `REACT_APP_BACKEND_URL` to your backend's public URL at build time.

### Frontend build

```bash
cd /app/frontend
yarn install
REACT_APP_BACKEND_URL=https://api.example.com yarn build
# upload build/ to your static host
```

## Architecture

```
Redis (atomic locks · TTL)  ←→  Express API (REST + Socket.IO)  ←→  PostgreSQL (durable + SELECT FOR UPDATE)
                                            │
                                            └── BullMQ recovery worker (every 10s)
```

Atomic lock: `SET NX EX 300 lock:seat:<seatId> "<userId>:<sessionId>"` — only one wins.
Booking: `LOCK_VERIFY_AND_DELETE_SCRIPT` (Lua) ensures the *same* lock holder is the one who confirms, then a Postgres transaction with `SELECT … FOR UPDATE` finalizes the booking.
Recovery: every 10s the worker scans Postgres for `LOCKED` rows whose `lockedUntil < now()` *and* whose Redis key is missing or expired, then atomically returns them to `AVAILABLE`.

## Endpoints (excerpt)

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/register` | – |
| POST | `/api/auth/login` | – |
| GET  | `/api/auth/me` | user |
| GET  | `/api/events` | – |
| GET  | `/api/events/:id/seats` | – |
| POST | `/api/seats/:id/lock` | user |
| DELETE | `/api/seats/:id/release` | user |
| POST | `/api/payments/simulate-{success,failure,timeout,crash}` | user |
| GET  | `/api/bookings/my` | user |
| GET  | `/api/admin/dashboard` | admin |
| POST | `/api/admin/race-test` | admin |
| POST | `/api/recovery/run` | admin |

See `/app/backend/FRONTEND_PRD.md` (still bundled) for full request/response contracts.
