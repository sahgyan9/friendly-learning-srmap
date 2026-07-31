import { PRIMARY_DOMAIN } from "@/lib/constants";

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
 * Kept deliberately short. It is delivered through a `mailto:` link, and
 * browsers and mail clients truncate long ones — anything much past ~1,500
 * characters risks arriving cut off. The Copy button in the dialog is the
 * escape hatch when it does.
 */
export const buildWelcomeEmail = (fullName: string) => {
  const firstName = (fullName || "").trim().split(" ")[0] || "there";

  const subject = `Welcome aboard, ${firstName} — you're now a mentor on Friendly Learning`;

  const body = `Hi ${firstName},

Your application has been approved — you're officially a mentor on Friendly Learning SRMAP. Thank you for signing up to help.

If you haven't seen it from this side yet: juniors here are looking for someone who has already been through the thing they're stuck on. A course, a hackathon team, an interview, picking electives. It's students helping students — no fees, nothing formal.

Three things worth doing this week:

1. Finish your profile — ${PRIMARY_DOMAIN}/profile
   Your bio and skills are what students actually search. A profile with a few real sentences and specific skills ("DSA interviews", "Fusion 360") gets messaged; a blank one doesn't.

2. Add a photo.
   Profiles with a face get noticeably more requests. Juniors are nervous about reaching out and a photo makes you look approachable.

3. Answer one post — ${PRIMARY_DOMAIN}/community-posts
   The quickest way to start. Find a question you already know the answer to and reply.

A few things people usually ask:

- You choose your own workload. Reply when you have time.
- If you get busy — exams, placements — set yourself to "Taking a break" in your profile. You'll come off the directory until you're ready, and your existing chats stay open.
- You can start a group for a hackathon team, project or study circle: ${PRIMARY_DOMAIN}/communities

If anything is confusing or broken, just reply to this email — it comes straight to me.

Glad to have you here.

Gyan
Friendly Learning SRMAP
${PRIMARY_DOMAIN}`;

  return { subject, body };
};
