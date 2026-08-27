# Traqspera-web integration guide (`TQ_UX` branch)

This document supports porting the **standalone Modus 2.x prototype** into `traqspera-web` on branch `TQ_UX` after UX sign-off.

## Prerequisites

1. Re-authorize GitHub CLI for `Trimble-Construction` (SAML SSO).
2. Clone: `git clone -b TQ_UX https://github.com/Trimble-Construction/traqspera-web.git`
3. Confirm Modus version in `package.json` (expected: **Modus 1.0** — `modus-react-components` / `modus-web-components` ~0.41).

## Target module layout (Laravel + React island)

| Layer | Path / artifact |
|-------|------------------|
| React module | `resources/assets/js/components/performance-management/` |
| Entry mount | `document.getElementById('performance-management')` pattern (see `EmployeeManagement.js`) |
| Blade shell | `resources/views/performance-management/index.blade.php` |
| Controller | `app/Http/Controllers/PerformanceManagementController.php` |
| Routes | `routes/web.php` |
| Navigation | `App\Services\NavigationService::getNavigationOptions()` |
| Bundle | Register in `resources/assets/js/app.jsx` |

Reuse existing chrome:

- `TraqsperaPage` layout primitives
- `shared-components` tables/modals
- `ModusComponents.js` wrappers — **do not** add Modus 2 packages to `traqspera-web` without an explicit upgrade project.

## Modus 2.x (prototype) → Modus 1.0 (`TQ_UX`) mapping

| Prototype (Modus 2) | Traqspera 1.0 |
|---------------------|----------------|
| `ModusWcButton` + `onButtonClick` | `ModusButton` + documented click handler |
| `ModusWcTextInput` / `Textarea` + `onInputChange` | Verify `detail` in `ModusComponents.js` |
| `value` on checkbox/switch | May use `checked` prop in 1.0 |
| `modus-wc-modal` + `showModal()` / `<dialog>` | `ModusModal` + `visible` prop |
| `modus-wc-tabs` `ITab[]` + `activeTabIndex` | `ModusTabs` with `id` on tab objects |
| `modus-wc-table` `columns`/`data` | Often `react-table` + Traqspera table helpers |
| `ModusWcTypography` `label` prop | `ModusTypography` or plain text per existing pages |
| `customClass` on hosts | Class props on `Modus*` React wrappers |

Use Modus MCP only after upgrading `traqspera-web` to `@trimble-oss/moduswebcomponents` ≥ 1.0.1; until then, grep existing `TQ_UX` usages.

## Domain model (API contract sketch)

Types in `prototype/src/types/index.ts`:

- `ReviewTemplate` — `id`, `name`, `description`, `questions[]` (`id`, `label`, `required`, `order`, `type: 'textarea'`)
- `ReviewCycle` — `id`, `name`, `templateId`, `dueDate`, `includesSelfEvaluation`, `status`, `employeeIds[]`
- `PerformanceReview` — `id`, `cycleId`, `employeeId`, `managerId`, `status`, `selfEval`, `managerReview`, `acknowledgement`

Statuses: `not_started`, `self_eval_pending`, `manager_pending`, `acknowledgement_pending`, `completed`.

## HRIS task framework

The Make prompt references an HRIS Task Management framework. The separate [HR-Tasks](https://github.com/sarafarhat13/hr-tasks) prototype models dynamic form schemas and task completion — align backend task assignment with review phases:

1. Self-evaluation task (optional per cycle)
2. Manager review task
3. Employee acknowledgement task

## Prototype artifacts to drop in production

- `RoleSwitcher` demo control
- `localStorage` persistence (replace with server props + API)
- Native `<dialog>` quick launch modal in HR dashboard (replace with `ModusModal` or Traqspera modal pattern)

## Side navigation entry (example)

Add a Performance item alongside HR modules in `NavigationService`, with icon `clipboard` or `performance` (validate against Modus Icons 1.0 set).

## Recommended port sequence

1. Ship read-only **review details** + manager team list against mock API.
2. Add template CRUD APIs + HR admin screens.
3. Wire employee self-eval and acknowledgement (mobile routes in Traqspera Mobile separately).
4. Replace prototype mock state with Laravel controllers and policies.
