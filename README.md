# Cash-Flow Ledger

Sprint 02 deliverable — Prodesk IT.

**Live site:** [prodesk-it-cashflow.vercel.app](https://prodesk-it-cashflow.vercel.app/)
**Repo:** [github.com/tanupriyasingh1/prodesk-it-cashflow](https://github.com/tanupriyasingh1/prodesk-it-cashflow)

A small budgeting dashboard styled like a physical accounting ledger: enter
a salary, log expenses, and watch the remaining balance and a pie chart
update as you go. Built in vanilla JavaScript — no frameworks.

## Live features

**Phase 1 — Base MVP**
- Salary + expense entry forms with correct `type="number"` inputs
- Real-time DOM rendering of salary, expense rows, and remaining balance
- Inline validation: blocks empty / negative submissions with a visible error, no console errors

**Phase 2 — Persistence & visualization**
- State (salary + expenses) is serialized to `localStorage` and re-hydrated on page load
- Delete button per row, removes from DOM + storage and recalculates the balance instantly
- Chart.js pie chart (remaining balance vs. total expenses), updates on every add/delete

**Phase 3 — Stretch goals**
- "Download report" button generates a PDF (jsPDF) of the salary, balance, and full expense list
- Threshold alert: if remaining balance drops below 10% of salary, the balance turns red and a warning banner appears
- Currency toggle (INR / USD / EUR / GBP) using live rates from the Frankfurter API — all figures are still stored internally in INR, only the display converts

## Running it locally

No build step. Just serve the folder — opening `index.html` directly with
`file://` will block the fetch calls in some browsers, so use a local server:

```bash
cd cashflow-ledger
python3 -m http.server 5500
```

Then visit `http://localhost:5500`.

## Deployed with

This project is deployed on [Vercel](https://vercel.com), connected
directly to the `main` branch of this repo — every push auto-deploys.
No environment variables or build command needed, it's static files.

## Notes

- The currency dropdown falls back to INR-only if the exchange rate API
  can't be reached (offline, rate-limited, etc.) — it won't crash the app.
- All money is kept in INR in `localStorage`; switching currency only
  changes formatting, so nothing gets lost in translation if the rates
  API is briefly unavailable.


