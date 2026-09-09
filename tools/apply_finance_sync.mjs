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

function parseFeePaidHistory(html) {
  const history = [];
  const tableMatch = html.match(/<table[^>]*id=["']tbl7["'][^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return history;

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  for (const rowMatch of tableMatch[1].matchAll(rowRegex)) {
    const rowHtml = rowMatch[1];
    if (rowHtml.includes('class="subheader"') || rowHtml.includes("<th")) continue;

    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => stripTags(c[1]));

    if (cells.length >= 9) {
      history.push({
        term: cells[0],
        feeType: cells[1],
        dueDate: cells[2] || null,
        amount: parseFloat(cells[3].replace(/,/g, "")) || 0,
        receiptDate: cells[4] || null,
        paymentMode: cells[5] || null,
        receiptNumber: cells[6] || "",
        paidAmount: parseFloat(cells[7].replace(/,/g, "")) || 0,
        balanceDue: parseFloat(cells[8].replace(/,/g, "")) || 0,
      });
    }
  }
  return history;
}

const userId = "54774a25-67a8-48da-abc7-3621f35fbb26";
const registerNumber = "AP23111260062";

const dues = parseFeeDues(duesHtml);
const history = parseFeePaidHistory(paidHtml);

const duesSqlValues = dues.map((d) => {
  const cat = `'${d.feeCategory.replace(/'/g, "''")}'`;
  const head = `'${d.feeHead.replace(/'/g, "''")}'`;
  return `('${userId}', '${registerNumber}', ${cat}, ${head}, ${d.dueAmount}, ${d.collectedAmount}, ${d.toBePaidAmount}, ${d.isFine}, now())`;
}).join(",\n  ");

const historySqlValues = history.map((h) => {
  const term = `'${h.term.replace(/'/g, "''")}'`;
  const fType = `'${h.feeType.replace(/'/g, "''")}'`;
  const dDate = h.dueDate ? `'${h.dueDate.replace(/'/g, "''")}'` : "NULL";
  const rDate = h.receiptDate ? `'${h.receiptDate.replace(/'/g, "''")}'` : "NULL";
  const pMode = h.paymentMode ? `'${h.paymentMode.replace(/'/g, "''")}'` : "NULL";
  const rNum = `'${(h.receiptNumber || "").replace(/'/g, "''")}'`;
  return `('${userId}', '${registerNumber}', ${term}, ${fType}, ${dDate}, ${h.amount}, ${rDate}, ${pMode}, ${rNum}, ${h.paidAmount}, ${h.balanceDue}, now())`;
}).join(",\n  ");

const fullSql = `
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

-- 2. Insert fee paid history
INSERT INTO public.student_fee_paid_history (
  user_id, register_number, term, fee_type, due_date, amount, receipt_date, payment_mode, receipt_number, paid_amount, balance_due, last_synced_at
)
VALUES
  ${historySqlValues}
ON CONFLICT (user_id, term, fee_type, receipt_number) DO UPDATE SET
  due_date = EXCLUDED.due_date,
  amount = EXCLUDED.amount,
  receipt_date = EXCLUDED.receipt_date,
  payment_mode = EXCLUDED.payment_mode,
  paid_amount = EXCLUDED.paid_amount,
  balance_due = EXCLUDED.balance_due,
  last_synced_at = now();

-- 3. Insert notification alert
INSERT INTO public.notifications (user_id, type, title, content, data, read)
VALUES (
  '${userId}',
  'fee_alert',
  'Fee Raised: Hostel Fees (INR 1,47,900)',
  'A fee of INR 1,47,900 for Hostel Fees (Mess & Room Rent 2026-2027) has been raised on your SRM portal. Please pay on time to avoid Penalty of Fine.',
  '{"total_to_be_paid": 147900, "url": "/srmportal?tab=finance"}'::jsonb,
  false
)
ON CONFLICT DO NOTHING;
`;

fs.writeFileSync(path.join(tmpDir, "apply_finance.sql"), fullSql, "utf8");
console.log(`Generated SQL for ${dues.length} dues and ${history.length} history items at .tmp/apply_finance.sql`);
