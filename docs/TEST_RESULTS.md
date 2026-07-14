# MasterFlow prototype validation

Validated locally as a multipage browser application using fictional state.

## End-to-end passes

- Minimal requester home loads with one natural-language input and three quick actions.
- `I need ink for the Zebra printer at Pack Station 14` selects **Printer Ink Request** at high confidence.
- Printer name, location, ink type, and requester are prefilled by the prototype extraction layer.
- Dynamic required fields render from `assets/js/templates.js`.
- Submission creates a numbered request and routes it to the configured queue.
- The new record persists across navigation and appears in **My Requests**.
- **Shipping is stopped** creates a P1 with no AI classification gate.
- The P1 appears in **Warehouse Systems / On-call** for the Ticket receiver role.
- ABI173 opens with 67% confidence, savings, related backlog, promise-date impact, cutoff, automatic release, and guardrail results.
- A freight Sales-review decision persists and updates the opportunity status.
- Administrator can change the Printer Ink queue without code.
- The next Smart Request immediately displays the updated queue.
- Project Summary loads with product decisions and Claude handoff context.
- All requester, receiver, and administrator pages pass a role-aware browser smoke test.
- Mobile requester home renders and remains usable.
- Browser tests produced zero console errors.
- All JavaScript files pass `node --check`.
- All local HTML links, scripts, and stylesheets resolve to packaged files.

## Intentionally not validated

Live ERP, OMS, OnlineComponents.com, Outlook, SSO, ServiceNow migration, carrier-rating, customer-email, and order-hold integrations are outside the one-week prototype and are explicitly simulated.
