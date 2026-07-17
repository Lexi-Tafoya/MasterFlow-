# MasterFlow compact project summary

> **Superseded** — this compact summary predates the final scope decision to focus MasterFlow entirely on **Problem #4 (Ticketing System Replacement)**. Sections below (product thesis, freight operating rules, ABI173) describe Freight Optimization as a live second module; in the current build it is intentionally an isolated redirect stub and is **out of the judged scope**. For current scope see `README.md`, the in-app **Project Summary** page, and `docs/MASTERFLOW_CAPABILITY_INVENTORY.md`.

## Business problem

Master Electronics spends more than $300,000 annually on ServiceNow but primarily needs usable ticket intake, queues, SLAs, email-style communication, knowledge, workflows, approvals, reporting, roles, migration, AI assistance, lower administration cost, and easy configuration.

Employees currently navigate a large catalog organized around departments and request names. The routing itself already works: selecting a catalog item automatically sends it to that team's queue. The core usability problem is finding the correct request and completing a different form for each request type while busy.

Master Electronics also spends about $10 million annually on freight. A 2% reduction is roughly $200,000, but savings require earlier visibility into carrier/service choices, expedites, consolidation, packaging, anomalies, approvals, and actual realized results.

## Product thesis

MasterFlow is one operational work platform with two connected modules:

1. **Smart Requests:** one natural-language front door that selects an existing catalog request, pre-fills known data, renders its required fields, and routes it to the existing queue.
2. **Freight Optimization:** a separate authorized workspace that scans all eligible orders and creates work only for actionable exceptions.

They share role control, assignment, approvals, notifications, SLA/deadline monitoring, audit history, and reporting, while tickets and freight recommendations remain separate records.

## Users and access

- **Every employee:** Home, Smart Request, My Requests, Help Articles, P1 fast lane, Project Summary.
- **Ticket receiver:** requester functions plus Assigned Work, authorized Ticket Queues, Freight Optimization, Reporting.
- **Administrator:** receiver functions plus Request Template Manager, Rules & Access.
- Project Summary is visible to every role (an "About" page); it is not Administrator-only.
- Prototype role selector is for judging only; production access comes from SSO and server-enforced permissions.

Morgan Ellis and Business Enablement own triage for requests that cannot be safely classified.

## Ticketing workflow

1. Employee types what they need.
2. MasterFlow suggests an existing request type and confidence.
3. The selected template supplies catalog, queue, priority, SLA, fields, and knowledge guidance.
4. The system pre-fills values from the message and employee profile.
5. The employee provides only missing required information and can choose a different request type.
6. A numbered ticket is created in the existing receiving queue and becomes visible to requester and receiver.
7. Low-confidence/unknown requests route to `Morgan Ellis - Triage`.

AI assists and explains; it does not hide or override human confirmation.

## Demonstration templates

- **Printer Ink Request / IT Information:** printer name, location, ink type/status, requester, attachments.
- **Equipment Out of Service / Facilities:** summary, description, location, urgency, issue, MHE number/location, last user, attachments.
- **Corrective Action (Warehouse) / Quality:** summary, description, requester/CC, pending order, customer number, evidence.
- **Stock Check Phoenix / DC Connect:** summary, description, requester/CC, check type, part number, control/order number, attachments.
- Additional prototype templates include printer connectivity, Systems Intake, HVAC, and General Triage.

Administrators can change template name, catalog, queue, priority, response/resolution SLAs, AI trigger phrases, fields, field types, and required flags without code.

## P1 fast lane

`Shipping is stopped` remains visible and bypasses AI. It requests only location, stopped process, start time, affected people/stations, and symptom. It creates a P1 in `Warehouse Systems / On-call` and represents notification to operations leadership.

## Freight operating rules

- Scan every eligible order; never create a ticket for every order.
- Create human work only when someone must decide, approve, contact a customer, investigate, or resolve missing/conflicting data.
- Prototype starting thresholds: $250 minimum savings, 70% human-review confidence, 90% possible auto-action confidence.
- Below 70% normally records only; a high-value exception may be surfaced but cannot auto-apply.
- 70%-89% creates human review only when economic value and timing justify it.
- 90%+ is only potentially automatic when all hard guardrails pass.
- Never silently change a promise date.
- Every hold needs an owner, cutoff, and automatic release to the original approved shipping plan.

ABI173 is the main example: order ABCD14-02; parts 2888-2, 67666BH, 3332-OH; current freight $5,547; internal savings $543.54; customer savings $330.56; confidence 67%; related backlog; one-day promise-date impact. It requires human review and cannot be applied automatically.

## Prototype technology and boundaries

- Plain multipage HTML/CSS/JavaScript.
- localStorage simulates persistent state.
- Deterministic local matching simulates AI classification and extraction.
- Fictional/sanitized data only.
- ERP, OMS, OnlineComponents.com, Outlook, SSO, carrier rating, ServiceNow migration, customer email, and order write-back are not live.
- No secrets or credentials.

## Required end-to-end demo

1. Natural-language printer request → dynamic form → numbered record → My Requests and team queue.
2. Shipping-stopped P1 → receiver queue.
3. ABI173 review → recorded freight decision.
4. Admin template change → Smart Request immediately uses the new configuration.
5. Reset demo state.

## One-week priorities

Polish and validate the above flows. Do not spend the build period on live integrations, a framework rewrite, a production AI model, migration scripts, or a production database.
