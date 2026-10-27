# Performance Management — traqspera-web merge kit (`TQ_UX`)

Drop-in Laravel + JS assets for **Modus 2** Performance Management. Merge into [traqspera-web](https://github.com/Trimble-Construction/traqspera-web) on branch `TQ_UX` after SAML access and the Modus 2 upgrade ([MODUS2_UPGRADE.md](./docs/MODUS2_UPGRADE.md)).

## 1. Modus 2 upgrade first

Complete [docs/MODUS2_UPGRADE.md](./docs/MODUS2_UPGRADE.md) on a branch such as `feature/modus-2-upgrade` and regression-test existing islands.

## 2. Copy PHP / views / routes

| From this kit | Into traqspera-web |
|---------------|-------------------|
| `app/Http/Controllers/PerformanceManagementController.php` | same |
| `app/Http/Controllers/Api/PerformanceManagementStateController.php` | same |
| `app/Models/PerformanceManagementState.php` | same |
| `app/Policies/PerformanceManagementPolicy.php` | same |
| `database/migrations/*_create_performance_management_states_table.php` | `database/migrations/` |
| `database/seeders/PerformanceManagementSeeder.php` | `database/seeders/` |
| `resources/views/performance-management/index.blade.php` | same |
| `routes/performance-management.php` | require from `routes/web.php` |

### `routes/web.php`

```php
require __DIR__.'/performance-management.php';
```

### Navigation

Add the Performance item from [patches/NavigationService.performance.php](./patches/NavigationService.performance.php) into `App\Services\NavigationService::getNavigationOptions()` (adjust route name / permission key to match your app).

## 3. React island bundle

From the **HR Performance Management** repo root:

```bash
cd prototype
npm run build:traqspera-island
```

Publish artifacts:

- `integration/traqspera-web/public/js/performance-management.js`
- `integration/traqspera-web/public/css/performance-management.css`

Copy both to `traqspera-web/public/js/` and `public/css/` (or your Mix `public` output path).

## 4. Blade shell

`resources/views/performance-management/index.blade.php` loads Modus styles (if not global), the island CSS/JS, and calls:

```js
window.TraqsperaPerformance.mount(
  document.getElementById('performance-management'),
  { apiBaseUrl: '…', initialView: 'hr_dashboard', currentUserPersonId: '…' }
);
```

`currentUserPersonId` should map from the authenticated Laravel user (replace demo id in controller).

## 5. Database

```bash
php artisan migrate
php artisan db:seed --class=PerformanceManagementSeeder
```

API (auth required):

- `GET /api/performance-management/state` — bootstrap payload (templates, cycles, reviews, groups, people, activePersonId)
- `PUT /api/performance-management/state` — persist the same shape the prototype stored in `localStorage`

## 6. Permissions

Register `PerformanceManagementPolicy` in `AuthServiceProvider` and gate routes with `can:viewPerformanceManagement` (customize to HR / manager roles).

## 7. Verify

Run the manual test plan in the prototype [README.md](../../README.md) against your integrated URL (no demo role switcher — use real roles).
