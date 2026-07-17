# Product requirements

## Problem 4: Ticketing system replacement

Master Electronics spends more than $300,000 per year on ServiceNow while using it mainly for basic ticket management. The current platform is more complex and costly than present needs require, and enhancements often need specialized development.

The solution should:

- Create, edit, assign, track, and close tickets using standard ticket fields.
- Support configurable queues and automated routing by category, priority, team, or business rule.
- Define and monitor response and resolution SLAs, including breach alerts.
- Enable email-based ticket creation and two-way requester communication.
- Provide a searchable knowledge base and self-service support.
- Support separate incident, service-request, and change-request workflows with appropriate approvals.
- Provide reporting for ticket volume, resolution time, SLA compliance, backlog, and team performance.
- Manage user roles, permissions, queues, and access levels.
- Plan migration of open and historical ServiceNow tickets, users, and knowledge articles with field mapping, validation, reconciliation, and exceptions.
- Include at least one AI-assisted workflow such as categorization, routing, summarization, suggested responses, or knowledge recommendations.
- Reduce annual software and administrative costs.
- Make common configuration changes possible without heavy development work.

## Ticketing experience requirements from work notes

- The default landing page should be as simple as a conversational assistant, not a long category form.
- The employee can type natural language such as: “I need a ticket to get connected to a printer.”
- The system proposes the category, route, and priority and asks only the missing contextual questions, such as printer name or IP and workstation.
- User identity and profile information should come from SSO in production rather than being re-entered.
- Spelling mistakes should not prevent classification.
- The requester should see open, historical, and closed tickets in one simple area.
- Company email should eventually support notifications and two-way updates while preserving one ticket conversation.
- The requester should be able to identify additional interested parties or followers.
- Self-service guidance should be offered before submission but must not prevent ticket creation.
- Shipping-stopping incidents need a separate, fast P1 path with clear required fields and immediate routing.
- Every ticket needs a stable number for reference.
- Unclear requests should route to Morgan Ellis’s triage queue.
- Managers can assign tickets to team members or themselves; authorized team members can self-assign.
- AI can suggest priority and severity, but authorized managers can correct it.
- Requests involving cost can trigger approval above a configurable threshold.
- Ticket receivers need open queues, ownership, SLA risk, routing explanation, and team workload visibility.
- Regular users should not see ticket-receiver queues or administrative configuration.

## Problem 3: Freight optimization

Master Electronics spends approximately $10 million per year on freight. A 2% reduction represents approximately $200,000 in annual savings. The solution should maintain delivery reliability, customer experience, and operational effectiveness.

The solution should:

- Identify freight cost drivers across customers, carriers, service levels, warehouses, shipment types, and order profiles.
- Improve visibility into freight spend, trends, exceptions, and savings opportunities.
- Recommend cost-effective carrier and service level based on shipment requirements.
- Reduce unnecessary expedited shipments and premium charges.
- Identify sensible shipment consolidation opportunities.
- Improve packaging, dimensional-weight, and shipment-preparation decisions.
- Flag unusually high freight relative to order value, margin, customer terms, or history.
- Provide approval rules for exceptions, expedited freight, and high-cost shipments.
- Report freight cost by customer, supplier, product, carrier, warehouse, and sales channel.
- Create alerts or recommendations before cost is incurred.
- Measure actual verified savings against the 2% target.
- Include AI assistance such as anomaly detection, optimization recommendations, carrier suggestions, or natural-language analysis.

## Freight workflow requirements from work notes

- MasterFlow should partner with the existing internal ERP and OnlineComponents.com rather than replace them.
- A future read-only API feed can evaluate customer, carrier, order value, quoted cost, speed, package dimensions/weight, backlog, and requested delivery.
- Every eligible order may be scanned, but only actionable exceptions create work.
- The decision should occur before the order is picked or manifested when practical.
- Recommendations can include carrier/service changes, consolidation, packaging changes, or expedite prevention.
- Sales may need to contact the customer before changing a promise date.
- Opportunities should stay in the responsible person’s queue until resolved.
- A financial threshold should prevent low-value manual work.
- A confidence threshold should prevent low-quality recommendations from flooding queues.
- High-confidence, no-customer-impact actions may eventually be automated only after all hard guardrails pass.
- A temporary order hold must have a named owner, shipping cutoff, and automatic release.
- Export holds remain authoritative and must not be overridden.
- Authorized users need manual override with an audit record.
- The proposed promise date should be calculated and displayed automatically, but customer commitments should not be silently changed.
- Savings must eventually be verified against final carrier charges, not only estimated.

## Prototype personas

- Employee/requester
- Warehouse employee
- Ticket receiver/agent
- Queue manager
- Sales account owner
- Logistics analyst
- Director/approver
- System administrator

The current prototype demonstrates three permission views: Regular user, Ticket receiver, and Administrator. A separate Sales/Logistics role can be added later if user testing shows the receiver role is too broad.
