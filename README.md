# MasterFlow working prototype

MasterFlow is a dependency-free, multipage browser prototype for two Master Electronics problems:

1. Replace a complex ServiceNow catalog experience with a simple AI-assisted request front door while preserving existing team queues, required fields, SLAs, and approvals.
2. Surface controlled freight-savings opportunities before cost is incurred without creating work for every order or disrupting warehouse execution.

## Run it

From this folder:

```bash
python serve.py
```

Open:

```text
http://127.0.0.1:8000/index.html
```

No package installation, API key, build step, database, or internet connection is required.

Windows: double-click `START_MASTERFLOW.bat` when Python is installed.

macOS/Linux:

```bash
./start_masterflow.sh
```

## Working pages

### Everyone / requester

- `index.html` — minimal natural-language request landing page
- `smart-request.html` — AI interpretation plus dynamic existing-form renderer
- `request-submitted.html` — numbered request confirmation
- `my-tickets.html` — open and historical requests
- `help-articles.html` — searchable self-service knowledge

### Ticket receiver / operations

- `assigned-work.html` — personal operational inbox
- `ticket-queues.html` — team queues, assignment, priority, and SLA risk
- `freight-optimization.html` — order opportunities, guardrails, and decisions
- `reporting.html` — service performance and freight-savings outcomes

### Administrator

- `admin-templates.html` — no-code request-template, queue, field, SLA, and trigger configuration
- `admin-rules-access.html` — routing, approval, role, SLA, and threshold rules
- `project-summary.html` — visual product decisions and Claude handoff summary

Use the **Demo view** selector to switch among Regular user, Ticket receiver, and Administrator. Production roles would be assigned by SSO, not by a user-controlled toggle.

## Core demonstration

1. Enter `I need ink for the Zebra printer at Pack Station 14`.
2. Review the selected Printer Ink Request, prefilled values, queue, confidence, and missing fields.
3. Submit and confirm the numbered record appears in My Requests and the receiver queue.
4. Create a `Shipping is stopped` P1 through the direct fast lane.
5. Open freight opportunity ABI173 and record a controlled decision.
6. As Administrator, change a request template without editing code.

## Architecture

- Plain HTML, CSS, and JavaScript
- One HTML page and one page controller per screen
- `assets/js/store.js` for fictional localStorage state
- `assets/js/templates.js` for dynamic request definitions and prototype classification
- `assets/js/layout.js` for navigation, role gating, shared P1 intake, and dialogs
- `assets/css/styles.css` for the shared visual system

## Prototype boundaries

All users, customers, orders, costs, carrier details, emails, and system behavior are fictional or simulated. The prototype does not connect to ServiceNow, ERP, OMS, OnlineComponents.com, Outlook, SSO, carrier APIs, or live order holds. No sensitive data or credentials are included.

## Claude Code handoff

Open this entire unzipped folder in Claude Code, then paste `PASTE_THIS_INTO_CLAUDE.txt`. Claude should read `CLAUDE.md` and `FILE_MAP.md` first and only inspect files relevant to the current task.
