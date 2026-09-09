import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmpDir = path.join(__dirname, "..", ".tmp");

export function parseFeeDues(html) {
  const feeDues = [];
  if (!html) return { feeDues, totalDueAmount: 0, totalToBePaid: 0, hasFineOrPenalty: false, fineItems: [] };

  // Match rows in tbody of dues table
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return { feeDues, totalDueAmount: 0, totalToBePaid: 0, hasFineOrPenalty: false, fineItems: [] };

  const tbodyContent = tbodyMatch[1];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(tbodyContent)) !== null) {
    const rowHtml = rowMatch[1];
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      c[1].replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
    );

    if (cells.length >= 6) {
      const slNo = parseInt(cells[0], 10) || feeDues.length + 1;
      const feeCategory = cells[1];
      const feeHead = cells[2];
      const dueAmount = parseFloat(cells[3].replace(/,/g, "")) || 0;
      const collectedAmount = parseFloat(cells[4].replace(/,/g, "")) || 0;
      const toBePaidAmount = parseFloat(cells[5].replace(/,/g, "")) || 0;

      const isFineOrPenalty = /fine|penalty|late\s*fee/i.test(`${feeCategory} ${feeHead}`);

      feeDues.push({
        slNo,
        feeCategory,
        feeHead,
        dueAmount,
        collectedAmount,
        toBePaidAmount,
        isFineOrPenalty,
      });
    }
  }

  // Parse total fees
  let totalDueAmount = 0;
  let totalToBePaid = 0;
  const totalDueMatch = html.match(/id="tdduetotal"[^>]*>([\d\.,]+)<\/td>/i);
  if (totalDueMatch) {
    totalToBePaid = parseFloat(totalDueMatch[1].replace(/,/g, "")) || 0;
  } else {
    totalToBePaid = feeDues.reduce((sum, d) => sum + d.toBePaidAmount, 0);
  }
  totalDueAmount = feeDues.reduce((sum, d) => sum + d.dueAmount, 0);

  const fineItems = feeDues.filter((d) => d.isFineOrPenalty);
  const hasFineOrPenalty = fineItems.length > 0;

  return { feeDues, totalDueAmount, totalToBePaid, hasFineOrPenalty, fineItems };
}

export function parseFeePaidHistory(html) {
  const history = [];
  if (!html) return history;

  const tableMatch = html.match(/<table[^>]*id=["']tbl7["'][^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return history;

  const tableHtml = tableMatch[1];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const rowHtml = rowMatch[1];
    if (rowHtml.includes('class="subheader"') || rowHtml.includes("<th")) continue;

    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      c[1].replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
    );

    if (cells.length >= 9) {
      history.push({
        term: cells[0],
        feeType: cells[1],
        dueDate: cells[2] || null,
        amount: parseFloat(cells[3].replace(/,/g, "")) || 0,
        receiptDate: cells[4] || null,
        paymentMode: cells[5] || null,
        receiptNumber: cells[6] || null,
        paidAmount: parseFloat(cells[7].replace(/,/g, "")) || 0,
        balanceDue: parseFloat(cells[8].replace(/,/g, "")) || 0,
      });
    }
  }

  return history;
}

// Test against saved files
const duesHtml = fs.readFileSync(path.join(tmpDir, "portal_fee_due_8.html"), "utf8");
const paidHtml = fs.readFileSync(path.join(tmpDir, "portal_fee_paid_7.html"), "utf8");

const parsedDues = parseFeeDues(duesHtml);
const parsedPaid = parseFeePaidHistory(paidHtml);

console.log("=== PARSED FEE DUES (feeduegroups.jsp) ===");
console.log(`Total Due: INR ${parsedDues.totalDueAmount}`);
console.log(`Total To Be Paid: INR ${parsedDues.totalToBePaid}`);
console.log(`Has Fine / Penalty: ${parsedDues.hasFineOrPenalty}`);
console.log("Items:", JSON.stringify(parsedDues.feeDues, null, 2));

console.log("\n=== PARSED FEE PAID HISTORY (Section 7) ===");
console.log(`Total Records: ${parsedPaid.length}`);
console.log("Sample recent record:", JSON.stringify(parsedPaid[parsedPaid.length - 1], null, 2));
