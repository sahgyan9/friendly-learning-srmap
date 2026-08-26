// Visual QA for the faculty ratings UI with stubbed Supabase responses.
//
// The sandbox this runs in has no network access to Supabase, and the faculty
// tables do not exist until the migration is applied — so this intercepts the
// PostgREST calls and serves fixtures. It verifies layout and rendering, not
// the backend.
//
//   node qa-faculty-mock.mjs [baseUrl]
import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE = process.argv[2] || 'http://localhost:5178';
const OUT = '.qa';
fs.mkdirSync(OUT, { recursive: true });

const DEPARTMENTS = [
  'Computer Science and Engineering',
  'Electronics and Communication Engineering',
  'Mathematics',
  'Physics',
  'Mechanical Engineering',
  'Management',
];

const NAMES = [
  'Dr Ranjit Thapa', 'Dr Murali Krishna Enduri', 'Dr Priyanka Singh', 'Dr Tapas Kumar Mishra',
  'Dr Pradyut Kumar Sanki', 'Dr Sunil Chinnadurai', 'Dr Amit Kumar', 'Dr Joy Gorai',
  'Ms Archana', 'Dr Jinaga Tulasiram', 'Dr Subha Sreekumar', 'Dr Gunturi Venkatesh',
];

const DESIGNATIONS = ['Professor & HoD', 'Associate Professor', 'Assistant Professor', 'Professor'];

// Interest sets mirroring the real shape of the upstream taxonomy: mostly short
// topical labels, with the occasional sentence-length one that has to truncate
// rather than blow out the card.
const INTEREST_SETS = [
  ['Machine Learning', 'Deep Learning', 'Computer Vision'],
  ['Artificial Intelligence', 'Natural Language Processing'],
  ['Graph Theory', 'Combinatorics'],
  ['Structural Health Monitoring', 'Reduced-Order Modeling', 'Bayesian Filtering', 'Crack Modeling and Detection'],
  ['IoT', 'Cyber Security', 'Blockchain'],
  ['Accelerating Material Discovery For Various Applications Using Large Language Models'],
  ['Machine Learning'],
  ['Data Science', 'Image Processing'],
  [],
  ['Quantum Computing', 'Cryptography'],
  ['Machine Learning', 'Networking'],
  ['Corporate Governance', 'Financial Performance', 'IFRS'],
];

const INTEREST_FACETS = [
  { interest: 'Machine Learning', faculty_count: 111 },
  { interest: 'Artificial Intelligence', faculty_count: 68 },
  { interest: 'Deep Learning', faculty_count: 59 },
  { interest: 'IoT', faculty_count: 32 },
  { interest: 'Image Processing', faculty_count: 27 },
  { interest: 'Computer Vision', faculty_count: 24 },
  { interest: 'Data Science', faculty_count: 24 },
  { interest: 'Cyber Security', faculty_count: 18 },
  { interest: 'Natural Language Processing', faculty_count: 18 },
  { interest: 'Networking', faculty_count: 17 },
  { interest: 'Blockchain', faculty_count: 14 },
  { interest: 'Internet of Things', faculty_count: 12 },
  { interest: 'Distributed Computing', faculty_count: 12 },
  { interest: 'Vision Computing', faculty_count: 10 },
  { interest: 'Cloud Computing', faculty_count: 9 },
  { interest: 'Information Security', faculty_count: 9 },
  { interest: 'Graph Theory', faculty_count: 8 },
  { interest: 'Quantum Computing', faculty_count: 7 },
];

const FACULTY = NAMES.map((name, index) => {
  const rated = index % 4 !== 3;
  const overall = rated ? Number((5 - (index % 5) * 0.35).toFixed(2)) : 0;
  return {
    id: `faculty-${index}`,
    slug: name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, ''),
    name,
    designation: DESIGNATIONS[index % DESIGNATIONS.length],
    department: DEPARTMENTS[index % DEPARTMENTS.length],
    school: 'School of Engineering and Sciences',
    profile_url: 'https://www.srmap.edu.in/faculty/example/',
    image_url: null,
    interests: INTEREST_SETS[index % INTEREST_SETS.length],
    research_areas: index === 3 ? ['Computational Mechanics'] : [],
    rating_count: rated ? 18 - index : 0,
    avg_overall: overall,
    avg_teaching: rated ? Number((overall + 0.2).toFixed(2)) : 0,
    avg_grading: rated ? Number((overall - 0.4).toFixed(2)) : 0,
    avg_helpfulness: rated ? Number((overall + 0.1).toFixed(2)) : 0,
  };
});

const REVIEWS = [
  {
    id: 'r1', teaching: 5, grading: 4, helpfulness: 5, overall: 4.67,
    comment: 'Genuinely one of the best lecturers in the department. Explains derivations step by step and never rushes. Slides are posted before class, and the tutorials actually map to the exam.',
    course_code: 'CSE202', tags: ['Clear lectures', 'Helpful in office hours', 'Inspiring'],
    helpful_count: 12, viewer_voted: false, is_own: false,
    created_at: new Date(Date.now() - 3 * 864e5).toISOString(),
  },
  {
    id: 'r2', teaching: 4, grading: 2, helpfulness: 4, overall: 3.33,
    comment: 'Teaching is solid but the grading is brutal — partial marks are rare and the mid-sem was much harder than the practice set. Go to office hours, they do help.',
    course_code: 'CSE310', tags: ['Tough grader', 'Heavy workload', 'Exam oriented'],
    helpful_count: 5, viewer_voted: true, is_own: true,
    created_at: new Date(Date.now() - 11 * 864e5).toISOString(),
  },
  {
    id: 'r3', teaching: 5, grading: 5, helpfulness: 3, overall: 4.33,
    comment: 'Fair marking and clear rubrics. Hard to catch outside class though.',
    course_code: null, tags: ['Lenient grader', 'Attendance matters'],
    helpful_count: 2, viewer_voted: false, is_own: false,
    created_at: new Date(Date.now() - 30 * 864e5).toISOString(),
  },
];

const TAG_COUNTS = [
  { tag: 'Clear lectures', count: 9 },
  { tag: 'Helpful in office hours', count: 7 },
  { tag: 'Tough grader', count: 4 },
  { tag: 'Exam oriented', count: 3 },
  { tag: 'Inspiring', count: 2 },
];

function respondJson(request, body, extraHeaders = {}) {
  return request.respond({
    status: 200,
    contentType: 'application/json',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'content-range': `0-${Math.max(0, (Array.isArray(body) ? body.length : 1) - 1)}/${
        Array.isArray(body) ? body.length : 1
      }`,
      ...extraHeaders,
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

  if (url.includes('/rpc/get_faculty_directory_stats')) {
    return respondJson(request, [{ faculty_count: 612, rating_count: 143, department_count: 27 }]);
  }
  if (url.includes('/rpc/get_top_rated_faculty')) {
    return respondJson(request, FACULTY.filter((f) => f.rating_count > 0).slice(0, 4));
  }
  if (url.includes('/rpc/get_faculty_interest_facets')) {
    return respondJson(request, INTEREST_FACETS);
  }
  if (url.includes('/rpc/get_faculty_reviews')) return respondJson(request, REVIEWS);
  if (url.includes('/rpc/get_faculty_tag_counts')) return respondJson(request, TAG_COUNTS);
  if (url.includes('/rpc/get_community_feed')) return respondJson(request, []);

  if (url.includes('/rest/v1/faculty')) {
    // Department filter list asks for just the department column.
    if (/select=department(&|$)/.test(url)) {
      return respondJson(request, FACULTY.map((f) => ({ department: f.department })));
    }
    // Detail page looks up a single slug.
    const slugMatch = url.match(/slug=eq\.([^&]+)/);
    if (slugMatch) {
      const slug = decodeURIComponent(slugMatch[1]);
      const found = FACULTY.find((f) => f.slug === slug) ?? FACULTY[0];
      return respondJson(request, found);
    }

    // Interest chip filter: .contains() serialises as interests=cs.{"Term"}.
    // URLSearchParams encodes a space as '+', which decodeURIComponent leaves
    // alone — PostgREST form-decodes it, so the mock has to as well.
    const containsMatch = url.match(/interests=cs\.([^&]+)/);
    if (containsMatch) {
      const term = decodeURIComponent(containsMatch[1].replace(/\+/g, ' ')).replace(
        /^\{"?|"?\}$/g,
        '',
      );
      return respondJson(request, FACULTY.filter((f) => f.interests.includes(term)));
    }

    return respondJson(request, FACULTY);
  }

  if (url.includes('/auth/v1/')) {
    return respondJson(request, { session: null, user: null });
  }

  return respondJson(request, []);
}

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const shots = [
  { name: 'faculty-list', path: '/faculty', viewport: { width: 1280, height: 900 } },
  { name: 'faculty-list-mobile', path: '/faculty', viewport: { width: 390, height: 844 } },
  {
    name: 'faculty-filtered',
    path: '/faculty?interest=Machine%20Learning',
    viewport: { width: 1280, height: 900 },
  },
  { name: 'faculty-detail', path: `/faculty/${FACULTY[0].slug}`, viewport: { width: 1280, height: 900 } },
  { name: 'faculty-detail-mobile', path: `/faculty/${FACULTY[0].slug}`, viewport: { width: 390, height: 844 } },
  { name: 'home-discovery', path: '/', viewport: { width: 1280, height: 900 } },
];

for (const shot of shots) {
  const page = await browser.newPage();
  await page.setViewport(shot.viewport);
  await page.setRequestInterception(true);
  page.on('request', route);

  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`${BASE}${shot.path}`, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((resolve) => setTimeout(resolve, 1500));

  await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: true });

  const summary = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent?.trim() ?? '(none)',
    cards: document.querySelectorAll('a[href^="/faculty/"]').length,
    stars: document.querySelectorAll('[role="img"][aria-label*="out of 5"]').length,
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));

  const overflow = summary.scrollW > summary.clientW + 1;
  console.log(
    `${shot.name.padEnd(22)} h1="${summary.h1}" facultyLinks=${summary.cards} stars=${summary.stars}` +
      `${overflow ? `  ⚠ H-OVERFLOW ${summary.scrollW}>${summary.clientW}` : ''}` +
      `${errors.length ? `  ⚠ ${errors[0]}` : ''}`,
  );

  await page.close();
}

await browser.close();
console.log(`\nScreenshots in ${OUT}/`);
