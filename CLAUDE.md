# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Secret Santa ("amigo secreto") web app: Node.js + Express 5 backend with SQLite (better-sqlite3), and an AngularJS 1.x frontend served as static files from `client/`. User-facing text, comments, log messages and commit messages are in Brazilian Portuguese — keep that convention.

## Commands

```bash
nvm use                 # Node 24 (.nvmrc); Node >= 22 is required (better-sqlite3 13 segfaults on older versions)
npm install
npm run dev             # node --watch server.js, port 3333 (PORT)
npm start
npm test                # TEST=1 jest --no-cache
npx jest src/tests/event-api.test.js          # single test file
npx jest src/tests/event-api.test.js -t "nome do teste"   # single test (set TEST=1 if the file doesn't)
./limpabase.sh          # wipes all rows from the SQLite DB
docker compose up -d --build   # production-style run (data/ and logs/ mounted as volumes)
```

Manual integration scripts that hit real providers (need `.env` credentials): `node scripts/test-email.js`, `node scripts/test-sms.js <celular> [assunto] [mensagem]`. `scripts/migrate-json-to-sqlite.js` migrates the legacy JSON data store.

CI (`.github/workflows/node.js.yml`): every push to `main` runs `npm test` and, if green, deploys over SSH (`git pull` + `docker compose up -d --build`). Pushing to `main` therefore deploys to production.

## Architecture

**Module aliases.** Code imports via `@config`, `@utils/...`, `@models/...`, `@services/...`, `@controllers/...`, `@routes/...`, `@classes/...` (registered with `module-alias` in `package.json`). Jest does not use module-alias — the same mappings are duplicated in `jest.config.js` `moduleNameMapper`. When adding a new alias, update both.

**Request pipeline** (`src/app.js`): helmet with a strict CSP (scripts/styles only from self and cdn.jsdelivr.net) → `/webhooks` mounted *before* `express.json()` because webhook signature verification needs the raw body → JSON parser → morgan (logs path without query string, since query strings carry tokens) → `accessGate` → rate-limited API routers (`/event`, `/participant`, `/wishlist`, `/address`, `/auth`) → static `client/` (default page `event.html`) → 404 → global error handler. Controllers are async and may throw; errors with status < 500 return their message only if `err.name === 'ValidationError'` (see `src/utils/validation.js`).

**Data layer.** `SQLiteDataSource` (`src/classes/sqliteDataSource.js`) stores each record as a JSON document in a `(id TEXT PRIMARY KEY, data TEXT)` table; filters use `json_extract`, and optional JSON-field indexes are declared per model (e.g. participants index `emailMessageId`, `smsMessageId`). Models (`src/models/*`) are singleton `BasicModel` instances over tables `events`, `participants`, `wishlist`. `get(id)`/`find(filter)` always return arrays. `update()` merges fields into the existing document and accepts `{ onlyIf }`, a predicate evaluated inside a transaction — used for atomic state transitions (e.g. claiming `event_drawn` so a draw can't run twice). There are no schema migrations: adding a field just means writing it into the document. With `TEST` set, the DB is `:memory:`; otherwise `DB_FILE` or `data/secretsanta.db`.

**Domain model.** An event stores `host` (participant id), `participants` (array of participant ids, excluding the host), `adminToken`, `event_drawn` (timestamp) and `participants_drawn` (`[{friend, receiver}]` ids). Participants carry `eventId`, `editToken` and email/SMS delivery tracking fields. A wishlist record's id is the participant's id.

**Token-based access instead of user accounts.**
- Organizer panel (`painel.html`, `/event/:id/organizer/*`) requires the `X-Admin-Token` header matching the event's admin token (`OrganizerController.requireOrganizer`). Legacy `?draw=` links on `GET /event/:id` redirect to the panel.
- Participants/wishlists are reached through secret links sent by email/SMS (`editToken`).
- `GET /event/:id` returns only `toPublicEvent` fields; the panel view never exposes who drew whom or wishlist contents. Preserve these information boundaries when changing responses.
- `accessGate` (`src/middlewares/accessGate.js`) is an optional site-wide password (`ACCESS_GATE_ENABLED`/`ACCESS_PASSWORD`), deny-by-default with an explicit allowlist of public pages/prefixes. New public pages or API prefixes must be added to `PUBLIC_PAGES`/`PUBLIC_PREFIXES`, and new API prefixes also to the JSON-404 regex in `app.js`.

**Draw and notifications.** `drawService` performs the draw and dispatches messages per channel, toggled by `NOTIFY_EMAIL` (default on), `NOTIFY_SMS`, `NOTIFY_WHATSAPP`. Email (Resend, `utils/emailSender.js`) and SMS (SMS Gateway for Android, `utils/smsSender.js`) go through tracked services (`services/notificationService.js`, `services/smsNotificationService.js`) that:
- send via an in-process sequential promise queue (rate limit for Resend; per-number spacing for SMS) — sends are fire-and-forget from the request; tests `await notifications.idle()` to wait for them;
- record status on the participant document and update it from signed webhooks (`/webhooks/resend`, `/webhooks/sms`) or by polling the provider when the panel loads (`refreshPendingStatuses`), with a status rank so late events don't regress status;
- enforce resend cooldowns exposed to the panel.
Message bodies come from `src/templates/` rendered by `utils/template.js`. Links in messages use `APP_URL`.

**Config.** All env vars are read in `src/config/index.js` (the reference for `.env`). Many intervals are zeroed when `TEST` is set.

**Frontend.** Plain AngularJS (`client/libs/angular.min.js`, module `secretSanta`) with controllers/services/directives under `client/assets/js/`, Bootstrap and flatpickr from jsDelivr. No build step — edit files directly. Each HTML page loads its own scripts explicitly, so a new service/directive must be added to the `<script>` tags of every page that uses it.

## Tests

Jest + supertest API tests in `src/tests/`. Each test file sets `process.env.TEST` before requiring `../app`, so it runs against an in-memory DB. `jest.setup.js` forces `NOTIFY_EMAIL/SMS/WHATSAPP=false` before loading `.env` so tests never send real messages; tests that exercise sending override the `NOTIFY_*` env vars at the top of the file and `jest.mock` the sender util (`../utils/emailSender`, `../utils/smsSender`) — see `organizer-api.test.js` and `sms-tracking.test.js`.
