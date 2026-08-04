// Proves, from outside the database, which RPCs an anonymous visitor can call.
//
// Everything here runs with the anon key alone -- the same key that ships inside
// the JS bundle -- so this measures exactly what a stranger with DevTools open
// can reach. Run it before and after 20260804170000_lock_down_anon_rpc_surface.sql.
//
//   node supabase/tests/verify-anon-lockdown.mjs
//
// A function without EXECUTE for anon is reported by PostgREST as 404 (it is not
// in the exposed schema cache) or 403. Any other status means anon reached the
// function.
//
// SAFETY -- read before adding to the lists below.
//
// The only way to test reachability over HTTP is to call the function, so every
// probe here must be one that cannot change data. Two kinds are excluded on
// purpose:
//
//   * Destructive functions. Probing `delete_all_messages()` *is* the attack --
//     if it were still reachable, the probe would wipe every message. Functions
//     like that are asserted to not exist at all (see NOT_EXIST below) rather
//     than called.
//   * Zero-argument functions with side effects. `auto_award_performance_badges()`
//     and `prompt_graduated_mentors()` take no arguments, so there is no inert
//     input to pass -- calling them runs them for real against production data.
//     They live in SIDE_EFFECTING and are skipped unless --unsafe is passed.
//
// Probes that take arguments are given zero UUIDs and empty strings, which match
// no row, so they fail harmlessly even when reachable.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const UNSAFE = process.argv.includes('--unsafe');

function readEnv() {
  const raw = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = readEnv();
const URL_BASE = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;

if (!URL_BASE || !ANON) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const ZERO = '00000000-0000-0000-0000-000000000000';

// Dropped by the lockdown migration. Never called -- only asserted absent.
const NOT_EXIST = ['delete_all_messages'];

// Safe to probe: each takes arguments, and the inert values below match no row,
// so a reachable function errors out instead of doing anything.
const MUST_BE_BLOCKED = [
  ['send_message', { p_conversation_id: ZERO, p_sender_id: ZERO, p_receiver_id: ZERO, p_content: '' }],
  ['send_group_message', { p_community_id: ZERO, p_channel: '', p_content: '', p_reply_to_id: null }],
  ['create_conversation', { user1_id: ZERO, user2_id: ZERO }],
  ['get_conversation_messages', { conversation_id: ZERO }],
  ['mark_messages_as_read', { conversation_id: ZERO, user_id: ZERO }],
  ['community_addable_users', { p_community_id: ZERO, p_search: '', p_limit: 1 }],
  ['promote_to_admin_with_code', { recovery_code: 'not-a-real-code', target_user_id: ZERO }],
  ['update_verification_status', { verification_id: ZERO, new_status: 'pending', admin_id: ZERO, reason: null }],
  ['log_admin_action', { action_type: 'probe', target_id: ZERO, action_details: {} }],
  ['update_mentor_rating', { mentor_id: ZERO }],
  ['update_post_likes_count', {}],
  ['handle_new_user', {}],
  ['my_certificate_status', {}],
  ['list_group_messages', { p_community_id: ZERO, p_channel: '', p_limit: 1 }],
  ['can_user_rate_mentor', { user_id: ZERO, mentor_id: ZERO }],
];

// Reachable only by running them for real. Skipped without --unsafe.
// `update_user_presence` writes a presence row for whatever UUID it is handed.
const SIDE_EFFECTING = [
  ['update_user_presence', { p_user_id: ZERO, p_is_online: false }],
  ['auto_award_performance_badges', {}],
  ['prompt_graduated_mentors', {}],
  ['graduated_mentors_awaiting_confirmation', {}],
  ['rls_auto_enable', {}],
];

// Must stay reachable: these back pages a signed-out visitor can open.
const MUST_STAY_PUBLIC = [
  ['get_team_members_public', {}],
  ['get_faculty_directory_stats', {}],
  ['get_top_rated_faculty', { p_limit: 3, p_min_ratings: 1 }],
  ['get_mentor_reviews', { mentor_id: ZERO }],
  ['get_certificate', { p_certificate_id: ZERO }],
  ['list_communities', { p_search: null, p_kind: null, p_mine: false, p_limit: 5, p_offset: 0 }],
  ['get_community_feed', { p_post_type: null, p_search: null, p_limit: 5, p_offset: 0, p_community_id: null, p_mine: false }],
  ['get_post_comments', { p_post_id: ZERO }],
];

async function call(fn, body) {
  const res = await fetch(`${URL_BASE}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.status;
}

// PostgREST answers 401 when the function is in the schema cache but the role has
// no EXECUTE, 403 when a policy refuses it, and 404 when it is not exposed at all
// (dropped, or a trigger function it will not publish). All three mean "anon
// cannot run this". 401 is the usual result of revoking EXECUTE, so treating it
// as a failure -- as an earlier version of this file did -- reports a successful
// lockdown as a breach.
const notExposed = (status) => status === 401 || status === 403 || status === 404;

let failures = 0;
const line = (ok, fn, status, note = '') =>
  console.log(`  ${ok ? '[PASS]' : '[FAIL]'} ${fn.padEnd(42)} HTTP ${status}${ok ? '' : `  <-- ${note}`}`);

console.log(`Probing ${URL_BASE} with the anon key only.\n`);

console.log('must no longer exist:');
for (const fn of NOT_EXIST) {
  const status = await call(fn, {});
  const ok = notExposed(status);
  if (!ok) failures += 1;
  line(ok, fn, status, 'STILL EXISTS AND IS REACHABLE');
}

console.log('\nmust NOT be callable by anonymous visitors:');
for (const [fn, body] of MUST_BE_BLOCKED) {
  const status = await call(fn, body);
  const ok = notExposed(status);
  if (!ok) failures += 1;
  line(ok, fn, status, 'REACHABLE BY ANON');
}

console.log(`\nside-effecting probes${UNSAFE ? '' : ' (skipped -- pass --unsafe to run against a disposable DB)'}:`);
for (const [fn, body] of SIDE_EFFECTING) {
  if (!UNSAFE) {
    console.log(`  [SKIP] ${fn}`);
    continue;
  }
  const status = await call(fn, body);
  const ok = notExposed(status);
  if (!ok) failures += 1;
  line(ok, fn, status, 'REACHABLE BY ANON -- AND IT JUST RAN');
}

console.log('\nmust stay callable (public pages depend on these):');
for (const [fn, body] of MUST_STAY_PUBLIC) {
  const status = await call(fn, body);
  const ok = status === 200;
  if (!ok) failures += 1;
  line(ok, fn, status, 'PUBLIC PAGE BROKEN');
}

console.log(
  failures === 0
    ? '\nAnon surface is locked down and public pages still work.'
    : `\n${failures} problem(s). See above.`
);
process.exit(failures === 0 ? 0 : 1);
