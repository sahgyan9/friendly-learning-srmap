// Visual QA for the mentor profile's honesty pass.
//
// Same technique as qa-search-insights.mjs: request interception, no real
// backend, no credentials. The point here is to prove the profile now says
// different things about different mentors -- the old build printed identical
// stats ("91% response rate", "12+ Mentees Mentored", a green "Active" dot) for
// every one of these four fixtures, which is exactly the bug.
//
//   node qa-mentor-honesty.mjs [baseUrl] [outDir]
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:5180';
const OUT = process.argv[3] || '.qa-mentor-honesty';
fs.mkdirSync(OUT, { recursive: true });

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

const MENTOR_ID = '00000000-0000-4000-8000-0000000000m1'.replace('m1', 'aa');

function mentorRow(over = {}) {
  return {
    id: MENTOR_ID,
    name: 'Meera Nair',
    department: 'CSE',
    skills: ['Python', 'Machine Learning', 'FastAPI'],
    rating: 4.6,
    review_count: 5,
    profile_image: null,
    linkedin_url: null,
    bio: 'Final year CSE. Happy to help with ML projects and interview prep.',
    created_at: daysAgo(200),
    year_of_studies: '4th Year',
    university: 'SRM AP',
    hobbies: 'Chess',
    graduation_year: null,
    is_alumni: false,
    company: null,
    job_title: null,
    is_available: true,
    available_from: null,
    availability_note: null,
    projects: [],
    experiences: [],
    courses: [],
    tagline: 'I help juniors ship their first real ML project.',
    ...over,
  };
}

// Four mentors the old code rendered identically.
const SCENARIOS = {
  // Established: enough history for every tile.
  established: {
    mentor: mentorRow(),
    activity: [{
      students_helped: 14,
      requests_received: 20,
      requests_answered: 19,
      median_reply_minutes: 42,
      last_message_at: daysAgo(1),
    }],
  },
  // Brand new: nobody has ever messaged them. Previously "12+ Mentees Mentored".
  brandNew: {
    mentor: mentorRow({ name: 'Arjun Rao', rating: 0, review_count: 0 }),
    activity: [{
      students_helped: 0,
      requests_received: 0,
      requests_answered: 0,
      median_reply_minutes: null,
      last_message_at: null,
    }],
  },
  // Below the confidence floor: 2 requests. Rate and speed must be withheld.
  belowFloor: {
    mentor: mentorRow({ name: 'Kavya Iyer' }),
    activity: [{
      students_helped: 1,
      requests_received: 2,
      requests_answered: 1,
      median_reply_minutes: 30,
      last_message_at: daysAgo(12),
    }],
  },
  // Poor responder, long dormant. The case fabricated stats flattered most.
  dormant: {
    mentor: mentorRow({ name: 'Rohit Verma' }),
    activity: [{
      students_helped: 2,
      requests_received: 11,
      requests_answered: 2,
      median_reply_minutes: 3400,
      last_message_at: daysAgo(75),
    }],
  },
};

let current = SCENARIOS.established;

function respondJson(request, body, status = 200) {
  return request.respond({
    status,
    contentType: 'application/json',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'content-range',
      'content-range': '0-0/*',
    },
    body: JSON.stringify(body),
  });
}

async function route(request) {
  const url = request.url();

  if (request.method() === 'OPTIONS') {
    return request.respond({
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Expose-Headers': 'content-range',
      },
    });
  }

  if (!url.includes('supabase.co')) return request.continue();

  if (url.includes('/rpc/mentor_activity')) return respondJson(request, current.activity);
  // Two different mentors queries hit the same path. getMentorById uses
  // .single() (id=eq.<uuid>) and wants an object; SimilarMentorsSection lists
  // by department and wants an array. Returning the object to both is what made
  // this script report four "data.filter is not a function" errors that the app
  // itself never produces.
  if (url.includes('/rest/v1/mentors')) {
    return url.includes('id=eq.')
      ? respondJson(request, current.mentor)
      : respondJson(request, []);
  }

  return respondJson(request, []);
}

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1400 });

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.setRequestInterception(true);
page.on('request', route);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function capture(name) {
  current = SCENARIOS[name];
  await page.goto(`${BASE}/mentor/${MENTOR_ID}`, { waitUntil: 'networkidle2' });
  await wait(1500);

  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });

  const summary = await page.evaluate(() => {
    const text = document.body.innerText;
    // Each tile renders as "<value>\n<label>"; pull the label/value pairs.
    const tiles = [...document.querySelectorAll('.grid > div')]
      .map((d) => d.innerText.trim().replace(/\s*\n\s*/g, ' | '))
      .filter((t) => t.length > 0 && t.includes('|'));
    return {
      name: document.querySelector('h1')?.textContent?.trim() ?? null,
      tiles,
      statusBadge: /Active this (week|month)/.exec(text)?.[0] ?? null,
      newMentorNote: /hasn't been messaged on the platform yet|will appear here once students/.test(text),
      // Must be gone everywhere.
      fabricated: [
        '91% response rate',
        'Replies within 3 hours',
        'Mentees Mentored',
        'Evening (6 PM - 10 PM)',
        'Active Days',
        'Preferred Time Slot',
        // The hardcoded match score and its personalised claim.
        '98%',
        'BEST MATCH FOR YOU',
        'Best Match For You',
      ].filter((s) => text.includes(s)),
    };
  });

  console.log(`\n── ${name} ─────────────────────────────`);
  console.log(JSON.stringify(summary, null, 1));
  console.log(`   saved ${file}`);
  return summary;
}

const results = {};
for (const name of Object.keys(SCENARIOS)) results[name] = await capture(name);

await browser.close();

// The whole point of the change: no profile may still show invented copy.
const leaked = Object.entries(results).filter(([, r]) => r.fabricated.length > 0);
if (leaked.length > 0) {
  console.log('\nFABRICATED COPY STILL RENDERING:');
  leaked.forEach(([k, r]) => console.log(`  ${k}: ${r.fabricated.join(', ')}`));
  process.exit(1);
}

if (errors.length > 0) {
  console.log(`\n${errors.length} page error(s):`);
  errors.forEach((e) => console.log(`  ${e}`));
  process.exit(1);
}
console.log('\nNo page errors, no fabricated copy.');
