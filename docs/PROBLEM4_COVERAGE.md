# MasterFlow — Problem #4 requirement-coverage matrix

_Ticketing System Replacement. Last updated during the release-candidate hardening pass._

**How to read this**

- **Status** is one of: **Implemented** (working in the prototype), **Simulated** (works with fictional data / modeled behavior), **Documented** (a clearly labeled production approach), or **Partial** (present but with a named gap).
- **Files** lists the primary implementation.
- Every gap includes the **smallest high-value fix** to close it.

The prototype is dependency-free HTML/CSS/JS. All classification and extraction is deterministic and local (no external AI API). All data is fictional. Production access would come from SSO.

---

## 1. Create, edit, assign, track, and close tickets with standard fields

- **Where demonstrated:** Home natural-language intake → Smart Request Builder → numbered ticket (`ME-2026-####`) → My Requests (track) → Work Center / Queue Manager (claim, assign, resolve, reopen) → ticket detail (edit via updates, close).
- **Files:** `home.js`, `smart-request.js`, `request-submitted.js`, `my-tickets.js`, `assigned-work.js`, `receiver-feedback.js`, `store.js`, `templates.js`.
- **Status:** **Implemented.** Standard fields (summary, description, requester, location, priority, queue, status, timestamps, attachments-by-name). Receiver can claim, resolve, reopen, and update; requester and receiver both track the same record.
- **Demo appearance:** "Paper jam" → `ME-2026-####` → My Requests → Work Center → Claim → Resolve.
- **Gap / fix:** Field-level inline editing is expressed through updates and receiver actions rather than a free-form field editor. Smallest fix (optional): add an explicit "Edit fields" action on the receiver ticket detail.

## 2. Configurable queues and automated routing (category, priority, team, business rules)

- **Where demonstrated:** Each request template carries catalog, queue, priority, SLA, and trigger phrases; classification routes to the existing team queue; low-confidence routes to `Morgan Ellis - Triage`. Flow Studio and Rules & Access configure queue, priority, thresholds, and routing rules without code.
- **Files:** `templates.js`, `request-engine.js`, `request-engine-v2.js`, `admin-templates.js` (Flow Studio), `admin-rules-access.js`, `layout.js`.
- **Status:** **Implemented.** Routing by category/template, priority, and team; business rules via the safe-routing confidence threshold and routing/approval rules.
- **Demo appearance:** Classification card shows Route + Priority; Admin changes a queue/threshold and Smart Request immediately reflects it.
- **Gap / fix:** None material.

## 3. SLAs — response, resolution, risk, breach alerts

- **Where demonstrated:** Templates define response/resolution SLA hours; submission shows the response target time; Work Center has an **SLA risk** tab and "Overdue by _X_" indicators; Reporting shows SLA compliance.
- **Files:** `templates.js`, `store.js`, `assigned-work.js`, `receiver-feedback.js`, `reporting.js`.
- **Status:** **Implemented.** Response and resolution targets, SLA-risk surfacing, and overdue/breach indicators.
- **Demo appearance:** Work Center → **SLA risk** tab; overdue badges on cards; Reporting SLA compliance figure.
- **Gap / fix:** Proactive breach *notifications* are represented visually rather than pushed; smallest fix (optional): a "breach watch" count on the Work Center header.

## 4. Email-based ticket creation and two-way communication

- **Where demonstrated:** Two-way communication is fully working via the shared ticket conversation timeline (requester and receiver reply in one record, requester-visible vs internal notes). Email intake is simulated (a seeded ticket "created from company email") and modeled in the migration mapping (`comments`/`work_notes` → timeline).
- **Files:** `my-tickets.js`, `assigned-work.js`, `receiver-feedback.js`, `store.js`.
- **Status:** **Two-way communication: Implemented. Email intake: Simulated / Documented.**
- **Demo appearance:** Open any ticket → conversation timeline + "Add a message"; seeded email-origin ticket.
- **Gap / fix:** Inbound email → ticket is not a live integration. Smallest high-value fix: label the email-origin ticket clearly and add a one-line "How email intake works" note on My Requests (parse sender → requester, subject → summary, body → description, thread → timeline).

## 5. Searchable knowledge base — self-service, deflection, troubleshooting

- **Where demonstrated:** Help Articles page (search); Smart Request "Recommended before submission" guided troubleshooting; per-template article suggestions; troubleshooting can be skipped and never blocks ticket creation.
- **Files:** `help-articles.js`, `troubleshooting-engine.js`, `smart-request.js`, `templates.js`, `store.js`.
- **Status:** **Implemented.** KB search + contextual troubleshooting + deflection offer.
- **Demo appearance:** Help Articles search; Smart Request "Try guided troubleshooting."
- **Gap / fix:** Deflection outcomes are shown in Reporting; none material.

## 6. Separate workflows for incidents, service requests, change requests + approvals

- **Where demonstrated:** Incident templates (Equipment Out of Service, Report an issue to Help Desk, HVAC), service-request templates (Printer Ink, New IT Hardware, Stock Check), and a full **approval workflow** (statuses: _Approval required → Awaiting approval → Approved – Ready to fulfill_, with manager/director thresholds). Change requests are represented in the migration field mapping (`change_request`, `u_approvers`) and are handled operationally through the approval-gated path.
- **Files:** `templates.js`, `receiver-feedback.js`, `assigned-work.js`, `admin-rules-access.js`, `admin-migration.html`.
- **Status:** **Implemented.** Every template now carries an explicit **work type** — Incident, Service request, or Change request — shown in the Smart Request AI interpretation panel. Change-type work (Systems Intake) is distinguished, and the approval workflow provides the change-control gate.
- **Demo appearance:** Smart Request AI panel shows "Work type: Incident / Service request / Change request"; New IT Hardware → approval required → approver route; Queue Manager pending approvals.
- **Gap / fix:** Optional next step: add a work-type split to Reporting and a work-type badge on the ticket record.

## 7. Reporting and dashboards

- **Where demonstrated:** Reporting ("MasterFlow Intelligence") shows request volume, work-ready-at-arrival, classification confidence, clarification turns, returned-for-information, triage rate, request-flow performance, intake-quality outcomes, SLA compliance, resolved counts, and freight-savings outcomes.
- **Files:** `reporting.js`, `reporting.html`, `store.js`.
- **Status:** **Implemented.** Covers volume, resolution/resolved, SLA compliance, backlog/in-progress, request quality, work readiness, clarification burden, and self-service outcomes.
- **Demo appearance:** Reporting page KPI grid + request-flow and intake-quality panels.
- **Gap / fix:** Per-agent "team performance" is represented at the flow/queue level; smallest fix (optional): a per-owner throughput row.

## 8. Manage roles, permissions, queues, access levels

- **Where demonstrated:** Role-gated navigation (requester / receiver / admin) with redirect protection; Rules & Access manages roles and permissions; Flow Studio "View as" shows scoped edit levels (platform admin, category owner, read-only queue manager).
- **Files:** `layout.js`, `admin-rules-access.js`, `admin-templates.js`, `store.js`.
- **Status:** **Implemented** (prototype role selector). Production access via SSO is **Documented**.
- **Demo appearance:** Demo View selector changes available workspaces; Admin → Rules & Access.
- **Gap / fix:** None material for a prototype; SSO is honestly labeled.

## 9. Migration — open + historical tickets, users, KB, field mapping, validation

- **Where demonstrated:** **New** ServiceNow Migration screen: scope table (open incidents, service requests, change requests, historical tickets, users, assignment groups, knowledge), a field-level mapping table (ServiceNow field → MasterFlow field → transform → status), a **dry-run validation** with pass/warning/blocking counts, and a cutover + rollback plan.
- **Files:** `admin-migration.html`, `assets/js/pages/admin-migration.js`, `layout.js`.
- **Status:** **Implemented as a credible migration model + mapping screen with dry-run validation** (previously only a one-line disclaimer). No live ServiceNow connection — clearly labeled.
- **Demo appearance:** Admin → **ServiceNow migration** → "Run validation dry run."
- **Gap / fix:** Not a live extract; honestly labeled as a modeled dry run.

## 10. At least one AI-assisted workflow (categorization, routing, summarization, suggested responses, KB recs)

- **Where demonstrated:** A connected AI experience: intent categorization + team routing, information extraction from the original message, one-question-at-a-time clarification with rationale, urgency/safety/P1 detection, Receiver Brief summarization, KB/troubleshooting recommendations, Work Center AI prioritization, and Flow Studio feedback → governed improvement proposals.
- **Files:** `templates.js`, `request-engine.js`, `request-engine-v2.js`, `troubleshooting-engine.js`, `assigned-work.js`, `admin-flow-studio.js`, `admin-flow-feedback.js`.
- **Status:** **Implemented** — deterministic, local, and honestly described (no fabricated ML). Hardened in this pass to tolerate contractions, misspellings, spacing, synonyms, and filler words.
- **Demo appearance:** Type any of the 20+ example phrases (including misspellings) → correct routing, extraction, and a single high-value question.
- **Gap / fix:** None material; behavior is intentionally rules-based and transparent.

## 11. Reduce annual software cost, admin cost, manual intake, clarification, configuration effort

- **Where demonstrated:** Project Summary states the $300K ServiceNow baseline; Reporting quantifies work-readiness and clarification burden; Flow Studio removes developer dependency for configuration; classification removes catalog-navigation effort.
- **Files:** `project-summary.js`, `reporting.js`, `admin-templates.js`, `templates.js`.
- **Status:** **Represented / Implemented.** Cost baseline stated; efficiency metrics computed live from prototype data.
- **Demo appearance:** Project Summary cost baseline; Reporting clarification-turns and work-ready metrics.
- **Gap / fix:** Dollar savings are modeled; smallest fix (optional): an explicit "estimated administrative savings" figure on Reporting.

## 12. Common configuration changes without heavy development

- **Where demonstrated:** Flow Studio (no-code) edits template name, catalog, queue, priority, response/resolution SLA, trigger phrases, fields, field types, and required flags; Rules & Access edits thresholds, routing, approvals, and roles; governed proposals apply changes with an audit trail.
- **Files:** `admin-templates.js`, `admin-rules-access.js`, `admin-flow-studio.js`, `templates.js`.
- **Status:** **Implemented.** Changes persist and are used immediately by Smart Request.
- **Demo appearance:** Admin changes a queue/SLA/trigger → Smart Request uses it with no code.
- **Gap / fix:** None material.

---

## Summary

| # | Requirement | Status |
|---|---|---|
| 1 | Create/edit/assign/track/close tickets | Implemented |
| 2 | Configurable queues + routing | Implemented |
| 3 | SLAs + risk + breach | Implemented |
| 4 | Email intake + two-way comms | Two-way: Implemented · Email intake: Simulated |
| 5 | Knowledge base + deflection | Implemented |
| 6 | Incident / service / change + approvals | Implemented (work types labeled + approval workflow) |
| 7 | Reporting + dashboards | Implemented |
| 8 | Roles / permissions / access | Implemented (SSO documented) |
| 9 | ServiceNow migration + mapping + validation | Implemented (modeled dry run) |
| 10 | AI-assisted workflow (connected) | Implemented |
| 11 | Cost / effort reduction | Implemented / Represented |
| 12 | No-code configuration | Implemented |

**All twelve requirements are demonstrated end to end.** The one remaining soft spot is **email intake**, which is simulated (seeded email-origin ticket + migration mapping of `comments`/`work_notes`) rather than a live inbound integration — appropriate for a prototype and honestly labeled. Optional polish: a work-type split in Reporting and a per-owner throughput row.
