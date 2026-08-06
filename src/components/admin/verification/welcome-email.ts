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
 * Design notes:
 * - Header gradient uses the app's brand primary: hsl(222 55% 50%) → #3b63c4,
 *   shading to a slightly deeper hsl(222 55% 38%) → #2c4c96. This matches what
 *   a mentor sees the moment they open the app, so email and product feel like
 *   siblings.
 * - Primary CTA button also uses the brand blue (#3963c6), not indigo (#4f46e5).
 * - Supplementary feature links (study partners, hackathons, faculty) mirror the
 *   tour so nothing the tour mentions is invisible in the email.
 */
export const buildWelcomeEmail = (fullName: string): WelcomeEmailContent => {
  const firstName = firstNameFrom(fullName) || "there";

  const subject = `${firstName}, you're live as a mentor on Friendly Learning`;

  const body = `Hi ${firstName},

Your mentor profile just went live — no approval queue, no waiting. Juniors in your department can already find you and start a conversation.

Nobody's expecting office hours. Most questions take two minutes: which elective to pick, a project idea, a gut check on an internship offer.

One more thing worth knowing: help 3 students — meaning they actually reply, not just receive a message — and you earn a real certificate. Not a participation badge: a verifiable one with a public link anyone can check.

Three ways to start:

1. Answer a question that's already waiting
   ${PRIMARY_DOMAIN}/community-posts

2. Join or start a group
   ${PRIMARY_DOMAIN}/communities

3. Set your pace
   Exams or placements coming up? Toggle "Taking a break" on your profile any time — your existing chats stay open, you just come off the directory.
   ${PRIMARY_DOMAIN}/profile

Also worth exploring:
- Find study partners → ${PRIMARY_DOMAIN}/find-study-partners
- Hackathon teammates → ${PRIMARY_DOMAIN}/hackathon-partners
- Anonymous faculty ratings (pick better courses) → ${PRIMARY_DOMAIN}/faculty

Reply to this email if anything's confusing or broken.

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
          
          <!-- Header Banner — brand primary hsl(222 55% 50%) to hsl(222 55% 38%) -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b63c4 0%, #2c4c96 100%); padding: 32px 28px; text-align: center;">
              <!--
                The mark is two-tone (blue F, navy L) on a transparent PNG, made
                for light backgrounds — see brand_assets/BRAND_GUIDELINES.md §1.
                It sits in its own white chip here rather than directly on the
                gradient so the navy half stays visible; there is no reversed/
                white version of the asset yet. The <img> points at the hosted
                file (not a data URI) because Gmail's rich-paste strips inline
                data: images from copied HTML — a remote https URL is what
                actually survives copy/paste into a compose window.
              -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto 16px auto; background-color:#ffffff; border-radius:10px; box-shadow:0 4px 12px rgba(15,23,42,0.18);">
                <tr>
                  <td style="padding:9px 16px;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align:middle; padding-right:8px;">
                          <img src="${PRIMARY_DOMAIN}/lovable-uploads/df76e963-f250-4f25-8f7b-3917f857fe63.png" width="40" height="26" alt="Friendly Learning" style="display:block; border:0;">
                        </td>
                        <td style="vertical-align:middle; white-space:nowrap; font-size:15px; font-weight:700; letter-spacing:-0.2px;">
                          <span style="color:#3963c6;">Friendly</span><span style="color:#0f172a;">Learning</span><span style="color:#3963c6; font-size:10px; font-weight:600; letter-spacing:0.3px; margin-left:4px;">SRMAP</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <h1 style="color:#ffffff; margin:0; font-size:24px; font-weight:700; line-height:1.3;">
                You're live, ${firstName}! 🎉
              </h1>
              <p style="color:#dbeafe; font-size:15px; margin:8px 0 0 0;">
                No approval queue — your mentor profile is already up.
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
                Juniors in your department can already find you and start a conversation — no introductions needed.
              </p>

              <div style="background-color:#eff6ff; border-left:4px solid #3963c6; padding:14px 18px; border-radius:0 8px 8px 0; margin: 20px 0;">
                <p style="margin:0; font-size:14px; line-height:1.5; color:#1e40af;">
                  💡 <em>Nobody's expecting office hours — most questions take two minutes. Help 3 students (real replies, not just messages sent) and you earn a certificate with a public verify link. Not a participation badge — an earned one.</em>
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
                          <h3 style="margin:0; font-size:15px; font-weight:600; color:#0f172a;">Answer a Question</h3>
                          <p style="margin:4px 0 12px 0; font-size:13px; color:#64748b; line-height:1.4;">
                            Juniors are already waiting on advice about electives, projects, and careers. Each real reply counts toward your certificate.
                          </p>
                          <a href="${PRIMARY_DOMAIN}/community-posts" style="display:inline-block; background-color:#3963c6; color:#ffffff; text-decoration:none; font-size:13px; font-weight:600; padding:8px 16px; border-radius:6px;">
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
                          <h3 style="margin:0; font-size:15px; font-weight:600; color:#0f172a;">Join or Start a Group</h3>
                          <p style="margin:4px 0 12px 0; font-size:13px; color:#64748b; line-height:1.4;">
                            Hackathon teams, study circles, subject clubs — with fellow students, not just people you're mentoring.
                          </p>
                          <a href="${PRIMARY_DOMAIN}/communities" style="display:inline-block; background-color:#3963c6; color:#ffffff; text-decoration:none; font-size:13px; font-weight:600; padding:8px 16px; border-radius:6px;">
                            Explore Groups →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Section Card 3 -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:24px; border:1px solid #e2e8f0; border-radius:12px; background-color:#ffffff;">
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="36" valign="top" style="font-size:20px; padding-right:12px;">⚡</td>
                        <td>
                          <h3 style="margin:0; font-size:15px; font-weight:600; color:#0f172a;">Set Your Pace</h3>
                          <p style="margin:4px 0 12px 0; font-size:13px; color:#64748b; line-height:1.4;">
                            During exams or busy weeks, toggle "Taking a break" anytime — your existing chats stay open, you just come off the directory.
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

              <!-- Also worth exploring section -->
              <div style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px 18px; margin-bottom:16px;">
                <p style="margin:0 0 10px 0; font-size:14px; font-weight:700; color:#0f172a;">Also worth exploring</p>
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:4px 0;">
                      <span style="font-size:14px; margin-right:8px;">🤝</span>
                      <a href="${PRIMARY_DOMAIN}/find-study-partners" style="font-size:13px; color:#3963c6; text-decoration:none; font-weight:500;">Find study partners</a>
                      <span style="font-size:13px; color:#94a3b8; margin-left:6px;">— never prep for exams alone</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;">
                      <span style="font-size:14px; margin-right:8px;">🚀</span>
                      <a href="${PRIMARY_DOMAIN}/hackathon-partners" style="font-size:13px; color:#3963c6; text-decoration:none; font-weight:500;">Hackathon teammates</a>
                      <span style="font-size:13px; color:#94a3b8; margin-left:6px;">— build something real</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;">
                      <span style="font-size:14px; margin-right:8px;">⭐</span>
                      <a href="${PRIMARY_DOMAIN}/faculty" style="font-size:13px; color:#3963c6; text-decoration:none; font-weight:500;">Anonymous faculty ratings</a>
                      <span style="font-size:13px; color:#94a3b8; margin-left:6px;">— pick better courses next semester</span>
                    </td>
                  </tr>
                </table>
              </div>

              <p style="font-size:14px; line-height:1.5; color:#334155; margin-top:24px;">
                Spot something broken, or just want to say hi? Reply to this email — I read these.
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
                <a href="${PRIMARY_DOMAIN}" style="color:#3963c6; text-decoration:none; font-weight:500;">${PRIMARY_DOMAIN}</a>
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
