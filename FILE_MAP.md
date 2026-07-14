# MasterFlow file map

Use this map to keep Claude context small.

## Shared files

| File | Purpose | Read only when |
|---|---|---|
| `assets/css/styles.css` | Shared visual system and responsive behavior | Layout, styling, or mobile behavior changes |
| `assets/js/store.js` | Fictional seed data, localStorage, ticket/freight state, rules | Persistence or cross-page data changes |
| `assets/js/templates.js` | Dynamic request definitions, classifier, field extraction | Request matching, fields, queue, SLA, or template behavior changes |
| `assets/js/layout.js` | Header, navigation, role gating, P1 dialog, shared ticket dialog | Global navigation, roles, P1, or shared UI changes |

## Requester flow

| Page | Script | Purpose |
|---|---|---|
| `index.html` | `assets/js/pages/home.js` | Minimal request input and suggestions |
| `smart-request.html` | `assets/js/pages/smart-request.js` | Selected request, confidence, dynamic fields, submission |
| `request-submitted.html` | `assets/js/pages/request-submitted.js` | Confirmation and ticket summary |
| `my-tickets.html` | `assets/js/pages/my-tickets.js` | Request history and detail |
| `help-articles.html` | `assets/js/pages/help-articles.js` | Knowledge search |

## Receiver / operations

| Page | Script | Purpose |
|---|---|---|
| `assigned-work.html` | `assets/js/pages/assigned-work.js` | Personal work inbox |
| `ticket-queues.html` | `assets/js/pages/ticket-queues.js` | Team queues, assignment, P1, SLA |
| `freight-optimization.html` | `assets/js/pages/freight-optimization.js` | Freight opportunities and decisions |
| `reporting.html` | `assets/js/pages/reporting.js` | Ticket and freight outcomes |

## Administrator

| Page | Script | Purpose |
|---|---|---|
| `admin-templates.html` | `assets/js/pages/admin-templates.js` | No-code request-template configuration |
| `admin-rules-access.html` | `assets/js/pages/admin-rules-access.js` | Thresholds, routing, approvals, roles |
| `project-summary.html` | none beyond shared layout | Visual product and Claude handoff summary |

## Context documents

| File | Use |
|---|---|
| `docs/CLAUDE_PROJECT_SUMMARY.md` | Compact complete product context |
| `docs/PRODUCT_REQUIREMENTS.md` | Original ticketing and freight requirement coverage |
| `docs/DECISION_LOG.md` | Reasoning behind settled workflow decisions |
| `docs/DEMO_SCRIPT.md` | Judge-facing click path |
| `docs/TEST_RESULTS.md` | Latest verified prototype behavior |

## Efficient task pattern

For a small page change, read:

1. `CLAUDE.md`
2. `FILE_MAP.md`
3. target HTML
4. target page script
5. only the relevant CSS section

Do not inspect screenshots, old ZIP files, every document, or unrelated pages.
