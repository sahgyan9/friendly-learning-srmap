# SRM Student Portal Integration Architecture

This document specifies the architecture, endpoint behavior, data structures, and edge cases for the SRM University-AP Student Portal integration (`https://student.srmap.edu.in/srmapstudentcorner`).

Any agent or engineer working on portal synchronization, academic imports, or fee/finance features must follow the protocols described here.

---

## 1. Authentication & Session Flow

The portal uses cookie-based session management across Java Server Pages (JSP):

1. **Initial POST to `/`**: Submits user credentials (`txtRegNumber` and `txtPwd`).
2. **302 Redirect & Cookie Jar**: On successful credentials validation, the server responds with HTTP 302 and sets initial session cookies (`JSESSIONID`, `AWSALB`, `AWSALBCORS`).
3. **Follow Redirect to Landing Page**: The client must follow the redirect `Location` header to load the authenticated student dashboard.
4. **Student ID (`stuId`) Extraction**:
   The landing page embeds the student's internal ERP identifier in an inline script:
   ```javascript
   stuId: '12345'
   ```
   This `stuId` is required for several secondary reporting endpoints (such as Section 27 receipt generation).

Code reference: [`supabase/functions/_shared/srm-portal.ts`](../supabase/functions/_shared/srm-portal.ts) (`doLogin`).

---

## 2. Portal Endpoints & Section Mapping

The portal exposes student data through three primary endpoints:

| Endpoint | Method / Params | Content |
| :--- | :--- | :--- |
| `/students/report/studentreportresources.jsp` | `POST ids=1..15` | Core academic and profile tabs (HTML fragments) |
| `/students/report/feepaymentdetail.jsp` | `POST` | Active outstanding fee dues and fine penalties |
| `/students/report/receiptgeneration.jsp` | `POST ids=27&stuId=<id>` | Authentic university payment receipts registry |

### Key Section IDs in `studentreportresources.jsp`:
- **`ids=1`**: Profile, program, registered mobile number, current semester.
- **`ids=2`**: Enrolled course list and faculty mapping.
- **`ids=3`**: Student attendance breakdown.
- **`ids=4`**: Timetable schedule matrix.
- **`ids=6`**: Internal exam marks and GPA / CGPA transcript.
- **`ids=7`**: **Internal Gross Billing Clearance Register (`#tbl7`)** — *See Critical Warning below*.

---

## 3. The Fee & Finance Data Trap: Gross Billing vs. Bank Receipts

### The Trap: Table `#tbl7` is NOT Student Payments

The portal renders Section 7 (`ids=7`) under the user-facing tab label "Fee Paid Details". However, in SRM's backend ERP, `#tbl7` is an **internal gross billing clearance register**. It aggregates three disparate financial flows into a single cleared ledger:

1. **Actual bank payments** remitted by the student (e.g. ₹6,28,060).
2. **Institutional scholarship concessions** granted by SRM University-AP (e.g. 75% tuition waivers of ₹2,09,100 per year, totaling ₹8,36,400).
3. **Accounting adjustments, refunds, and fee head reversals** (e.g. ₹13,400).

Summing `#tbl7` produces an inflated number (e.g. ₹14,77,860) representing total campus gross billing clearance, rather than the student's actual out-of-pocket expenditure.

### The Correct Source: Section 27 (`receiptgeneration.jsp`)

To record genuine student transactions, the scraper queries Section 27:
```http
POST /students/report/receiptgeneration.jsp HTTP/1.1
Cookie: <session_cookies>
Content-Type: application/x-www-form-urlencoded; charset=UTF-8

ids=27&stuId=12345
```
This returns the official university bank receipts with:
- Authentic receipt numbers (e.g. `SEAS/29898/23-24`, `SEAS/55718/26-27`).
- Exact transaction timestamps.
- Bank remittance modes (`Online / University Receipt`).
- Net transaction amounts disbursed by the student.

---

## 4. Institutional Scholarship Concession Extraction

Scholarship students receive merit concessions (e.g. ₹2,09,100 per year) that clear tuition dues without requiring student cash outflow.

In `#tbl7`, these concessions appear under the payment mode **`Student Concession`**.
The scraper processes these using `extractFeeConcessions(tbl7Html, receipts)`:

1. Computes the tuition gross amount listed in `#tbl7` for each academic term.
2. Sums the tuition receipts actually paid by the student for that term.
3. Computes the institutional waiver difference:
   $$\text{Concession Amount} = \max(0, \text{Gross Tuition} - \text{Student Paid Tuition})$$
4. Stores the concession with:
   - `paid_amount = 0.00`
   - `amount = concessionAmount`
   - `fee_type = "Tuition Fee Waiver (Merit Scholarship Concession)"`
   - `payment_mode = "Institutional Concession / Scholarship"`
   - `receipt_number = "SCHOLARSHIP-<term>"`

This ensures concessions are recorded in the history ledger as non-disbursed credits.

---

## 5. Database Schema & Presentation Rules

### Table: `student_fee_paid_history`

| Column | Type | Description |
| :--- | :--- | :--- |
| `user_id` | `uuid` | Foreign key to `auth.users` / `public.users` |
| `register_number` | `text` | Student register number (e.g. `AP23111260062`) |
| `term` | `text` | Academic year (e.g. `2023-2024`, `2026-2027`) |
| `fee_type` | `text` | Fee head description or concession label |
| `amount` | `numeric(12,2)` | Gross head amount or concession credit value |
| `paid_amount` | `numeric(12,2)` | **Actual student cash paid (0.00 for scholarship waivers)** |
| `balance_due` | `numeric(12,2)` | Outstanding balance remaining on this item |
| `payment_mode` | `text` | Payment channel or "Institutional Concession / Scholarship" |
| `receipt_number` | `text` | University receipt number or `SCHOLARSHIP-<term>` |
| `receipt_date` | `text` | Transaction date |

### Frontend UI Calculations (`FeeFinanceOverview.tsx`)

```typescript
// 1. Actual Lifetime Paid by Student (Out-of-Pocket)
const totalLifetimePaid = paidHistory
  .filter((h) => Number(h.paid_amount) > 0)
  .reduce((sum, h) => sum + (Number(h.paid_amount) || 0), 0);

// 2. Institutional Scholarship Concessions
const totalConcessions = paidHistory
  .filter((h) => Number(h.paid_amount) === 0 && Number(h.amount) > 0)
  .reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
```

### Payment History Table Badging
- Any row with `Number(paid_amount) === 0 && Number(amount) > 0` is flagged as an institutional concession.
- Display a distinct **Waiver** badge (`border-emerald-500/30 text-emerald-600 bg-emerald-500/10`).
- Render the concession amount in emerald green text to clearly signify an institutional credit rather than an out-of-pocket student expense or outstanding debt.

---

## 6. Verification Checklist for Future Agents

Before claiming any portal sync or finance task complete:
1. **Query Postgres Directly:** Never rely on edge function HTTP 200 responses. Run:
   ```sql
   SELECT count(*), sum(paid_amount), sum(amount) 
   FROM student_fee_paid_history 
   WHERE user_id = '<target_user_id>';
   ```
2. **Verify Non-Inflation:** Verify that `sum(paid_amount)` equals the sum of genuine bank receipts (not gross clearances).
3. **Verify Concessions:** Check that scholarship rows have `paid_amount = 0.00`.
4. **Run Typecheck:** Ensure `npm run typecheck` passes with **0 errors**.
5. **Run Migration Tests:** Ensure `npm run test:migrations` passes on both clean and upgrade databases.
6. **Capture Screenshots:** Visual QA at 1280px desktop and 360px mobile viewports across light and dark themes.
