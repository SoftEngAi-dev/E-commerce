# Local setup

## Core
1. Install Node.js 22.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and provide non-placeholder admin and webhook secrets.
4. Start PostgreSQL with `docker compose up -d postgres`.
5. Run `npm run check`.

## Web
1. `cd apps/web`
2. `npm install`
3. `npm run dev`
4. Open the local Next.js URL.

The web layer is intentionally decoupled from provider credentials. Connect the core HTTP/API and real commerce data before enabling production checkout.
