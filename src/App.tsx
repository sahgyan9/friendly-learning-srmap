import { Suspense, lazy } from "react";
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

const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Mentors = lazy(() => import("./pages/Mentors"));
const BecomeMentor = lazy(() => import("./pages/BecomeMentor"));
const MentorProfile = lazy(() => import("./pages/MentorProfile"));
const Messages = lazy(() => import("./pages/Messages"));
const Contact = lazy(() => import("./pages/Contact"));
const About = lazy(() => import("./pages/About"));
const CommunityPosts = lazy(() => import("./pages/CommunityPosts"));
const CommunityPostDetail = lazy(() => import("./pages/CommunityPostDetail"));
const Faculty = lazy(() => import("./pages/Faculty"));
const FacultyDetail = lazy(() => import("./pages/FacultyDetail"));
const MarketPlace = lazy(() => import("./pages/MarketPlace"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const FindStudyPartners = lazy(() => import("./pages/FindStudyPartners"));
const HackathonPartners = lazy(() => import("./pages/HackathonPartners"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Certificate = lazy(() => import("./pages/Certificate"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));

const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminContactMessages = lazy(() => import("./pages/AdminContactMessages"));
const AdminMentorVerification = lazy(() => import("./pages/AdminMentorVerification"));
const AdminBadges = lazy(() => import("./pages/AdminBadges"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminSecurity = lazy(() => import("./pages/AdminSecurity"));
const TeamMembersAdmin = lazy(() => import("./pages/TeamMembersAdmin"));
const MarketplaceAdmin = lazy(() => import("./pages/MarketplaceAdmin"));

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
