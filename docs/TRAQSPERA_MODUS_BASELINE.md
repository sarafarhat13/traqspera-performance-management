# traqspera-web (`TQ_UX`) — environment and Modus 1.0 baseline

## Repository access

Clone requires **Trimble-Construction** GitHub SAML SSO on your token:

```bash
gh auth refresh -h github.com -s repo
# Open the enterprise SSO URL if prompted, then:
git clone -b TQ_UX https://github.com/Trimble-Construction/traqspera-web.git
```

If `git clone` returns **403**, authorize **GitHub CLI** (or your PAT) for the Trimble enterprise at the URL Git prints.

## Local run (typical)

Follow `traqspera-web` README after clone. Common steps:

```bash
composer install
cp .env.example .env && php artisan key:generate
npm install
npm run dev   # or mix watch — confirm script name in package.json
php artisan serve
```

Smoke **Employee Management** (or any existing React island) before merging Performance Management.

## Modus 1.0 inventory (run on `TQ_UX` root)

Record counts before the Modus 2 upgrade:

```bash
rg -l 'modus-react-components|modus-web-components|@trimble-oss/modus-web-components' --glob '*.{js,jsx,ts,tsx,json}'
rg -c 'ModusButton|ModusModal|ModusTabs|ModusTypography' resources/assets/js
rg -l 'ModusComponents' resources/assets/js
```

Expected on `TQ_UX`: **Modus 1.0** (`modus-react-components` / legacy web components ~0.41). After upgrade, only `@trimble-oss/moduswebcomponents` (+ `-react` for your React major) should remain.

## Merge package from this repo

Copy or subtree-merge [`integration/traqspera-web/`](../integration/traqspera-web/) into the Laravel app using [integration/traqspera-web/README.md](../integration/traqspera-web/README.md).

Build the React island from the prototype:

```bash
cd prototype
npm install
npm run build:traqspera-island
```

Copy `integration/traqspera-web/public/js/performance-management.js` (and CSS) into `traqspera-web/public/` per the integration README.
