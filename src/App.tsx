import { Suspense, lazy, ComponentType } from "react";
import { Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import RouteRobots from "@/components/RouteRobots";
import SiteHeader from "@/components/navigation/SiteHeader";

// The landing page is the most common entry point, so it stays in the main
// bundle. Everything else is split per route — the app previously shipped one
// 1.4MB chunk containing every admin screen to every first-time visitor.
import Index from "./pages/Index";

// Helper to safely import lazy components with automatic retry if a network chunk or deployment update fails
function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    const pageHasBeenRefreshed = sessionStorage.getItem("page_refreshed_for_chunk") === "true";
    try {
      const component = await factory();
      sessionStorage.removeItem("page_refreshed_for_chunk");
      return component;
    } catch (error) {
      if (!pageHasBeenRefreshed) {
        sessionStorage.setItem("page_refreshed_for_chunk", "true");
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}

const SignIn = lazyWithRetry(() => import("./pages/SignIn"));
const SignUp = lazyWithRetry(() => import("./pages/SignUp"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const UserProfile = lazyWithRetry(() => import("./pages/UserProfile"));
const Mentors = lazyWithRetry(() => import("./pages/Mentors"));
const BecomeMentor = lazyWithRetry(() => import("./pages/BecomeMentor"));
const MentorProfile = lazyWithRetry(() => import("./pages/MentorProfile"));
const Messages = lazyWithRetry(() => import("./pages/Messages"));
const Contact = lazyWithRetry(() => import("./pages/Contact"));
const About = lazyWithRetry(() => import("./pages/About"));
const CommunityPosts = lazyWithRetry(() => import("./pages/CommunityPosts"));
const CommunityPostDetail = lazyWithRetry(() => import("./pages/CommunityPostDetail"));
const Communities = lazyWithRetry(() => import("./pages/Communities"));
const CommunityDetail = lazyWithRetry(() => import("./pages/CommunityDetail"));
const Faculty = lazyWithRetry(() => import("./pages/Faculty"));
const FacultyDetail = lazyWithRetry(() => import("./pages/FacultyDetail"));
const MarketPlace = lazyWithRetry(() => import("./pages/MarketPlace"));
const HowItWorks = lazyWithRetry(() => import("./pages/HowItWorks"));
const FindStudyPartners = lazyWithRetry(() => import("./pages/FindStudyPartners"));
const HackathonPartners = lazyWithRetry(() => import("./pages/HackathonPartners"));
const Blog = lazyWithRetry(() => import("./pages/Blog"));
const BlogPost = lazyWithRetry(() => import("./pages/BlogPost"));
const Certificate = lazyWithRetry(() => import("./pages/Certificate"));
const VerifyCertificate = lazyWithRetry(() => import("./pages/VerifyCertificate"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const Unauthorized = lazyWithRetry(() => import("./pages/Unauthorized"));

const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"));
const AdminContactMessages = lazyWithRetry(() => import("./pages/AdminContactMessages"));
const AdminMentorVerification = lazyWithRetry(() => import("./pages/AdminMentorVerification"));
const AdminWelcomeEmails = lazyWithRetry(() => import("./pages/AdminWelcomeEmails"));
const AdminBadges = lazyWithRetry(() => import("./pages/AdminBadges"));
const AdminSettings = lazyWithRetry(() => import("./pages/AdminSettings"));
const AdminSecurity = lazyWithRetry(() => import("./pages/AdminSecurity"));
const TeamMembersAdmin = lazyWithRetry(() => import("./pages/TeamMembersAdmin"));
const MarketplaceAdmin = lazyWithRetry(() => import("./pages/MarketplaceAdmin"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

/**
 * Routes are grouped as: public, authenticated, and admin (authenticated +
 * is_admin). Admin authorisation is enforced by ProtectedRoute and, ultimately,
 * by RLS on the server.
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="min-h-screen">
            <Toaster />
            <RouteRobots />

            {/* One header for the whole app. Pages used to render their own
                <Navbar /> underneath a separately-mounted floating nav, which
                is how the two ended up overlapping. */}
            <SiteHeader />

            <main id="main-content">
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
                <Route path="/faculty" element={<Faculty />} />
                <Route path="/faculty/:slug" element={<FacultyDetail />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/about" element={<About />} />
                <Route path="/community-posts" element={<CommunityPosts />} />
                <Route path="/community-posts/:id" element={<CommunityPostDetail />} />
                {/* Public on purpose. Membership decides who can post in a
                    group, not who can read it — see the communities migration. */}
                <Route path="/communities" element={<Communities />} />
                <Route path="/communities/:slug" element={<CommunityDetail />} />
                <Route path="/marketplace" element={<MarketPlace />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/find-study-partners" element={<FindStudyPartners />} />
                <Route path="/hackathon-partners" element={<HackathonPartners />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                {/* Public on purpose: a certificate nobody can check without an
                    account is worth no more than the image itself. */}
                <Route path="/verify/:id" element={<VerifyCertificate />} />
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
                  path="/become-mentor"
                  element={
                    <ProtectedRoute>
                      <BecomeMentor />
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
                <Route
                  path="/certificate"
                  element={
                    <ProtectedRoute>
                      <Certificate />
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

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </main>
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
