// End-to-end browser test for CampusBrain AI overview feedback:
// - Upvote
// - Change vote to downvote
// - Undo downvote back to unvoted
//
// Usage: node scripts/qa/qa-campus-ai-feedback.mjs [baseUrl]

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:5179';
const OUT = '.qa-campus-ai-feedback';
fs.mkdirSync(OUT, { recursive: true });

const rpcCalls = [];

const MOCK_OVERVIEW_RESPONSE = {
  summary: "Dr. Anand Mishra specializes in Quantum Computing and Deep Learning. His lab is located on the 4th floor of the University Building.",
  citations: [{ id: 1, text: "Faculty Directory - CSE", url: "/faculty/dr-anand-mishra" }],
  keyInsights: ["Advises undergraduate research", "Office hours on Tuesdays"],
  badges: [{ id: "f1", name: "Dr. Anand Mishra", type: "faculty", to: "/faculty/dr-anand-mishra", detail: "CSE Department" }]
};

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

async function run() {
  console.log(`Starting QA test against ${BASE}...`);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let page;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

    await page.setRequestInterception(true);
    page.on('request', async (req) => {
      const url = req.url();
      if (url.includes('supabase') || url.includes('/functions/')) {
        console.log('REQUEST:', req.method(), url);
      }

      if (req.method() === 'OPTIONS') {
        return req.respond({
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': '*',
          },
        });
      }

      if (url.includes('/functions/v1/generate-ai-overview')) {
        return respondJson(req, MOCK_OVERVIEW_RESPONSE);
      }

      if (url.includes('/functions/v1/semantic-search')) {
        return respondJson(req, {
          faculty: [{ id: "f1", name: "Dr. Anand Mishra", department: "CSE", designation: "Associate Professor", research_areas: ["Quantum Computing"], image_url: null, rating: 4.8, review_count: 12 }],
          mentors: [],
          opportunities: [],
          posts: [],
          groups: [],
          documents: [],
          notices: []
        });
      }

      if (url.includes('/rest/v1/rpc/submit_ai_overview_feedback')) {
        const postData = req.postData();
        const parsed = JSON.parse(postData || '{}');
        rpcCalls.push(parsed);
        console.log('-> Intercepted submit_ai_overview_feedback RPC:', parsed);
        return respondJson(req, {
          success: true,
          action: parsed.p_is_helpful === null ? 'cleared' : 'voted',
          has_voted: parsed.p_is_helpful === null ? null : (parsed.p_is_helpful ? 'up' : 'down')
        });
      }

      if (url.includes('/rest/v1/faculty')) {
        return respondJson(req, [
          {
            id: "f1",
            slug: "dr-anand-mishra",
            name: "Dr. Anand Mishra",
            designation: "Associate Professor",
            department: "CSE",
            school: "SEAS",
            profile_url: null,
            image_url: null,
            has_image: false,
            office_location: "UB 4th floor",
            research_details: ["Quantum Computing", "Deep Learning"],
            interests: ["Quantum Computing", "Deep Learning"],
            research_areas: ["Quantum Computing"],
            rating_count: 5,
            avg_overall: 4.8,
            avg_teaching: 4.8,
            avg_grading: 4.8,
            avg_helpfulness: 4.8,
            is_active: true
          }
        ]);
      }

      if (url.includes('/rest/v1/platform_settings')) {
        return respondJson(req, { key: 'enable_campus_ai_overview', value: true });
      }

      if (url.includes('/rest/v1/')) {
        return respondJson(req, []);
      }

      req.continue();
    });

    // Navigate to search page with a query
    console.log('Navigating to search page...');
    await page.goto(`${BASE}/search?q=quantum+computing+faculty`, { waitUntil: 'domcontentloaded' });

    // Wait for CampusBrain AI overview to render
    console.log('Waiting for feedback buttons...');
    await page.waitForSelector('button[title*="response"], button[aria-label*="response"]', { timeout: 10000 });
    console.log('CampusBrain AI Overview rendered successfully.');

    await page.screenshot({ path: path.join(OUT, '1-initial-unvoted.png') });

    // Step 1: Click thumbs-up (Vote UP)
    console.log('Clicking Thumbs Up...');
    const thumbsUpBtn = await page.$('button[title="Good response"], button[aria-label="Good response"]');
    await thumbsUpBtn.click();
    await new Promise(r => setTimeout(r, 600));

    await page.screenshot({ path: path.join(OUT, '2-voted-up.png') });
    console.log('Thumbs Up clicked. RPC calls count:', rpcCalls.length);

    // Verify first RPC call
    if (rpcCalls.length !== 1 || rpcCalls[0].p_is_helpful !== true) {
      throw new Error(`Expected first RPC call to have p_is_helpful: true, got ${JSON.stringify(rpcCalls[0])}`);
    }

    // Step 2: Click thumbs-down (Change vote to DOWN)
    console.log('Clicking Thumbs Down to switch vote...');
    const thumbsDownBtn = await page.$('button[title="Bad response"], button[aria-label="Bad response"]');
    await thumbsDownBtn.click();
    await new Promise(r => setTimeout(r, 600));

    await page.screenshot({ path: path.join(OUT, '3-voted-down.png') });
    console.log('Thumbs Down clicked. RPC calls count:', rpcCalls.length);

    // Verify second RPC call
    if (rpcCalls.length !== 2 || rpcCalls[1].p_is_helpful !== false) {
      throw new Error(`Expected second RPC call to have p_is_helpful: false, got ${JSON.stringify(rpcCalls[1])}`);
    }

    // Step 3: Click thumbs-down again (Undo vote to NULL)
    console.log('Clicking active Thumbs Down to undo vote...');
    const activeThumbsDownBtn = await page.$('button[aria-pressed="true"], button[title*="Undo"]');
    await activeThumbsDownBtn.click();
    await new Promise(r => setTimeout(r, 600));

    await page.screenshot({ path: path.join(OUT, '4-vote-undone.png') });
    console.log('Active Thumbs Down clicked again. RPC calls count:', rpcCalls.length);

    // Verify third RPC call
    if (rpcCalls.length !== 3 || rpcCalls[2].p_is_helpful !== null) {
      throw new Error(`Expected third RPC call to have p_is_helpful: null, got ${JSON.stringify(rpcCalls[2])}`);
    }

    console.log('All 3 feedback steps (Vote UP -> Switch DOWN -> Undo to NULL) verified successfully!');
  } catch (err) {
    console.error('QA Test error, saving error screenshot...');
    if (page) {
      await page.screenshot({ path: path.join(OUT, 'error-state.png') }).catch(() => {});
    }
    throw err;
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('QA Test failed:', err);
  process.exit(1);
});
