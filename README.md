# MasterFlow working prototype

MasterFlow is a dependency-free, multipage browser prototype for **Problem #4 — Ticketing System Replacement**.

It replaces a complex ServiceNow catalog experience with a simple, AI-assisted request front door, gives the Service Team a fast Work Center, gives Queue Managers self-service configuration and reporting, gives the Enterprise Administrator governance, triage, cost, and access controls, and provides a credible ServiceNow transition path — all while preserving the queues, routing, SLAs, approvals, ownership, and controls the company already trusts.

The authoritative product overview is the in-app **Project Summary** page. The full capability list is in `docs/MASTERFLOW_CAPABILITY_INVENTORY.md`.

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

- Windows: double-click `START_MASTERFLOW.bat` when Python is installed.
- macOS/Linux: `./start_masterflow.sh`

## Working pages

### Employee (requester)
- `index.html` — natural-language request landing page
- `smart-request.html` — AI interpretation + dynamic form renderer
- `request-submitted.html` — numbered request confirmation
- `my-tickets.html` — open and historical requests
- `help-articles.html` — searchable self-service knowledge

### Service Team / operations
- `assigned-work.html` — Work Center (personal + team inbox, cost capture at resolution)
- `ticket-queues.html` — Queue Manager (queue health, automatic-assignment rules, direct flow publishing)
- `admin-templates.html` — Flow Studio (queue-owned, no-code request-flow configuration)
- `reporting.html` — service performance, SLA, owned-category, and Ticket Cost & Spend reporting

### Administrator
- `admin-rules-access.html` — Enterprise Governance (attention board, thresholds, guardrails, People & Access, audit)
- `enterprise-triage.html` — Enterprise Triage (low-confidence review, rerouting, improvement signals)
- `admin-migration.html` — ServiceNow Transition (role-scoped status, mapping, reconciliation, actions, waves)
- `project-summary.html` — product overview, capability inventory, Problem #4 alignment, transition strategy

Use the **Viewing as** selector to switch among Employee, Service Team, and Administrator. Within the Service Team, a role switch separates Queue Manager from Service Team Member. Production roles would come from SSO, not a user-controlled toggle.

## Core demonstration

1. Enter `Printer stopped working at Pack Station 14` and complete the guided request.
2. Confirm the numbered record appears in My Requests and the team queue, auto-assigned by a queue rule.
3. Trigger a `Shipping is stopped` P1 through the direct fast lane (Bat Phone).
4. As Service Team, resolve a ticket and record its cost outcome.
5. As Administrator, review Enterprise Governance, reroute an Enterprise Triage request, and check ServiceNow Transition status.

## Architecture

- Plain HTML, CSS, and JavaScript; one HTML page and one page controller per screen
- `assets/js/store.js` — fictional localStorage state (tickets, rules, cost, access, transition data)
- `assets/js/templates.js` — request definitions and deterministic classification
- `assets/js/layout.js` — navigation, role gating, shared P1 intake, dialogs
- `assets/css/styles.css` — shared visual system

## Prototype boundaries

All users, tickets, costs, and transition status are fictional or modeled. The prototype does not connect to ServiceNow, ERP, Outlook, or SSO. Classification is deterministic and local. No sensitive data or credentials are included. MasterFlow is focused entirely on Problem #4.
