import { PRIMARY_DOMAIN } from "@/lib/constants";

/**
 * Works out what to call someone from whatever the database happens to hold.
 *
 * Names in this app arrive from three places and none of them are tidy. Google
 * sign-in gives lowercase ("ankush adhikari"). The university SSO appends the
 * registration number ("gyan kumar sah | AP23111260062"). A hand-typed
 * application can be anything, including empty.
 */
export const firstNameFrom = (fullName: string): string => {
  const withoutId = (fullName || "").split("|")[0];

  const first = withoutId
    .replace(/[^\p{L}\p{M}\s'-]/gu, " ") // digits, brackets, stray punctuation
    .trim()
    .split(/\s+/)[0];

  if (!first) return "";

  // Capitalise only when the whole word is one case.
  const alreadyMixed = first !== first.toLowerCase() && first !== first.toUpperCase();
  if (alreadyMixed) return first;

  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};

export interface WelcomeEmailContent {
  subject: string;
  body: string;
  html: string;
}

/**
 * The welcome a newly auto-approved mentor gets.
 *
 * Built to be sent cleanly via Gmail or direct HTML preview:
 * - Clear announcement of automatic approval.
 * - Non-redundant profile section (since user created profile on setup, we guide on enhancing & availability).
 * - Styled cards with actionable buttons & direct links matching UI design.
 */
export const buildWelcomeEmail = (fullName: string): WelcomeEmailContent => {
  const firstName = firstNameFrom(fullName) || "there";

  const subject = `Welcome aboard, ${firstName}! You're automatically approved as a Mentor on Friendly Learning`;

  const body = `Hi ${firstName},

Great news! Your mentor application on Friendly Learning SRMAP has been automatically approved. Your mentor profile is now live, and juniors can discover and message you starting today!

You set your own pace — nobody expects you to be an expert. Most questions are quick: which elective to choose, project guidance, internship tips, or interview prep.

Here are a few quick ways to get started:

1. Answer a Community Question:
   Browse questions asked by students and share quick insights.
   Link: ${PRIMARY_DOMAIN}/community-posts

2. Explore or Create a Group:
   Build or join hackathon teams, study circles, or clubs.
   Link: ${PRIMARY_DOMAIN}/communities

3. Manage Your Profile & Availability:
   Your profile is active! Whenever exams or placements arrive, toggle "Taking a break" on your profile to pause incoming chats.
   Link: ${PRIMARY_DOMAIN}/profile

If you ever need help or have feedback, just reply directly to this email.

Glad to have you with us!

Warm regards,
Gyan & The Friendly Learning Team
${PRIMARY_DOMAIN}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#1e293b;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f4f6f8; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 28px; text-align: center;">
              <div style="display:inline-block; background-color:rgba(255,255,255,0.15); padding:8px 16px; border-radius:30px; color:#ffffff; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:12px;">
                Friendly Learning SRMAP
              </div>
              <h1 style="color:#ffffff; margin:0; font-size:24px; font-weight:700; line-height:1.3;">
                Welcome aboard, ${firstName}! 🎉
              </h1>
              <p style="color:#e0e7ff; font-size:15px; margin:8px 0 0 0;">
                Your mentor application has been <strong>automatically approved</strong>.
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 28px 24px;">
              <p style="font-size:15px; line-height:1.6; color:#334155; margin-top:0;">
                Hi <strong>${firstName}</strong>,
              </p>
              <p style="font-size:15px; line-height:1.6; color:#334155;">
                We are thrilled to welcome you! Your mentor profile is officially live. Juniors on campus can now discover your expertise and reach out to you directly.
              </p>

              <div style="background-color:#f8fafc; border-left:4px solid #6366f1; padding:14px 18px; border-radius:0 8px 8px 0; margin: 20px 0;">
                <p style="margin:0; font-size:14px; line-height:1.5; color:#475569;">
                  💡 <em>You set your own pace! Nobody expects you to spend hours. A quick answer about electives, project ideas, or placement prep makes a huge impact.</em>
                </p>
              </div>

              <h2 style="font-size:17px; font-weight:700; color:#0f172a; margin-top:24px; margin-bottom:16px;">
                🚀 Quick Ways to Get Started
              </h2>

              <!-- Section Card 1 -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:16px; border:1px solid #e2e8f0; border-radius:12px; background-color:#ffffff;">
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top" style="font-size:20px; padding-right:12px;">💬</td>
                        <td>
                          <h3 style="margin:0; font-size:15px; font-weight:600; color:#0f172a;">Answer Community Questions</h3>
                          <p style="margin:4px 0 12px 0; font-size:13px; color:#64748b; line-height:1.4;">
                            Browse questions posted by juniors looking for study advice, project ideas, and career guidance.
                          </p>
                          <a href="${PRIMARY_DOMAIN}/community-posts" style="display:inline-block; background-color:#4f46e5; color:#ffffff; text-decoration:none; font-size:13px; font-weight:600; padding:8px 16px; border-radius:6px;">
                            Browse Questions →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Section Card 2 -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:16px; border:1px solid #e2e8f0; border-radius:12px; background-color:#ffffff;">
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top" style="font-size:20px; padding-right:12px;">👥</td>
                        <td>
                          <h3 style="margin:0; font-size:15px; font-weight:600; color:#0f172a;">Explore or Create Groups</h3>
                          <p style="margin:4px 0 12px 0; font-size:13px; color:#64748b; line-height:1.4;">
                            Join interest groups, start a hackathon team, or host a subject study circle with fellow students.
                          </p>
                          <a href="${PRIMARY_DOMAIN}/communities" style="display:inline-block; background-color:#0284c7; color:#ffffff; text-decoration:none; font-size:13px; font-weight:600; padding:8px 16px; border-radius:6px;">
                            Explore Groups →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Section Card 3 -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:16px; border:1px solid #e2e8f0; border-radius:12px; background-color:#ffffff;">
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top" style="font-size:20px; padding-right:12px;">⚡</td>
                        <td>
                          <h3 style="margin:0; font-size:15px; font-weight:600; color:#0f172a;">Manage Availability & Skills</h3>
                          <p style="margin:4px 0 12px 0; font-size:13px; color:#64748b; line-height:1.4;">
                            Your profile is live! During exams or busy weeks, toggle "Taking a break" anytime to pause chat requests.
                          </p>
                          <a href="${PRIMARY_DOMAIN}/profile" style="display:inline-block; background-color:#475569; color:#ffffff; text-decoration:none; font-size:13px; font-weight:600; padding:8px 16px; border-radius:6px;">
                            View Profile Settings →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="font-size:14px; line-height:1.5; color:#334155; margin-top:24px;">
                Have questions or spot something broken? Simply reply to this email anytime.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc; border-top:1px solid #e2e8f0; padding: 20px 24px; text-align: center;">
              <p style="margin:0 0 4px 0; font-size:13px; font-weight:600; color:#475569;">
                Friendly Learning SRMAP
              </p>
              <p style="margin:0; font-size:12px; color:#94a3b8;">
                Connecting students, mentors, and learning communities across campus.
              </p>
              <p style="margin:8px 0 0 0; font-size:12px;">
                <a href="${PRIMARY_DOMAIN}" style="color:#4f46e5; text-decoration:none; font-weight:500;">${PRIMARY_DOMAIN}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, body, html };
};
