import { Suspense, lazy, ComponentType } from "react";
import { Route, Routes, Navigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { WelcomeTourProvider } from "@/components/onboarding/WelcomeTourContext";
import WelcomeTour from "@/components/onboarding/WelcomeTour";
import { SrmDobNagProvider } from "@/components/onboarding/SrmDobNagContext";
import SrmDobNag from "@/components/onboarding/SrmDobNag";
import SignInNudge from "@/components/onboarding/SignInNudge";
import ProtectedRoute from "@/components/ProtectedRoute";
import RouteRobots from "@/components/RouteRobots";
import ScrollToTop from "@/components/ScrollToTop";
import SiteHeader from "@/components/navigation/SiteHeader";
import { MainWithRail } from "@/components/navigation/SiteRail";

// The landing page is the most common entry point, so it stays in the main
// bundle. Everything else is split per route — the app previously shipped one
// 1.4MB chunk containing every admin screen to every first-time visitor.
import Index from "./pages/Index";

/**
 * Lazy import that survives a deploy landing under an open tab.
 *
 * When a new build ships, the hashed chunk the current page is holding a URL for
 * stops existing, so the next route change 404s. Reloading picks up the new
 * index.html and its new chunk names, which fixes it.
 *
 * The retry stamp is per-route and expires. It used to be a single shared
 * "page_refreshed_for_chunk" flag that was only ever cleared on a *successful*
 * import — so one chunk that could not load (an extension blocking it, a dropped
 * connection) left that flag set for the life of the tab, and from then on every
 * lazy route in the app threw immediately instead of retrying.
 */
const RETRY_WINDOW_MS = 30_000;

const isBrowser = typeof window !== "undefined" && typeof sessionStorage !== "undefined";

/**
 * The retry stamp, which simply does nothing off the browser.
 *
 * Recovering from a stale chunk is a browser concern — a pre-render imports
 * straight from disk and has no hashed URL to go stale — but reading the stamp
 * unguarded did not merely skip that, it broke server rendering outright.
 * `sessionStorage.removeItem` sat on the *success* path, so in Node it threw
 * ReferenceError after the import had already worked; the catch below then threw
 * a second time reading the same missing global, and the lazy component
 * rejected. Every lazy route rendered as its Suspense fallback, which is why 12
 * of the 13 pre-rendered pages shipped an empty <main> and one shipped the word
 * "Loading...".
 */
const retryStamp = {
  read(key: string) {
    return isBrowser ? Number(sessionStorage.getItem(key) ?? 0) : 0;
  },
  write(key: string) {
    if (isBrowser) sessionStorage.setItem(key, String(Date.now()));
  },
  clear(key: string) {
    if (isBrowser) sessionStorage.removeItem(key);
  },
};

function lazyWithRetry<T extends ComponentType<any>>(
  name: string,
  factory: () => Promise<{ default: T }>,
) {
  const key = `chunk_retry:${name}`;

  return lazy(async () => {
    try {
      const component = await factory();
      retryStamp.clear(key);
      return component;
    } catch (error) {
      // Off the browser there is nothing to reload and no stamp to keep, so a
      // genuine import failure has to surface rather than hang forever on the
      // never-settling promise below — that would stall the pre-render.
      if (!isBrowser) throw error;

      const lastAttempt = retryStamp.read(key);

      if (Date.now() - lastAttempt > RETRY_WINDOW_MS) {
        retryStamp.write(key);
        window.location.reload();
        // Never settles: the reload is already on its way, and resolving here
        // would flash an error in the moment before the page goes away.
        return new Promise<{ default: T }>(() => {});
      }

      // Reloading did not help. Let it reach ErrorBoundary, which shows a real
      // message and a working way out.
      throw error;
    }
  });
}

const SignIn = lazyWithRetry("SignIn", () => import("./pages/SignIn"));
const SignUp = lazyWithRetry("SignUp", () => import("./pages/SignUp"));
const ForgotPassword = lazyWithRetry("ForgotPassword", () => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithRetry("ResetPassword", () => import("./pages/ResetPassword"));
const UserProfile = lazyWithRetry("UserProfile", () => import("./pages/UserProfile"));
const Mentors = lazyWithRetry("Mentors", () => import("./pages/Mentors"));
const BecomeMentor = lazyWithRetry("BecomeMentor", () => import("./pages/BecomeMentor"));
const BecomeMentorSuccess = lazyWithRetry("BecomeMentorSuccess", () => import("./pages/BecomeMentorSuccess"));
const ProfileSetupStudio = lazyWithRetry("ProfileSetupStudio", () => import("./pages/ProfileSetupStudio"));
const MentorProfile = lazyWithRetry("MentorProfile", () => import("./pages/MentorProfile"));
const Messages = lazyWithRetry("Messages", () => import("./pages/Messages"));
const Contact = lazyWithRetry("Contact", () => import("./pages/Contact"));
const About = lazyWithRetry("About", () => import("./pages/About"));
const CommunityPosts = lazyWithRetry("CommunityPosts", () => import("./pages/CommunityPosts"));
const CommunityPostDetail = lazyWithRetry("CommunityPostDetail", () => import("./pages/CommunityPostDetail"));
const Communities = lazyWithRetry("Communities", () => import("./pages/Communities"));
const CommunityDetail = lazyWithRetry("CommunityDetail", () => import("./pages/CommunityDetail"));
const Faculty = lazyWithRetry("Faculty", () => import("./pages/Faculty"));
const Ask = lazyWithRetry("Ask", () => import("./pages/Ask"));
const Opportunities = lazyWithRetry("Opportunities", () => import("./pages/Opportunities"));
const OpportunityDetail = lazyWithRetry("OpportunityDetail", () => import("./pages/OpportunityDetail"));
const NoticeDetail = lazyWithRetry("NoticeDetail", () => import("./pages/NoticeDetail"));
const DocumentDetail = lazyWithRetry("DocumentDetail", () => import("./pages/DocumentDetail"));
const ArticleDetail = lazyWithRetry("ArticleDetail", () => import("./pages/ArticleDetail"));
const FacultyDetail = lazyWithRetry("FacultyDetail", () => import("./pages/FacultyDetail"));
const MarketPlace = lazyWithRetry("MarketPlace", () => import("./pages/MarketPlace"));
const EventDetail = lazyWithRetry("EventDetail", () => import("./pages/EventDetail"));
const HowItWorks = lazyWithRetry("HowItWorks", () => import("./pages/HowItWorks"));
const FindStudyPartners = lazyWithRetry("FindStudyPartners", () => import("./pages/FindStudyPartners"));
const HackathonPartners = lazyWithRetry("HackathonPartners", () => import("./pages/HackathonPartners"));
const Blog = lazyWithRetry("Blog", () => import("./pages/Blog"));
const BlogPost = lazyWithRetry("BlogPost", () => import("./pages/BlogPost"));
const Certificate = lazyWithRetry("Certificate", () => import("./pages/Certificate"));
const VerifyCertificate = lazyWithRetry("VerifyCertificate", () => import("./pages/VerifyCertificate"));
const HowVerificationWorks = lazyWithRetry("HowVerificationWorks", () => import("./pages/HowVerificationWorks"));
const YourData = lazyWithRetry("YourData", () => import("./pages/YourData"));
const NotFound = lazyWithRetry("NotFound", () => import("./pages/NotFound"));
const Unauthorized = lazyWithRetry("Unauthorized", () => import("./pages/Unauthorized"));
const Search = lazyWithRetry("Search", () => import("./pages/Search"));

const AdminDashboard = lazyWithRetry("AdminDashboard", () => import("./pages/AdminDashboard"));
const AdminContactMessages = lazyWithRetry("AdminContactMessages", () => import("./pages/AdminContactMessages"));
const AdminMentorVerification = lazyWithRetry("AdminMentorVerification", () => import("./pages/AdminMentorVerification"));
const AdminWelcomeEmails = lazyWithRetry("AdminWelcomeEmails", () => import("./pages/AdminWelcomeEmails"));
const AdminBadges = lazyWithRetry("AdminBadges", () => import("./pages/AdminBadges"));
const AdminSettings = lazyWithRetry("AdminSettings", () => import("./pages/AdminSettings"));
const AdminSecurity = lazyWithRetry("AdminSecurity", () => import("./pages/AdminSecurity"));
const TeamMembersAdmin = lazyWithRetry("TeamMembersAdmin", () => import("./pages/TeamMembersAdmin"));
const MarketplaceAdmin = lazyWithRetry("MarketplaceAdmin", () => import("./pages/MarketplaceAdmin"));
const AdminAIFeedback = lazyWithRetry("AdminAIFeedback", () => import("./pages/AdminAIFeedback"));
const AdminSearchInsights = lazyWithRetry("AdminSearchInsights", () => import("./pages/AdminSearchInsights"));
const AdminNotices = lazyWithRetry("AdminNotices", () => import("./pages/AdminNotices"));
const AdminArticles = lazyWithRetry("AdminArticles", () => import("./pages/AdminArticles"));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function RedirectWithParam({ toPrefix }: { toPrefix: string }) {
  const { id, slug } = useParams();
  const param = id || slug || "";
  return <Navigate to={param ? `${toPrefix}/${param}` : toPrefix} replace />;
}


/**
 * Routes are grouped as: public, authenticated, and admin (authenticated +
 * is_admin). Admin authorisation is enforced by ProtectedRoute and, ultimately,
 * by RLS on the server.
 */
function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <SidebarProvider>
          <WelcomeTourProvider>
          <SrmDobNagProvider>
            <div className="min-h-screen">
              <Toaster />
              <RouteRobots />
              <ScrollToTop />
              <WelcomeTour />
              <SrmDobNag />
              <SignInNudge />

              {/* One header for the whole app. Pages used to render their own
                  <Navbar /> underneath a separately-mounted floating nav, which
                  is how the two ended up overlapping. */}
              <SiteHeader />

              <MainWithRail>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    {/* Public */}
                    <Route path="/" element={<Index />} />
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/mentors" element={<Mentors />} />
                    <Route path="/mentor/:id" element={<MentorProfile />} />
                    <Route path="/ask" element={<Ask />} />
                    <Route path="/opportunities" element={<Opportunities />} />
                    <Route path="/opportunities/:slug" element={<OpportunityDetail />} />
                    <Route path="/notices/:id" element={<NoticeDetail />} />
                    <Route path="/documents/:slug" element={<DocumentDetail />} />
                    <Route path="/articles/:slug" element={<ArticleDetail />} />
                    <Route path="/faculty" element={<Faculty />} />
                    <Route path="/faculty/:slug" element={<FacultyDetail />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/how-verification-works" element={<HowVerificationWorks />} />
                    <Route path="/your-data" element={<YourData />} />

                    {/* Canonical Routes */}
                    <Route path="/posts" element={<CommunityPosts />} />
                    <Route path="/posts/:id" element={<CommunityPostDetail />} />
                    {/* Public on purpose. Membership decides who can post in a
                      group, not who can read it — see the communities migration. */}
                    <Route path="/workspace-groups" element={<Communities />} />
                    <Route path="/workspace-groups/:slug" element={<CommunityDetail />} />
                    <Route path="/events" element={<MarketPlace />} />
                    <Route path="/events/:id" element={<EventDetail />} />
                    <Route path="/how-it-works" element={<HowItWorks />} />
                    <Route path="/find-study-partners" element={<FindStudyPartners />} />
                    <Route path="/hackathon-partners" element={<HackathonPartners />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/:slug" element={<BlogPost />} />

                    {/* Backward Compatibility SPA Redirects */}
                    <Route path="/community-posts" element={<Navigate to="/posts" replace />} />
                    <Route path="/community-posts/:id" element={<RedirectWithParam toPrefix="/posts" />} />
                    <Route path="/communities" element={<Navigate to="/workspace-groups" replace />} />
                    <Route path="/communities/:slug" element={<RedirectWithParam toPrefix="/workspace-groups" />} />
                    <Route path="/marketplace" element={<Navigate to="/events" replace />} />
                    <Route path="/marketplace/:id" element={<RedirectWithParam toPrefix="/events" />} />
                    <Route path="/mentors/:id" element={<RedirectWithParam toPrefix="/mentor" />} />

                    {/* Public on purpose: a certificate nobody can check without an
                      account is worth no more than the image itself. */}
                    <Route path="/verify/:id" element={<VerifyCertificate />} />
                    {/* Also public. It used to sit behind ProtectedRoute, which put
                      a sign-in wall in front of the one homepage button whose job
                      is to explain what the certificate is. The page shows the
                      preview and how it's earned to anyone; only the download and
                      the verification link need an account. */}
                    <Route path="/certificate" element={<Certificate />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/unauthorized" element={<Unauthorized />} />

                    {/* Authenticated */}
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <UserProfile />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile/setup"
                      element={
                        <ProtectedRoute>
                          <ProfileSetupStudio />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/profile/kickstart"
                      element={
                        <ProtectedRoute>
                          <ProfileSetupStudio />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/become-mentor"
                      element={
                        <ProtectedRoute>
                          <BecomeMentor />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/become-mentor/success"
                      element={
                        <ProtectedRoute>
                          <BecomeMentorSuccess />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/messages"
                      element={
                        <ProtectedRoute>
                          <Messages />
                        </ProtectedRoute>
                      }
                    />

                    {/* Admin */}
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/contact-messages"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminContactMessages />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/mentor-verification"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminMentorVerification />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/welcome-emails"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminWelcomeEmails />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/badges"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminBadges />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/settings"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminSettings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/ai-feedback"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminAIFeedback />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/search-insights"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminSearchInsights />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/security"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminSecurity />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/team-members"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <TeamMembersAdmin />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/events"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <MarketplaceAdmin />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/marketplace"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <MarketplaceAdmin />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/notices"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminNotices />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/articles"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminArticles />
                        </ProtectedRoute>
                      }
                    />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </MainWithRail>
            </div>
          </SrmDobNagProvider>
          </WelcomeTourProvider>
        </SidebarProvider>
      </TooltipProvider>
    </AuthProvider>
  );
}

export default App;
