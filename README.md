# VYRAL Studio

A Higgsfield-style AI image & video studio built on top of
[Open-Generative-AI](https://github.com/Elsen001/Open-Generative-AI) and MuAPI.

It adds the missing SaaS layer to the open-source studio:

- 587 models imported from the repo's model registry (image, video, audio)
- registration + login (scrypt hashes, httpOnly sessions)
- plans and credits, with an estimated credit price per generation
- **shared MuAPI pool** — the admin buys one MuAPI package, every user
  generates from that balance; no user ever sees or needs an API key
- manual checkout (bank/crypto reference) with admin approval, optional Stripe
- admin panel: revenue, orders, users, credits, model usage, provider pool,
  plans, MuAPI key, showcase videos
- video-first landing page with a viral showcase wall
- image studio and video studio wired to the real MuAPI submit → poll flow

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Default admin (from `.env.local`):

```
admin@vyral.studio
VyralAdmin!2026
```

> Change `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `APP_SECRET` before deploying.
> `DEMO_CHECKOUT=true` instantly credits a purchase so you can test the full
> flow. Set it to `false` for manual admin approval, or add Stripe keys.

## Configure MuAPI

1. Buy a plan at [muapi.ai](https://muapi.ai) (the $50 package maps to the
   default shared pool in this app).
2. Log in as admin → **Admin → Settings**.
3. Paste the MuAPI API key and set the pool budget (default `$50`).
4. Save. Every user generation now runs through that key on the server.

The key is stored in SQLite and never sent to the browser.

## How credits work

- `1 credit = $0.01` retail by default (editable in admin settings).
- Image generations cost ~5 credits, videos ~45–120 credits depending on
  resolution and duration.
- A plan purchase adds its credit amount to the user.
- Credits are deducted on submit and automatically refunded when MuAPI fails.
- The admin dashboard estimates how much of the shared MuAPI budget each
  generation consumed and shows the remaining pool.

The estimate function lives in `lib/credit-rules.js`; adjust the base prices
there or via admin settings.

## Stripe (optional)

Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, expose
`/api/webhooks/stripe`, and set the webhook to `checkout.session.completed`.
Without Stripe, purchases create a pending order; the admin approves it from
**Admin → Orders**.

## Deploy

```bash
npm run build
npm start
```

SQLite lives in `data/vyral.db` (ignored by git). For Vercel you need a
persistent database or a mounted volume; a small VPS / Docker host is the
simplest target. The app is a standard Next.js 15 project.

## Project layout

```
app/                 pages + API routes
  api/auth           register / login / logout / me
  api/generate       MuAPI submit (credit check + server-side key)
  api/generations    polling, refunds, history
  api/orders         checkout orders
  api/admin          overview, orders, users, plans, settings, showcase
  studio/image       image studio
  studio/video       video studio
components/          UI components
lib/                 db, auth, muapi, credits, catalog, plans
data/catalog.json    587 models generated from the repo
scripts/build-catalog.mjs  regenerates the catalog from the repo
```

## Regenerate the model catalog

```bash
npm run catalog
```

Requires the `Open-Generative-AI-main` folder next to this project (the
extracted repo). The script imports its `packages/studio/src/models.js` and
writes `data/catalog.json`.
