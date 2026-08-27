# Traqspera — Performance Management Prototype

Interactive React prototype for **traditional office performance reviews**, rebuilt from the Figma Make export `Performance Management V 4.make` using **Trimble Modus Web Components 2.x**.

## Live demo

After GitHub Pages deploy: `https://sarafarhat13.github.io/traqspera-performance-management/`

## Run locally

```bash
cd prototype
npm install
npm run dev
```

Open the URL printed by Vite (typically `http://localhost:5173`).

## Stack

- React 19 + Vite + TypeScript + Tailwind CSS v4
- `@trimble-oss/moduswebcomponents` 1.15.1 + React wrappers

## What's included

- **HR Admin** — Dashboard, template list/editor (up to 10 textarea questions), launch review cycle
- **Employee** — Mobile layout toggle, self-evaluation, acknowledgement sign-off, review details
- **Manager** — Team status, side-by-side manager review form, review details
- **Shared** — Tabbed review details (Overview, Self evaluation, Manager review, Side-by-side)
- **Persistence** — `localStorage` for templates, cycles, reviews, and demo role

## Prototype-only controls

- **View as role** switcher (HR Admin / Employee / Manager) at the top of every view
- **Desktop / Mobile** toggle on the employee dashboard (layout width)

## Deploy to GitHub Pages

```bash
cd prototype
npm run deploy
```

Requires `gh-pages` and a `main` branch push (or run deploy manually after `npm run build`).

---

# Test plan

Manual UI testing in a browser. No backend; state persists in `localStorage` until cleared.

## Before you start

1. Use the **View as role** control to switch personas.
2. A hard refresh keeps data unless you clear site data for the origin.
3. Invalid icon names are validated against Modus Icons — shell nav uses `dashboard`, `clipboard`, `person`, `people_group`.

## HR Admin

**TC-HR-1 — Template list**

1. Switch to **HR Admin**.
2. Open **Templates** in the side nav.
3. Confirm **Annual Performance Review**, **New Hire Check-In**, and **90 Days at Work** appear (no untitled templates).

**TC-HR-2 — Edit template**

1. Click **Edit** on Annual Performance Review.
2. Change a question label, toggle **Required**, click **Save template**.
3. Return to list — changes should persist after refresh.

**TC-HR-3 — Launch cycle**

1. On dashboard, click **Launch cycle** → **Launch**.
2. Confirm new reviews appear in **All reviews** table.

**TC-HR-4 — Review details**

1. Click **View details** on any review.
2. Exercise all four tabs; **Side-by-side** shows employee vs manager columns.

## Employee

**TC-EMP-1 — Self-evaluation**

1. Switch to **Employee** (Jane Alvarez).
2. Click **Start self-evaluation** for pending review (David Park’s review if Jane’s is complete).
3. Submit — status moves to manager pending.

**TC-EMP-2 — Mobile layout**

1. On employee dashboard, click **Mobile**.
2. Open self-evaluation — form should use narrow column.

**TC-EMP-3 — Acknowledgement**

1. Switch role to Employee **Sarah Miller** (or use Sarah’s seeded acknowledgement-pending review).
2. Complete acknowledgement checkbox → **Complete acknowledgement**.

## Manager

**TC-MGR-1 — Manager review**

1. Switch to **Manager** (Mike Chen).
2. Open **Complete review** for a pending item.
3. Submit side-by-side manager feedback.

**TC-MGR-2 — Team list**

1. Confirm all direct reports appear with status badges.
2. **View details** opens shared tabbed detail view.

## Console / accessibility smoke

- DevTools console: no errors on load, role switch, tab change, or form submit.
- Keyboard: tab through primary actions; acknowledgement requires checkbox before submit.
- One `<h1>` per view; `main` landmark owns scroll.

## JSON handoff shapes

See `prototype/src/types/index.ts` and seed data in `prototype/src/data/seed.ts` for API field names.
