# Product decision log

This file records the reasoning already completed so future coding sessions do not reopen settled questions unnecessarily.

## 1. Product framing

MasterFlow is an operational work-orchestration platform, not simply a replacement ticket form and not one giant ticket type.

Shared services can include:
- assignment and queues
- approvals
- notifications
- comments and email conversation
- SLA/deadline monitoring
- audit history
- roles and permissions
- reporting

Business objects remain separate:
- Incident
- Service request
- Change request
- Freight recommendation
- Freight decision
- Approval

This separation prevents the new application from growing into another overcomplicated ServiceNow implementation.

## 2. Root causes addressed

### Ticketing
- Busy employees provide incomplete information.
- Generic forms ask too many irrelevant questions.
- Missing context creates repeated communication.
- Routing and severity are inconsistent.
- Requesters lack a simple status view.
- Managers lack clear workload and SLA visibility.
- Common changes require specialized development.
- Critical warehouse incidents are forced through normal intake.

### Freight
- Decisions occur too late.
- Data is fragmented across ERP, website orders, backlog, carrier data, customer terms, packaging, and warehouse execution.
- Employees lack a consistent economic decision rule.
- Manual holds and exceptions can be forgotten.
- Sales and Logistics do not share one decision record.
- Estimated savings may not be verified against final cost.
- Low-value opportunities can cost more in employee time than they save.
- Customer promise and reliability risks are not applied consistently.

## 3. Landing-page decision

The first version was too dashboard-heavy. The approved direction is a very simple home page inspired by a conversational AI interface:

- centered greeting
- one large natural-language composer
- Shipping is stopped
- My tickets
- Help articles

Freight savings, ticket dashboards, team performance, and queue metrics do not belong on the requester home page. Freight Optimization is a separate side-navigation destination.

## 4. Permission decision

The prototype includes a visible role selector so judges can demonstrate multiple interfaces:

- Regular user
- Ticket receiver
- Administrator

Production users must not grant themselves access with a toggle. Roles should come from SSO groups and server-enforced permissions.

Regular user:
- home
- own tickets
- knowledge base
- P1 fast lane

Ticket receiver:
- regular-user functions
- assigned work
- authorized ticket queues
- freight optimization
- reporting

Administrator:
- receiver functions
- routing rules
- approval thresholds
- SLA settings
- role and access configuration

## 5. Conversational ticket intake

The system proposes, rather than hides:
- category
- queue
- priority
- classification confidence
- routing explanation
- self-service guidance

The requester can correct category and priority. The system asks only contextual missing questions. Low confidence routes safely to Megan Delia - Triage.

AI is assistance, not an invisible authority. Authorized receivers can correct routing and severity.

## 6. Shipping-stopped fast lane

The P1 path is separate from the chatbot and remains visible regardless of role.

Minimum fields:
- warehouse/location
- process stopped
- start time
- affected people or stations
- symptom/error

The target is submission in under 45 seconds. It immediately routes to Warehouse Systems / On-call and represents notification to operations leadership. No AI confidence score is required.

## 7. Freight work-generation rule

Core principle:

> Scan every eligible order, but do not create a ticket for every order.

Create a work item only when someone must:
- make a decision
- approve an exception
- contact a customer
- investigate an anomaly
- resolve missing or conflicting information

Routine scans remain background records.

## 8. Confidence policy

Initial prototype behavior:
- Below 70%: normally record for analysis without operational work.
- 70% to 89%: create human review when expected value and timing justify it.
- 90% or higher: consider automatic action only when every hard guardrail passes.

A below-threshold item can be surfaced when potential value is unusually high, but it cannot be automatically applied. ABI173 is the example: $543.54 internal savings, $330.56 customer savings, and 67% confidence. It is shown for human review because value is meaningful, while customer-date and inventory uncertainty prevent automatic action.

## 9. Economic threshold decision

One universal dollar threshold is not sufficient.

- A low savings amount can be worthwhile when the action is zero-touch, confidence is very high, and there is no customer impact.
- A higher amount may still be unattractive if a salesperson, customer, Logistics, and warehouse hold are all required.

The long-term decision rule should approximate:

Expected net value = estimated savings × confidence × likelihood of acceptance − employee handling cost − operational risk

The prototype uses $250 minimum savings, 70% manual-review confidence, and 90% possible automatic-action confidence as adjustable starting assumptions.

## 10. Promise-date and hold decisions

The system may calculate a proposed promise date automatically, but it must not silently change a customer commitment.

Automatic action is only eligible when:
- original customer promise is still met
- customer carrier/service terms remain satisfied
- export and hazardous-material restrictions are clear
- inventory is confirmed
- warehouse cutoff is met
- delivery reliability is not reduced
- no customer approval is required

When a recommendation changes the promise date:
1. calculate and display the proposed date
2. create an editable Sales communication draft
3. create a time-limited decision item
4. wait for the required approval or customer confirmation
5. release the order unchanged when the deadline expires

No indefinite operational hold is allowed.

## 11. Prototype boundary decision

Do not build live ERP, OnlineComponents.com, carrier, Outlook, SSO, or ServiceNow integrations during the one-week prototype. Use fictional data and label simulated boundaries honestly.

Future sequence:
1. read-only ERP and website order/backlog feed
2. read-only rates, commitments, dimensions, customer terms, and carrier history
3. company email, notifications, and SSO
4. controlled write-back for approved holds and shipping-method changes
5. historical ServiceNow migration with mapping and reconciliation
