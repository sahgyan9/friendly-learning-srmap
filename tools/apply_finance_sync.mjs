import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpDir = path.join(__dirname, "..", ".tmp");

const duesHtml = fs.readFileSync(path.join(tmpDir, "portal_fee_due_8.html"), "utf8");
const paidHtml = fs.readFileSync(path.join(tmpDir, "portal_fee_paid_7.html"), "utf8");

function stripTags(s) {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFeeDues(html) {
  const feeDues = [];
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return feeDues;

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  for (const rowMatch of tbodyMatch[1].matchAll(rowRegex)) {
    const rowHtml = rowMatch[1];
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => stripTags(c[1]));

    if (cells.length >= 6) {
      const feeCategory = cells[1];
      const feeHead = cells[2];
      const dueAmount = parseFloat(cells[3].replace(/,/g, "")) || 0;
      const collectedAmount = parseFloat(cells[4].replace(/,/g, "")) || 0;
      const toBePaidAmount = parseFloat(cells[5].replace(/,/g, "")) || 0;
      const isFine = /fine|penalty|late\s*fee/i.test(`${feeCategory} ${feeHead}`);

      feeDues.push({
        feeCategory,
        feeHead,
        dueAmount,
        collectedAmount,
        toBePaidAmount,
        isFine,
      });
    }
  }
  return feeDues;
}
const receiptHtml = fs.readFileSync(path.join(tmpDir, "portal_receipt_27.html"), "utf8");

function parseFeeReceipts(html) {
  const receipts = [];
  if (!html) return receipts;

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  for (const rowMatch of html.matchAll(rowRegex)) {
    const rowHtml = rowMatch[1];
    if (rowHtml.includes("<th") || rowHtml.includes('class="info"')) continue;

    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      stripTags(c[1].replace(/<br\s*\/?>/gi, ", "))
    );

    if (cells.length >= 5) {
      const receiptDate = cells[1];
      const receiptNumber = cells[2];
      const feeType = cells[3];
      const amount = parseFloat(cells[4].replace(/,/g, "")) || 0;

      let term = "";
      const termMatch = receiptNumber.match(/\/(\d{2})-(\d{2})$/);
      if (termMatch) {
        term = `20${termMatch[1]}-20${termMatch[2]}`;
      } else {
        const dateMatch = receiptDate.match(/(\d{4})$/);
        if (dateMatch) {
          const yr = parseInt(dateMatch[1], 10);
          term = `${yr}-${yr + 1}`;
        }
      }

      receipts.push({
        term,
        feeType,
        dueDate: null,
        amount,
        receiptDate,
        paymentMode: "Online / University Receipt",
        receiptNumber,
        paidAmount: amount,
        balanceDue: 0,
      });
    }
  }

  return receipts;
}

function extractFeeConcessions(tbl7Html, receipts) {
  const concessions = [];
  if (!tbl7Html) return concessions;

  const tableMatch = tbl7Html.match(/<table[^>]*id=["']tbl7["'][^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return concessions;

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  for (const rowMatch of tableMatch[1].matchAll(rowRegex)) {
    const rowHtml = rowMatch[1];
    if (rowHtml.includes('class="subheader"') || rowHtml.includes("<th")) continue;

    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => stripTags(c[1]));

    if (cells.length >= 9) {
      const term = cells[0];
      const grossAmount = parseFloat(cells[3].replace(/,/g, "")) || 0;
      const receiptDate = cells[4];
      const mode = cells[5] || "";

      if (/concession|scholarship/i.test(mode)) {
        const studentPaidForTermTuition = receipts
          .filter((rec) => rec.term === term && !/hostel|exam|provisional|insurance/i.test(rec.feeType))
          .reduce((sum, rec) => sum + rec.amount, 0);

        const concessionAmount = grossAmount > studentPaidForTermTuition ? grossAmount - studentPaidForTermTuition : 0;

        if (concessionAmount > 0) {
          concessions.push({
            term,
            feeType: "Tuition Fee Waiver (Merit Scholarship Concession)",
            dueDate: null,
            amount: concessionAmount,
            receiptDate: receiptDate?.split(",")[0]?.trim() || null,
            paymentMode: "Institutional Concession / Scholarship",
            receiptNumber: `SCHOLARSHIP-${term}`,
            paidAmount: 0,
            balanceDue: 0,
          });
        }
      }
    }
  }

  return concessions;
}

const userId = "54774a25-67a8-48da-abc7-3621f35fbb26";
const registerNumber = "AP23111260062";

const dues = parseFeeDues(duesHtml);
const receipts = parseFeeReceipts(receiptHtml);
const concessions = extractFeeConcessions(paidHtml, receipts);
const allHistory = [...receipts, ...concessions];

const duesSqlValues = dues.map((d) => {
  const cat = `'${d.feeCategory.replace(/'/g, "''")}'`;
  const head = `'${d.feeHead.replace(/'/g, "''")}'`;
  return `('${userId}', '${registerNumber}', ${cat}, ${head}, ${d.dueAmount}, ${d.collectedAmount}, ${d.toBePaidAmount}, ${d.isFine}, now())`;
}).join(",\n  ");

const historySqlValues = allHistory.map((h) => {
  const term = `'${h.term.replace(/'/g, "''")}'`;
  const fType = `'${h.feeType.replace(/'/g, "''")}'`;
  const dDate = h.dueDate ? `'${h.dueDate.replace(/'/g, "''")}'` : "NULL";
  const rDate = h.receiptDate ? `'${h.receiptDate.replace(/'/g, "''")}'` : "NULL";
  const pMode = h.paymentMode ? `'${h.paymentMode.replace(/'/g, "''")}'` : "NULL";
  const rNum = `'${(h.receiptNumber || "").replace(/'/g, "''")}'`;
  return `('${userId}', '${registerNumber}', ${term}, ${fType}, ${dDate}, ${h.amount}, ${rDate}, ${pMode}, ${rNum}, ${h.paidAmount}, ${h.balanceDue}, now())`;
}).join(",\n  ");

const fullSql = `
BEGIN;

-- 1. Insert fee dues
INSERT INTO public.student_fee_dues (
  user_id, register_number, fee_category, fee_head, due_amount, collected_amount, to_be_paid_amount, is_fine, last_synced_at
)
VALUES
  ${duesSqlValues}
ON CONFLICT (user_id, fee_category, fee_head) DO UPDATE SET
  due_amount = EXCLUDED.due_amount,
  collected_amount = EXCLUDED.collected_amount,
  to_be_paid_amount = EXCLUDED.to_be_paid_amount,
  is_fine = EXCLUDED.is_fine,
  last_synced_at = now();

-- 2. Clear old gross accounting rows for this user
DELETE FROM public.student_fee_paid_history WHERE user_id = '${userId}';

-- 3. Insert genuine payment receipts & scholarship concessions
INSERT INTO public.student_fee_paid_history (
  user_id, register_number, term, fee_type, due_date, amount, receipt_date, payment_mode, receipt_number, paid_amount, balance_due, last_synced_at
)
VALUES
  ${historySqlValues};

-- Assertions to verify correctness before commit
DO $$
DECLARE
  v_sum NUMERIC;
  v_count INT;
BEGIN
  SELECT count(*), coalesce(sum(paid_amount), 0)
  INTO v_count, v_sum
  FROM public.student_fee_paid_history
  WHERE user_id = '${userId}';

  IF v_sum <> 628060.00 THEN
    RAISE EXCEPTION 'Verification failed: expected sum 628060.00, got %', v_sum;
  END IF;

  IF v_count <> 29 THEN
    RAISE EXCEPTION 'Verification failed: expected 29 rows, got %', v_count;
  END IF;
END $$;

COMMIT;
`;

fs.writeFileSync(path.join(tmpDir, "apply_finance.sql"), fullSql, "utf8");
console.log(`Generated SQL for ${dues.length} dues, ${receipts.length} receipts, and ${concessions.length} concessions.`);
console.log(`Total Student Paid: INR ${receipts.reduce((s, r) => s + r.paidAmount, 0)}`);
console.log(`Total Concessions: INR ${concessions.reduce((s, c) => s + c.amount, 0)}`);
