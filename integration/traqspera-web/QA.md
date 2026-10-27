# Performance Management on traqspera-web — QA checklist

Run after merging the kit and publishing `performance-management.js` / `.css`.

## Build gates (HR Performance Management repo)

```bash
cd prototype
npm run build
npm run build:traqspera-island
npm run lint
```

## Laravel (traqspera-web)

- `php artisan migrate`
- `php artisan db:seed --class=PerformanceManagementSeeder`
- Authenticated user can open `/performance`
- `GET /api/performance-management/state` returns JSON (200)
- `PUT /api/performance-management/state` persists after template edit (refresh page / re-fetch)

## Functional (prototype README test plan)

Use real HR / manager / employee roles instead of demo role switcher:

- TC-HR-1 through TC-HR-4
- TC-EMP-1 through TC-EMP-3
- TC-MGR-1 through TC-MGR-2

## Console / Modus

- No errors on load, navigation, tab change, submit
- Icons render (Modus Icons font loaded globally)
- Forms use `inputChange` paths (no `[object InputEvent]` in saved data)

## Island-only smoke (no Laravel)

Serve `integration/traqspera-web/public/demo.html` with a static server and open in browser; uses `dataSource: 'localStorage'`.
