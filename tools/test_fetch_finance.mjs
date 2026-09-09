import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng } from "./srm-captcha-templates/png.mjs";
import { segmentCharacters } from "./srm-captcha-templates/segment.mjs";
import { normalizeGlyph, hammingDistance, GRID_W, GRID_H } from "./srm-captcha-templates/normalize.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesPath = path.join(__dirname, "srm-captcha-templates", "templates.json");
const templates = JSON.parse(fs.readFileSync(templatesPath, "utf8"));

const PORTAL_BASE = "https://student.srmap.edu.in/srmapstudentcorner";

function recognizeCaptcha(imageBuffer) {
  const img = decodePng(imageBuffer);
  const boxes = segmentCharacters(img);

  let guess = "";
  let totalConfidence = 0;
  const maxDistance = GRID_W * GRID_H;

  for (const box of boxes) {
    const grid = Array.from(normalizeGlyph(img, box));
    let bestChar = null;
    let bestDistance = Infinity;
    for (const [char, examples] of Object.entries(templates)) {
      for (const example of examples) {
        const d = hammingDistance(grid, example);
        if (d < bestDistance) {
          bestDistance = d;
          bestChar = char;
        }
      }
    }
    guess += bestChar ?? "?";
    totalConfidence += bestChar ? 1 - bestDistance / maxDistance : 0;
  }

  return {
    guess,
    confidence: boxes.length ? totalConfidence / boxes.length : 0,
  };
}

function mergeSetCookies(jar, res) {
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : (res.headers.get("set-cookie") ? [res.headers.get("set-cookie")] : []);
  const next = { ...jar };
  for (const line of setCookies) {
    const pair = line.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    next[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return next;
}

function cookieHeader(jar) {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
}

async function fetchLoginPageAndCaptcha() {
  const loginPageRes = await fetch(`${PORTAL_BASE}/HRDSystem`, { redirect: "manual" });
  let jar = mergeSetCookies({}, loginPageRes);

  const captchaRes = await fetch(`${PORTAL_BASE}/captchas`, {
    headers: { Cookie: cookieHeader(jar) },
    redirect: "manual",
  });
  jar = mergeSetCookies(jar, captchaRes);

  if (!captchaRes.ok) throw new Error("SRM portal captcha fetch failed");

  const imageBuffer = Buffer.from(await captchaRes.arrayBuffer());
  return { jar, imageBuffer };
}

async function login(registerNumber, dob) {
  let jar = {};
  for (let attempt = 1; attempt <= 10; attempt++) {
    console.log(`Login attempt ${attempt}...`);
    const { jar: nextJar, imageBuffer } = await fetchLoginPageAndCaptcha();
    jar = nextJar;

    const { guess, confidence } = recognizeCaptcha(imageBuffer);
    console.log(`Captcha guess: ${guess} (confidence: ${(confidence * 100).toFixed(1)}%)`);

    if (!guess || guess.includes("?") || guess.length < 4) {
      console.log("Low confidence captcha guess, retrying...");
      continue;
    }

    const loginBody = new URLSearchParams({
      UserName: registerNumber,
      AuthKey: dob,
      ccode: guess,
      txtUserName: registerNumber,
      txtAuthKey: dob,
    });

    const loginRes = await fetch(`${PORTAL_BASE}/StudentLoginToPortal`, {
      method: "POST",
      headers: {
        Cookie: cookieHeader(jar),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: loginBody.toString(),
      redirect: "manual",
    });

    jar = mergeSetCookies(jar, loginRes);
    if (loginRes.status === 302) {
      const redirectUrl = loginRes.headers.get("location");
      console.log(`Login SUCCESSFUL (302 Redirect to ${redirectUrl})!`);
      return { jar, redirectUrl };
    }

    const text = await loginRes.text();
    if (text.includes("Invalid User ID or Password")) {
      throw new Error("Invalid User ID or Password");
    }
    console.log("Captcha was rejected by portal, retrying next captcha...");
  }
  throw new Error("Failed to login after 10 captcha attempts");
}

async function postEndpoint(jar, pathRel, bodyObj) {
  const url = `${PORTAL_BASE}/${pathRel.replace(/^\//, "")}`;
  const form = new URLSearchParams(bodyObj);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Cookie: cookieHeader(jar),
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: form.toString(),
  });
  return await res.text();
}

async function main() {
  const regNo = "AP23111260062";
  const dob = "25102004";

  console.log(`Starting portal fetch for ${regNo}...`);
  const { jar, redirectUrl } = await login(regNo, dob);

  const tmpDir = path.join(__dirname, "..", ".tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  // 1. Fetch Section 7: Fee Paid Details
  console.log("\n--- Fetching Fee Paid Details (ids: 7) ---");
  const feePaidHtml = await postEndpoint(jar, "students/report/studentreportresources.jsp", { ids: "7" });
  fs.writeFileSync(path.join(tmpDir, "portal_fee_paid_7.html"), feePaidHtml, "utf8");
  console.log(`Fee Paid Details: ${feePaidHtml.length} bytes saved.`);

  // 2. Fetch Fee Due Details: students/transaction/feeduegroups.jsp (ids: 8)
  console.log("\n--- Fetching Fee Due Groups (ids: 8) ---");
  const feeDueHtml = await postEndpoint(jar, "students/transaction/feeduegroups.jsp", { ids: "8" });
  fs.writeFileSync(path.join(tmpDir, "portal_fee_due_8.html"), feeDueHtml, "utf8");
  console.log(`Fee Due Details: ${feeDueHtml.length} bytes saved.`);
  console.log(`Preview:`, feeDueHtml.slice(0, 500));

  // 3. Check if feeDueHtml loads anything else or contains scripts/tables
  // 4. Also check students/report/studentreportresources.jsp with ids=8 just in case
  console.log("\n--- Fetching studentreportresources.jsp with ids: 8 ---");
  const report8 = await postEndpoint(jar, "students/report/studentreportresources.jsp", { ids: "8" });
  console.log(`studentreportresources ids: 8 length: ${report8.length}`);
  fs.writeFileSync(path.join(tmpDir, "portal_report_section_8.html"), report8, "utf8");

  // 5. Check Online Payment Verification: students/onlinepayments/onlinepaymentreconcilation.jsp (ids: 26, stuId: '16584')
  console.log("\n--- Fetching Online Payment Reconciliation (ids: 26) ---");
  const onlinePayHtml = await postEndpoint(jar, "students/onlinepayments/onlinepaymentreconcilation.jsp", { ids: "26", stuId: "16584" });
  fs.writeFileSync(path.join(tmpDir, "portal_online_payment_26.html"), onlinePayHtml, "utf8");
  console.log(`Online Payment Reconciliation: ${onlinePayHtml.length} bytes saved.`);

  // 6. Check Payment Acknowledgment: students/report/receiptgeneration.jsp (ids: 27, stuId: '16584')
  console.log("\n--- Fetching Receipt Generation (ids: 27) ---");
  const receiptHtml = await postEndpoint(jar, "students/report/receiptgeneration.jsp", { ids: "27", stuId: "16584" });
  fs.writeFileSync(path.join(tmpDir, "portal_receipt_27.html"), receiptHtml, "utf8");
  console.log(`Receipt Generation: ${receiptHtml.length} bytes saved.`);

  // 7. Check specific feedues breakdown for Hostel Fees (filter: '4')
  console.log("\n--- Fetching specific Fee Dues for filter=4 (Hostel Fees) ---");
  const specificDueHtml = await postEndpoint(jar, "students/transaction/feedues.jsp", { ids: "8", filter: "4", feename: "HostelFees" });
  fs.writeFileSync(path.join(tmpDir, "portal_feedues_hostel_4.html"), specificDueHtml, "utf8");
  console.log(`Specific Fee Dues: ${specificDueHtml.length} bytes saved.`);

  // 8. Check Announcements (ids: 107, stuId: '16584')
  console.log("\n--- Fetching Announcements (ids: 107) ---");
  const annHtml = await postEndpoint(jar, "students/report/announcements.jsp", { ids: "107", stuId: "16584" });
  fs.writeFileSync(path.join(tmpDir, "portal_announcements.html"), annHtml, "utf8");
  console.log(`Announcements: ${annHtml.length} bytes saved.`);

  // 9. Check Hostel Registration Instructions (ids: 31)
  console.log("\n--- Fetching Hostel Registration Instructions (ids: 31) ---");
  const hostelInstHtml = await postEndpoint(jar, "students/registrations/hostelregistrationinstruction.jsp", { ids: "31" });
  fs.writeFileSync(path.join(tmpDir, "portal_hostel_instruction.html"), hostelInstHtml, "utf8");
  console.log(`Hostel Instructions: ${hostelInstHtml.length} bytes saved.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
