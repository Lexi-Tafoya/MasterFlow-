# One-week build plan

## Goal

Deliver a credible end-to-end prototype, not a production replacement platform.

## Must-have demonstration scope

1. Conversational printer ticket creation with contextual questions and persistent ticket number.
2. Shipping is stopped P1 flow with short required fields and immediate queue visibility.
3. ABI173 freight recommendation with savings, confidence, related backlog, customer-date impact, guardrails, and a persistent decision.
4. Role-based Regular user, Ticket receiver, and Administrator interfaces.
5. Reset demo data for repeatable judging.

## Suggested sequence

### Day 1: lock scope and validate navigation
- Confirm terminology, queue names, and roles.
- Walk every page and remove anything that distracts from the three core stories.
- Do not add integrations.

### Day 2: ticket intake
- Test printer, slow laptop, access, freight-related, and unclear requests.
- Confirm created tickets persist and appear in My tickets and Ticket queues.
- Confirm low-confidence routing to Megan Delia - Triage.

### Day 3: critical incident
- Test the P1 form with warehouse users.
- Reduce fields or wording that slows submission.
- Confirm on-call queue visibility and SLA treatment.

### Day 4: freight decision
- Make ABI173 understandable in under 90 seconds.
- Confirm no action implies a real customer email or ERP write-back.
- Confirm hold owner, cutoff, and automatic release are visible.

### Day 5: user testing and polish
- Observe one warehouse user, one Sales/Logistics user, and one ticket receiver.
- Fix hesitation points, confusing labels, accessibility defects, mobile layout, and console errors.
- Rehearse the demo and reset flow.

## Explicit non-goals

- Production SSO
- Live ERP or OnlineComponents.com APIs
- Live carrier rating
- Real Outlook email
- ServiceNow migration scripts
- A trained optimization model
- Production database or backend
- Automatic order hold write-back
- Full incident/service/change workflow configuration
- Security or compliance certification
