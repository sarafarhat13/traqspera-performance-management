# Modus 2.x upgrade on traqspera-web (`TQ_UX`)

Upgrade **before** merging Performance Management so both legacy islands and the new module share one design system.

## 1. Packages

Remove (deprecated):

- `@trimble-oss/modus-web-components`
- `modus-react-components` / `@trimble/modus-react-components` (names vary by branch)

Install (pin exact versions; match React major):

```bash
MVC=$(npm view @trimble-oss/moduswebcomponents version)
npm install @trimble-oss/moduswebcomponents@${MVC} --save-exact
# React 18 example:
npm install @trimble-oss/moduswebcomponents-react@${MVC}-react18 --save-exact
# React 19:
# npm install @trimble-oss/moduswebcomponents-react@${MVC}-react19 --save-exact
```

Remove duplicate legacy CSS imports from `node_modules/modus-web-components`.

## 2. Global styles (order matters)

In the main JS entry (e.g. `resources/assets/js/app.jsx` or `bootstrap.js`):

```js
import '@trimble-oss/moduswebcomponents/modus-wc-styles.css';
// app / Tailwind after Modus
import '../sass/app.scss';
```

Link Modus Icons early in the master Blade layout — see [modus2-bootstrap.js](../resources/assets/js/modus2-bootstrap.js).

## 3. Theme provider

Wrap each React root (or a shared `AppProviders.jsx`) with:

```jsx
import { ModusWcThemeProvider } from '@trimble-oss/moduswebcomponents-react';
import { setAssetPath } from '@trimble-oss/moduswebcomponents/components';

setAssetPath(`${window.location.origin}/`);

<ModusWcThemeProvider initialTheme="modus-modern-light">
  {children}
</ModusWcThemeProvider>
```

Run the inline FOUC script on `<html>` (`data-theme`, `data-mode`, `light`/`dark` class) before paint — copy from prototype [prototype/src/theme.ts](../../prototype/src/theme.ts) or modus-blueprint.

## 4. Component migration cheat sheet

| Modus 1.0 | Modus 2.x |
|-----------|-----------|
| `ModusButton` `onClick` | `ModusWcButton` `onButtonClick` |
| `ModusTextInput` | `ModusWcTextInput` `onInputChange` → `e.detail.target.value` |
| Checkbox `checked` | `ModusWcCheckbox` `value` + `e.detail.target.checked` |
| `ModusModal` `visible` | `modus-wc-modal` + `dialog.showModal()` / `close()` |
| `ModusTabs` | `ModusWcTabs` `tabs` + `activeTabIndex` + `onTabChange` |
| `ModusTable` / react-table | `ModusWcTable` or keep react-table for untouched pages |

Grep-driven pass:

```bash
rg 'ModusButton|ModusModal|ModusTextInput|ModusTabs' resources/assets/js
```

## 5. Assets

After `npm install`, copy Stencil assets if your build does not:

```bash
mkdir -p public/modus-assets
cp -R node_modules/@trimble-oss/moduswebcomponents/assets/* public/modus-assets/
```

Ensure `setAssetPath` points at `/` or your `ASSET_URL`.

## 6. Exit criteria

- `npm run production` (or Mix) succeeds
- No console errors on navbar, employee management, and one form + modal flow
- `package.json` has no legacy `modus-web-components` dependency
- Performance island (`performance-management.js`) loads with shared theme
