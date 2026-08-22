# Vidya Yati

Multi-tenant school/kindergarten management SaaS. See **`CLAUDE.md`** for
the full product/design brief before building anything — this file is just
setup steps.

## First-time setup

```bash
npm install

# Postgres — quickest way to get one running locally is Docker:
docker run --name vidya-yati-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16

cp .env.example .env
# edit .env: DATABASE_URL (matches the Docker command above by default),
# AUTH_SECRET (generate with `openssl rand -base64 32`)

npx prisma validate      # confirm the schema is well-formed
npx prisma migrate dev   # creates the database tables

npm run dev              # http://localhost:3000
```

## What's already here

- `prisma/schema.prisma` — the full data model (41 tables), written from
  the design phase's data dictionary. Not yet run against a real database
  — `prisma migrate dev` above is the first real test of it.
- `app/globals.css`, `tailwind.config.ts` — the approved design tokens
  (colors, fonts), copied exactly from the clickable prototype.
- `design-reference/sections/` — one HTML/CSS fragment pair per screen
  from the clickable prototype the client already reviewed. This is the
  interaction spec: what each screen shows, what clicking things does,
  what the different states look like. Open a `.section.html` file in a
  browser (or via the published prototype link in `CLAUDE.md`) to see it
  rendered, or read the HTML/CSS directly.
- `design-reference/data-model.html` — the plain-language version of the
  Prisma schema, open it in a browser for field-by-field descriptions.

## What's not here yet

Everything else — this is a scaffold, not a working app. No auth is wired
up, no routes beyond the placeholder homepage exist, and the schema hasn't
been validated against a running Postgres instance. `CLAUDE.md` has a
suggested build order.
