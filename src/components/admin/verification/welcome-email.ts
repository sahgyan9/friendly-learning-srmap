import { PRIMARY_DOMAIN } from "@/lib/constants";

/**
 * Works out what to call someone from whatever the database happens to hold.
 *
 * Names in this app arrive from three places and none of them are tidy. Google
 * sign-in gives lowercase ("ankush adhikari"). The university SSO appends the
 * registration number ("gyan kumar sah | AP23111260062"). A hand-typed
 * application can be anything, including empty.
 *
 * Greeting someone "Hi ankush," or "Hi gyan kumar sah | AP23111260062," is the
 * kind of detail that makes a personal email read as an automated one, which is
 * the opposite of the point — so this is worth the twenty lines.
 */
export const firstNameFrom = (fullName: string): string => {
  const withoutId = (fullName || "").split("|")[0];

  const first = withoutId
    .replace(/[^\p{L}\p{M}\s'-]/gu, " ") // digits, brackets, stray punctuation
    .trim()
    .split(/\s+/)[0];

  if (!first) return "";

  // Capitalise only when the whole word is one case. "McCarthy" and "D'Souza"
  // are already right and would be wrecked by a blind toLowerCase first.
  const alreadyMixed = first !== first.toLowerCase() && first !== first.toUpperCase();
  if (alreadyMixed) return first;

  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};

/**
 * The welcome a newly approved mentor gets.
 *
 * Written to be sent from a person, because it is: this goes out through the
 * admin's own mail client, so it should not read like a system notification.
 * Three things it has to do, in order — tell them they're in, tell them the one
 * action that actually matters (fill in the profile, because an empty one gets
 * no requests), and set the expectation that this is light-touch. New mentors
 * most often go quiet because they assume being a mentor means scheduled
 * sessions they don't have time for.
 *
 * Kept deliberately short. It is delivered through a Gmail compose URL, and
 * browsers and Gmail both trim long query strings — anything much past ~1,500
 * characters risks arriving cut off. The Copy button in the dialog is the
 * escape hatch when it does.
 */
export const buildWelcomeEmail = (fullName: string) => {
  const firstName = firstNameFrom(fullName) || "there";

  const subject = `Welcome aboard, ${firstName} — you're now a mentor on Friendly Learning`;

  const body = `Hi ${firstName},

Your application has been approved. You're a mentor on Friendly Learning SRMAP now, and your profile is already live — juniors can find you and message you from today.

One thing worth knowing before anything else: nobody expects you to be an expert. Almost every message that comes through here is small. Which elective, how to start the project, is this internship worth it, how did you prepare. The person best placed to answer that is someone who did it a year ago, which is you.

Two things that make the difference:

1. Finish your profile — ${PRIMARY_DOMAIN}/profile
   Add a photo, two lines about yourself, and be specific about your skills. "DSA and internship prep" gets you better questions than "happy to help with anything". A blank profile gets scrolled past; this takes about three minutes.

2. Answer one post — ${PRIMARY_DOMAIN}/community-posts
   Find a question you already know the answer to and reply. It's the easiest possible start.

And when you want it, you can start a group — a hackathon team, a study circle, a club: ${PRIMARY_DOMAIN}/communities

You set your own pace. Reply when you have time, and if exams or placements hit, switch yourself to "Taking a break" on your profile. You come off the directory until you're ready and your existing chats stay open.

If anything is confusing or broken, just reply to this email. It comes straight to me.

Glad to have you here.

Gyan
Friendly Learning SRMAP
${PRIMARY_DOMAIN}`;

  return { subject, body };
};
