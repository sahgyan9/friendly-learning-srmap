// QA Harness: Message Anyone - Search & Direct Messaging Verification
// Verifies finding students (e.g. Anshu) and mentors across SRM AP via Messages search & modal.
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE = process.argv[2] || 'http://localhost:8080';
const OUT = '.qa-message-anyone';
fs.mkdirSync(OUT, { recursive: true });

const USER_ID = '00000000-0000-4000-8000-000000000001';
const ANSHU_ID = '00000000-0000-4000-8000-000000000003';
const PRIYA_ID = '00000000-0000-4000-8000-000000000002';
const NEW_CONV_ID = 'c-00000000-0000-4000-8000-000000000099';

const FAKE_SESSION = {
  access_token: 'fake.jwt.token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'fake-refresh-token',
  user: {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'user@srmap.edu.in',
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  },
};

const PROFILE_ROW = {
  id: USER_ID,
  name: 'Asha Kumar',
  email: 'user@srmap.edu.in',
  role: 'student',
  is_admin: false,
  profile_image: null,
  verification_status: 'verified',
  has_seen_welcome_tour: true,
  theme: 'dark',
};

const ANSHU_PROFILE = {
  id: ANSHU_ID,
  name: 'Anshu Sharma',
  profile_image: null,
  role: 'student',
  department: 'Computer Science & Engineering',
  badge: 'Student',
};

const PRIYA_PROFILE = {
  id: PRIYA_ID,
  name: 'Priya Sharma',
  profile_image: null,
  role: 'mentor',
  department: 'Computer Science',
  badge: 'Mentor',
};

function respondJson(request, body, status = 200) {
  return request.respond({
    status,
    contentType: 'application/json',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'content-range': `0-${Math.max(0, (Array.isArray(body) ? body.length : 1) - 1)}/${
        Array.isArray(body) ? body.length : 1
      }`,
    },
    body: JSON.stringify(body),
  });
}

async function route(request) {
  const url = request.url();
  const method = request.method();

  if (method === 'OPTIONS') {
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

  if (url.includes('/auth/v1/user') || url.includes('/auth/v1/session')) {
    return respondJson(request, FAKE_SESSION.user);
  }

  if (url.includes('/rest/v1/users?')) {
    return respondJson(request, [PROFILE_ROW]);
  }

  if (url.includes('/rest/v1/rpc/search_campus_users')) {
    const postData = request.postData() ? JSON.parse(request.postData()) : {};
    const query = (postData.p_query || '').toLowerCase();

    if (query.includes('anshu')) {
      return respondJson(request, [ANSHU_PROFILE]);
    } else if (query.includes('priya')) {
      return respondJson(request, [PRIYA_PROFILE]);
    } else {
      return respondJson(request, [ANSHU_PROFILE, PRIYA_PROFILE]);
    }
  }

  if (url.includes('/rest/v1/rpc/get_conversation')) {
    return respondJson(request, []);
  }

  if (url.includes('/rest/v1/rpc/create_conversation')) {
    return respondJson(request, {
      id: NEW_CONV_ID,
      user1_id: USER_ID,
      user2_id: ANSHU_ID,
      last_updated: new Date().toISOString(),
    });
  }

  if (url.includes('/rest/v1/conversations')) {
    return respondJson(request, [
      {
        id: NEW_CONV_ID,
        user1_id: USER_ID,
        user2_id: ANSHU_ID,
        last_updated: new Date().toISOString(),
        last_message_id: null,
      },
    ]);
  }

  if (url.includes('/rest/v1/messages')) {
    if (method === 'POST') {
      const postData = JSON.parse(request.postData() || '{}');
      return respondJson(
        request,
        [
          {
            id: 'm-' + Date.now(),
            conversation_id: postData.conversation_id || NEW_CONV_ID,
            sender_id: USER_ID,
            receiver_id: ANSHU_ID,
            content: postData.content || '',
            sent_at: new Date().toISOString(),
            is_read: false,
            delivery_status: 'sent',
            sender: PROFILE_ROW,
          },
        ],
        201
      );
    }
    return respondJson(request, []);
  }

  if (url.includes('/rest/v1/rpc/chat_participant_profiles')) {
    return respondJson(request, [PROFILE_ROW, ANSHU_PROFILE, PRIYA_PROFILE]);
  }

  if (url.includes('/rest/v1/mentors')) {
    return respondJson(request, [PRIYA_PROFILE]);
  }

  if (url.includes('/rest/v1/')) {
    return respondJson(request, []);
  }

  return request.continue();
}

async function run() {
  console.log('Launching browser for Message Anyone Search QA...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', route);

    await page.setViewport({ width: 1280, height: 800 });

    // Seed session
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.evaluate(
      ({ sessionKey, session, profile }) => {
        localStorage.setItem(sessionKey, JSON.stringify(session));
        localStorage.setItem(`profile:${session.user.id}`, JSON.stringify({ data: { profile, mentorDepartment: null }, timestamp: Date.now() }));
        localStorage.setItem('theme', 'dark');
        document.documentElement.classList.add('dark');
      },
      {
        sessionKey: `sb-ruapdkrgcbqrhvsayvpf-auth-token`,
        session: FAKE_SESSION,
        profile: PROFILE_ROW,
      }
    );

    // 1. Visit /messages
    console.log('Navigating to /messages...');
    await page.goto(BASE + '/messages', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1200));
    console.log('Page text:', await page.evaluate(() => document.body.innerText.slice(0, 300)));

    await page.screenshot({ path: path.join(OUT, '01_messages_view_dark.png') });

    // 2. Type "Anshu" into the messages search box
    console.log('Searching "Anshu" in sidebar search...');
    const searchInput = await page.$('input[placeholder*="Search conversations"]');
    if (searchInput) {
      await searchInput.type('Anshu');
      await new Promise((r) => setTimeout(r, 1000));
      await page.screenshot({ path: path.join(OUT, '02_sidebar_search_anshu_found.png') });
    }

    // 3. Open New Conversation modal and start chat with Anshu
    console.log('Opening New Message modal and starting chat with Anshu...');
    const newMsgBtn = await page.$('button[aria-label="New Message"]');
    if (newMsgBtn) {
      await newMsgBtn.click();
      await new Promise((r) => setTimeout(r, 800));
      await page.screenshot({ path: path.join(OUT, '03_modal_suggested_users.png') });

      const modalInput = await page.$('div[role="dialog"] input');
      if (modalInput) {
        await modalInput.click({ clickCount: 3 });
        await modalInput.type('Anshu');
        await new Promise((r) => setTimeout(r, 800));
        await page.screenshot({ path: path.join(OUT, '04_modal_search_anshu.png') });

        // Click Chat button for Anshu
        const chatButtons = await page.$$('div[role="dialog"] button');
        for (const btn of chatButtons) {
          const text = await page.evaluate((el) => el.innerText, btn);
          if (text.includes('Chat')) {
            await btn.click();
            break;
          }
        }
        await new Promise((r) => setTimeout(r, 1200));

        // Screenshot the newly opened active chat thread
        await page.screenshot({ path: path.join(OUT, '05_active_chat_anshu_header.png') });

        // Type and send a message
        const textarea = await page.$('textarea');
        if (textarea) {
          await textarea.focus();
          await textarea.type('Hey Anshu! Let’s collaborate on the project.');
          await page.keyboard.press('Enter');
          await new Promise((r) => setTimeout(r, 1000));
          await page.screenshot({ path: path.join(OUT, '06_active_chat_anshu_message_sent.png') });
        }
      }
    }

    // 4. Mobile layout check
    console.log('Testing mobile layout (390x844)...');
    const mobilePage = await browser.newPage();
    await mobilePage.setRequestInterception(true);
    mobilePage.on('request', route);

    await mobilePage.goto(BASE, { waitUntil: 'domcontentloaded' });
    await mobilePage.evaluate(
      ({ sessionKey, session, profile }) => {
        localStorage.setItem(sessionKey, JSON.stringify(session));
        localStorage.setItem(`profile:${session.user.id}`, JSON.stringify({ data: { profile, mentorDepartment: null }, timestamp: Date.now() }));
        localStorage.setItem('theme', 'dark');
        document.documentElement.classList.add('dark');
      },
      {
        sessionKey: `sb-ruapdkrgcbqrhvsayvpf-auth-token`,
        session: FAKE_SESSION,
        profile: PROFILE_ROW,
      }
    );

    await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await mobilePage.goto(BASE + '/messages', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1200));

    const mobileSearch = await mobilePage.$('input[placeholder*="Search conversations"]');
    if (mobileSearch) {
      await mobileSearch.type('Anshu');
      await new Promise((r) => setTimeout(r, 1000));
      await mobilePage.screenshot({ path: path.join(OUT, '07_mobile_search_anshu.png') });
    }

    console.log('Visual QA completed successfully! Screenshots saved in', OUT);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('QA Harness Error:', err);
  process.exit(1);
});
