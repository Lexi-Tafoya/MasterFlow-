# MasterFlow — Judge scorecard (problem → solution evidence matrix)

Each capability below is mapped to the business problem it solves, where it is
demonstrated, the evidence a judge sees, and its contribution to the 40/30/30
criteria. Status reflects the **verified** state of the code, not intent.

Legend — Status: ✅ Working · 🟡 Working with caveat · ⏸ Deferred (documented)

---

### 1. Natural-language intake
- **Problem:** Employees must hunt a catalog and pick the right form.
- **Solution:** One free-text composer; MasterFlow proposes the flow.
- **Page:** `index.html` → `smart-request.html`
- **Evidence:** Type "Paper jam" → the printer flow is proposed with confidence.
- **Impact 40 / Tech 30 / Usability 30:** High / Med / High
- **Status:** ✅

### 2. Deterministic, explainable classification
- **Problem:** Requests routed to the wrong queue.
- **Solution:** Local keyword + alias scoring; confidence + routing reason shown.
- **Page:** `smart-request.html`; testable in Flow Studio (`admin-templates.html`).
- **Evidence:** "Paper jam" → **"Report an issue to Help Desk"** (IT Help Desk).
- **Impact/Tech/Usability:** Med / High / High
- **Status:** ✅

### 3. One-question-at-a-time clarification + vague-location validation
- **Problem:** Requests arrive too vague to act on.
- **Solution:** Ask only the most important missing fact; reject broad locations.
- **Page:** `smart-request.html`
- **Evidence:** Asks for the exact station (rejects "packaging" → wants "Pack Station 14").
- **Impact/Tech/Usability:** High / High / High
- **Status:** ✅

### 4. Routing readiness vs. work readiness
- **Problem:** "Routed" is not the same as "ready to work."
- **Solution:** Two distinct computed scores.
- **Page:** `smart-request.html`; surfaced in Reporting.
- **Evidence:** Both meters shown before submission.
- **Impact/Tech/Usability:** High / High / Med
- **Status:** ✅

### 5. Receiver Brief
- **Problem:** Receivers interpret raw fields and chase details.
- **Solution:** Structured brief (outcome, situation, scope, identifiers, gaps, first action).
- **Page:** `assigned-work.html` (Work Center)
- **Evidence:** Receiver opens a request and sees an actionable summary, not raw fields.
- **Impact/Tech/Usability:** High / High / High
- **Status:** ✅

### 6. Requester ↔ receiver communication (one shared ticket)
- **Problem:** Fragmented email threads and duplicate requests.
- **Solution:** Shared timeline with explicit requester/internal visibility.
- **Page:** `my-tickets.html` ↔ `assigned-work.html`
- **Evidence:** Receiver requests info; requester replies in the same ticket; status flips.
- **Impact/Tech/Usability:** Med / High / High
- **Status:** ✅ (internal notes are not exposed to the requester)

### 7. Queue Manager operational visibility
- **Problem:** Managers see symptoms but lack an improvement path.
- **Solution:** Queue health, SLA exposure, assignment review.
- **Page:** `ticket-queues.html` / Work Center via `receiver-feedback.js`
- **Evidence:** Manager identifies a recurring intake problem.
- **Impact/Tech/Usability:** High / Med / Med
- **Status:** ✅

### 8. Feedback loop
- **Problem:** Intake-quality problems recur with no capture mechanism.
- **Solution:** Structured feedback records linked to ticket + template.
- **Page:** Work Center / Queue view → `receiver-feedback.js`
- **Evidence:** A feedback record is created and appears in the flow-feedback inbox.
- **Impact/Tech/Usability:** High / Med / Med
- **Status:** ✅

### 9. Proposal governance & publication
- **Problem:** Flow changes need control, not ad-hoc edits.
- **Solution:** Proposal → governed review → publish that **mutates the real template**.
- **Page:** `admin-templates.html` (feedback/proposal) + `admin-rules-access.html` (Megan).
- **Evidence:** Megan approves & publishes; the actual request flow changes; result recorded.
- **Impact/Tech/Usability:** High / High / Med
- **Status:** 🟡 Working; governance-only change types record `applied:false` truthfully.

### 10. Reporting / MasterFlow Intelligence
- **Problem:** No visibility into where friction lives.
- **Solution:** Live, computed metrics + strongest improvement opportunity.
- **Page:** `reporting.html`
- **Evidence:** Work readiness, classification health, returns, feedback, flow performance — all from live state; safe empty states; **no freight metrics**.
- **Impact/Tech/Usability:** High / High / Med
- **Status:** ✅

### 11. Help guidance (deflection + escalation)
- **Problem:** Simple issues become tickets; complex ones arrive thin.
- **Solution:** Safe guidance first; escalate with context if it doesn't help.
- **Page:** `help-articles.html`
- **Evidence:** Guided steps; "Mark solved" or "I still need help" → prefilled request.
- **Impact/Tech/Usability:** Med / Med / High
- **Status:** ✅

### 12. Assignment recommendation
- **Problem:** Manual assignment is slow; blind automation is unsafe.
- **Solution:** Explainable owner suggestion; **never overwrites a manual assignment**.
- **Page:** `assigned-work.html`
- **Evidence:** Suggested owner + reasons; claim/assign stays a human action.
- **Impact/Tech/Usability:** Med / High / Med
- **Status:** ✅ (recommendation-first)

### 13. P1 bypass ("Shipping is stopped")
- **Problem:** Critical outages cannot wait on AI classification.
- **Solution:** Fast lane → immediate P1 → Warehouse Systems / On-call.
- **Page:** Global sidebar dialog (`layout.js`).
- **Evidence:** Short form → numbered P1, no classification gate.
- **Impact/Tech/Usability:** High / High / High
- **Status:** ✅

### 14. Role consolidation & protected controls
- **Problem:** Controls must be protected without hand-maintaining every intake.
- **Solution:** Four working personas; governed fields locked below Megan.
- **Page:** All pages (role gating in `layout.js`) + `admin-rules-access.html`.
- **Evidence:** Role change reveals/hides workspaces; governed fields disabled for managers.
- **Impact/Tech/Usability:** High / High / High
- **Status:** ✅

### 15. Duplicate detection at intake
- **Problem:** Duplicate effort, fragmented communication, inflated queue volume.
- **Solution (intended):** Show the strongest active match; let the employee join or continue (never silent merge).
- **Page:** Would live on `smart-request.html`.
- **Evidence:** _None yet_ — `findPossibleDuplicates()` is a stub; no intake UI renders it.
- **Impact/Tech/Usability:** (would be High / Med / High)
- **Status:** ⏸ **Deferred and documented.** Not claimed on the Project Summary.

---

## Summary
14 of 15 mapped capabilities are working (one with a truthful governance
caveat). The single deferred capability — duplicate detection — is honestly
excluded from the summary and the demo narration.
