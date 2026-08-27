# Performance Management — screen inventory (from Make export)

Source: `Performance Management V 4.make` design prompt + `ai_chat.json` component map.

## Roles

| Role | Primary screens |
|------|-----------------|
| HR Admin | Dashboard, template list, template editor, cycle launcher |
| Employee | Dashboard, self-evaluation, acknowledgement, completed review |
| Manager | Team status dashboard, side-by-side manager review |
| Shared | Review details (tabs: Overview, Self Evaluation, Manager Review, Side-by-Side) |

## React module boundaries

| Module | Responsibility |
|--------|----------------|
| `layouts/AppShellLayout.tsx` | Navbar + side nav + main column |
| `components/RoleSwitcher.tsx` | Prototype-only HR / Employee / Manager demo |
| `components/HRAdminDashboard.tsx` | Cycles, recent reviews, launch cycle |
| `components/TemplateList.tsx` | Template table + navigation to editor |
| `components/TemplateEditor.tsx` | Create/edit template + up to 10 questions |
| `components/EmployeeDashboard.tsx` | Assigned tasks / review status |
| `components/SelfEvaluationForm.tsx` | Mobile-first textarea form |
| `components/AcknowledgementScreen.tsx` | Final sign-off |
| `components/ManagerDashboard.tsx` | Team review status table |
| `components/ManagerReviewForm.tsx` | Employee answers + manager fields |
| `components/PerformanceReviewDetails.tsx` | Tabbed read-only detail view |
| `context/PerformanceContext.tsx` | State + localStorage |
| `data/seed.ts` | Mock people, templates, cycles, reviews |

## MVP constraints

- Text-only answers (`modus-wc-textarea`); no rating scales
- Up to 10 questions per template
- Two workflow paths: with and without self-evaluation
- Task-assignment framing (sequential phases)

## Happy-path flow

1. HR Admin creates or edits template → launches cycle
2. Employee completes self-evaluation (if enabled)
3. Manager completes review with side-by-side comparison
4. Employee acknowledges on tablet-friendly screen
5. All roles can open completed review details (read-only)
