# MasterFlow — Final demo script

**Length:** ~4 minutes. **Shape:** one continuous story, not a page tour.
**Frame it up front:** _"Master Electronics spends $300k+/yr on ServiceNow mostly
for tickets, yet employees still struggle to ask for help and receivers get
requests they can't act on. MasterFlow fixes the intake experience while keeping
every control the company already trusts."_

Every step below is verified working. **Do not narrate "duplicate awareness"** —
that capability is deferred (see FINAL_AUDIT.md §9).

---

## Setup
1. Open `index.html`. Top-right **Demo view = Regular user**.
2. (Optional) Sidebar → **Reset demo data** for a clean scenario.

## Act 1 — Intake that improves the work (Regular user)
1. In the composer type: **`Paper jam`**.
   - _Say:_ "The employee doesn't pick a form — they just describe the problem."
2. MasterFlow selects **"Report an issue to Help Desk"** and shows a confidence score.
   - _Say:_ "Deterministic, explainable classification — routed to IT Help Desk."
3. It asks for the **exact station** (a vague "packaging" is rejected).
   - _Say:_ "One question at a time, and it insists on an actionable location."
4. It asks for scope/impact only if required, then shows **routing readiness,
   work readiness, and a typical completion estimate**.
   - _Say:_ "Routing readiness = we know where it goes. Work readiness = the team
     can actually start. That's the whole point."
5. Submit → a **numbered ticket** appears in **My Requests** and the team queue.

## Act 2 — The receiver starts immediately (Ticket receiver)
6. Switch **Demo view → Ticket receiver**. Open **Work Center**.
7. Open the new request → the **Receiver Brief**: outcome, exact location,
   observed behavior, business impact, suggested first action, information gaps,
   and an **assignment recommendation**.
   - _Say:_ "No interpreting raw fields. And assignment is recommended, never forced."
8. Click **Request information**, type the missing detail.

## Act 3 — Communication in one place (back to Regular user)
9. Switch **Demo view → Regular user** → **My Requests** → open the ticket → reply.
   - _Say:_ "One shared conversation. Status flips back to In progress automatically."

## Act 4 — Governed continuous improvement (Administrator)
10. Switch **Demo view → Administrator** → **Request templates**.
11. As the **Queue/Category Manager** persona, capture a recurring intake problem
    and create an **improvement proposal**.
12. Switch to the **Megan / Enterprise Administrator** persona → **Rules & access**.
    - Review the proposal: affected flow, before/after, impacted queue, why her
      approval is required.
13. **Approve & publish** → **the actual request template changes.**
    - _Say:_ "Managers improve their own flows; Megan governs anything that
      touches enterprise controls."

## Act 5 — Proof (any operations view)
14. Open **Reporting (MasterFlow Intelligence)**: work readiness, classification
    health, returns, feedback signal, and the strongest improvement opportunity —
    all live, no freight noise.

## Close
- Open **Project Summary** (in the **About** nav group, visible in any view).
  - _Say:_ "MasterFlow doesn't just move tickets. It improves the quality of work
    before it reaches the team — while preserving the queues, routing, SLAs,
    approvals, and governance the company already trusts."

## Safety valve (optional, 15s)
- Sidebar → **Shipping is stopped** → short form → instant **P1** to Warehouse
  Systems / On-call. _"Critical outages never wait on AI."_
