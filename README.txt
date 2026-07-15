MASTERFLOW ROUTED APPROVAL WORKFLOW PATCH

WHAT THIS FIXES

Ticket receivers no longer approve or reject purchase requests themselves.
They validate the request and send it to an authorized manager or director.
Approvals are decided in Queue Manager.

FILES REPLACED

- assigned-work.html
- ticket-queues.html
- assets/js/pages/assigned-work.js
- assets/js/pages/receiver-feedback.js
- assets/css/WORK_CENTER_APPEND.css
- LAYOUT_CHANGES.txt

INSTALL

1. Create a Git commit named:
   Before routed approval workflow

2. Extract this ZIP.

3. Copy all extracted files and folders into the root of the MasterFlow project.

4. When Windows asks, choose:
   Replace the files in the destination

5. In VS Code choose File > Save All.

6. Hard-refresh the browser with Ctrl + Shift + R.

TEST

A. Receiver sends the request for approval

1. Switch to Ticket receiver.
2. Open Work Center.
3. Open Replacement scanner purchase.
4. Confirm there are no Approve or Reject buttons.
5. Confirm the approval route says Area Director for the $1,285 request.
6. Optionally enter a note.
7. Click Send for approval.
8. Confirm status becomes Awaiting approval.
9. Confirm the timeline records who routed it.

B. Authorized Queue Manager decides

1. Open Queue Manager.
2. Find Replacement scanner purchase in Pending approvals.
3. Approve it.
4. Confirm it disappears from Pending approvals.
5. Return to Work Center.
6. Confirm status is Approved - Ready to fulfill.
7. Confirm Start fulfillment is available.

C. Rejection

1. Reset demo data.
2. Send the scanner request for approval again.
3. Open Queue Manager.
4. Enter a rejection reason.
5. Click Reject.
6. Confirm status becomes Rejected and the timeline preserves the reason.

D. Request more information

1. Reset demo data and send the request for approval.
2. In Queue Manager, enter a question and click Request information.
3. Confirm the ticket changes to Waiting on requester.
4. Confirm the question appears in the timeline.

VALIDATION COMPLETED

- assigned-work.js passes node --check
- receiver-feedback.js passes node --check
- HTML element IDs match JavaScript references
- CSS braces are balanced
