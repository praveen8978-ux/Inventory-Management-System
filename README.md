# StockFlow MVP

## Hour 1 setup

```bash
npm run install:all
cd server && npx prisma migrate dev --name init   # creates prisma/dev.db
cd .. && npm run dev:server    # terminal 1 -> http://localhost:4000/api/health
npm run dev:client             # terminal 2 -> http://localhost:5173
```

Expected: the page shows "API ok, database connected".

Switch to Postgres: change `provider` in `server/prisma/schema.prisma`,
set `DATABASE_URL` in `server/.env`, re-run the migration.
