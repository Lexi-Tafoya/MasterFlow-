# MasterFlow — Project Description

**Problem #4 — Ticketing System Replacement**

## What it is

MasterFlow is a dependency-free, multipage browser prototype that replaces a
complex ServiceNow catalog experience with a simple, AI-assisted request front
door — while preserving the queues, routing, SLAs, approvals, ownership, and
controls Master Electronics already trusts. Instead of hunting through a large
catalog and filling out a different form for each request type, an employee
types what they need in plain language. MasterFlow selects the correct existing
request type, pre-fills what it can from the message and the employee profile,
renders only that template's required fields, asks one focused question at a
time until the request is work-ready, and routes a numbered ticket to the
existing team queue.

## Who it serves

- **Employees** get one natural-language front door, a fast `Shipping is stopped`
  P1 lane that never waits on AI, My Requests, and Help Articles.
- **The Service Team** gets a Work Center for personal and team work, cost
  capture at resolution, and (for Queue Managers) no-code flow configuration,
  automatic-assignment rules, and reporting.
- **Administrators** get Enterprise Governance, Enterprise Triage for
  low-confidence requests, and a modeled ServiceNow transition path.

## Business impact

Master Electronics spends more than **$300,000 per year** on ServiceNow while
primarily needing usable ticket intake, queues, SLAs, communication, knowledge,
workflows, approvals, reporting, roles, migration, AI assistance, lower
administration cost, and easy configuration. MasterFlow demonstrates all twelve
of those Problem #4 requirements end-to-end in a build that requires no license,
backend server, database, or package manager to run (just a small local
static-file server) — showing a credible, lower-cost path that keeps the routing
authority the business already relies on.

## How AI is used

Classification, field extraction, and the diagnostic question flow are
**deterministic, local, and inspectable** — no external model or API. Every
suggestion is visible and editable; requests that cannot be safely classified
route to `Megan Delia — Triage` rather than guessing.

## Run it

```bash
python serve.py
```

Then open `http://127.0.0.1:8000/index.html`. No package installation, API key,
build step, database, or internet connection is required.

## Prototype boundaries (labeled honestly)

All users, tickets, costs, and transition status are **fictional or modeled**.
The prototype does not connect to ServiceNow, ERP, Outlook, or SSO;
classification is deterministic and local; and it contains no secrets or
credentials. MasterFlow is focused entirely on Problem #4.
