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

async function fetchReportSection(jar, id) {
  const res = await fetch(`${PORTAL_BASE}/students/report/studentreportresources.jsp`, {
    method: "POST",
    headers: {
      Cookie: cookieHeader(jar),
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: `ids=${id}`,
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

  // 1. Fetch landing page
  const fullRedirectUrl = redirectUrl?.startsWith("http") ? redirectUrl : `${PORTAL_BASE}/${redirectUrl?.replace(/^\//, "")}`;
  console.log(`Fetching landing page: ${fullRedirectUrl}`);
  const landingRes = await fetch(fullRedirectUrl, {
    headers: { Cookie: cookieHeader(jar) },
  });
  const landingHtml = await landingRes.text();
  fs.writeFileSync(path.join(tmpDir, "landing_page.html"), landingHtml, "utf8");
  console.log(`Saved landing page (${landingHtml.length} chars)`);

  // Search landing page for links
  const links = [...landingHtml.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
  console.log("Found links in landing page:", links.filter((l) => !l.includes(".css") && !l.includes(".js")));

  // 2. Fetch sections 8 to 20
  console.log("Testing sections 8 to 20 in studentreportresources.jsp...");
  for (let id = 8; id <= 20; id++) {
    const html = await fetchReportSection(jar, id);
    const h2 = html.match(/<h2[^>]*>(.*?)<\/h2>/i);
    const title = h2 ? h2[1] : (html.length > 50 ? "Has Content (no h2)" : "Empty");
    console.log(`Section ${id} (${html.length} chars): ${title}`);
    if (html.length > 100) {
      fs.writeFileSync(path.join(tmpDir, `report_section_${id}.html`), html, "utf8");
    }
  }

  // Also check if there's any file or script containing "timetable"
  console.log("Searching landing page for 'timetable' or 'time table'...");
  for (const m of landingHtml.matchAll(/.{0,50}(?:time\s*table|schedule).{0,50}/gi)) {
    console.log("Match:", m[0].replace(/\s+/g, " "));
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
