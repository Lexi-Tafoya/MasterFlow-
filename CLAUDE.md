# MasterFlow instructions for Claude Code

## Existing project — do not rebuild

This folder contains a working plain HTML/CSS/JavaScript prototype. Preserve its architecture and improve it incrementally. Do not replace it with React, Next.js, a backend, a database, a package manager, or live integrations unless the user explicitly changes scope.

## Read order

1. Read this file.
2. Read `FILE_MAP.md`.
3. Read only the target page and its matching page script.
4. Read `docs/CLAUDE_PROJECT_SUMMARY.md` only when business context is needed.
5. Read shared CSS/store/layout/template files only when the requested change affects shared behavior.

Do not reread or rewrite the whole project for a page-level task.

## Product goal

MasterFlow gives every employee one simple way to ask for help. AI selects an existing request type, pre-fills known data, renders that template's required fields, and asks only for missing information. Existing team queues remain the routing authority.

A separate Freight Optimization workspace scans all eligible orders but creates work only when a person must decide, approve, investigate, or communicate.

## Locked decisions

- Requester home stays minimal: one natural-language input, Shipping is stopped, My Requests, and Help Articles.
- Freight metrics, queues, and dashboards never appear on requester home.
- Existing catalog request definitions and automatic team-queue routing are preserved.
- Forms differ by request type; one dynamic form engine renders configured fields.
- AI suggestions are visible and editable; low-confidence requests route to `Morgan Ellis - Triage`.
- `Shipping is stopped` bypasses AI and creates a P1 immediately.
- Production access comes from SSO. The visible role selector is demonstration-only.
- Scan every order; do not create a freight ticket for every order.
- No indefinite freight holds. Every hold has an owner, deadline, and automatic release.
- Never silently change a customer promise date.
- Use fictional data only. Never add secrets, real customer data, or production credentials.

## Required demo flows

1. Natural-language request → selected template → prefilled dynamic form → numbered ticket → My Requests and team queue.
2. Shipping-stopped fast lane → P1 → Warehouse Systems / On-call queue.
3. ABI173 freight review → savings, confidence, backlog, promise-date impact, guardrails → recorded decision.
4. Administrator changes a template queue, SLA, trigger phrase, or field without code.
5. Reset restores the original fictional scenario.

## Working method

Before editing, state the exact files you will change. Make one coherent change. Preserve unrelated behavior. Afterward, test the affected flow in the browser, check the console, validate refresh persistence, and report exact files changed.

## Definition of done

The requested flow works end to end, is understandable to a busy employee, protects critical warehouse work, labels simulated boundaries honestly, and introduces no console or navigation errors.
