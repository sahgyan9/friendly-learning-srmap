
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNavigation from "@/components/navigation/BottomNavigation";
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import UserProfile from "./pages/UserProfile";
import Mentors from "./pages/Mentors";
import BecomeMentor from "./pages/BecomeMentor";
import MentorProfile from "./pages/MentorProfile";
import Messages from "./pages/Messages";
import Contact from "./pages/Contact";
import About from "./pages/About";
import CommunityPosts from "./pages/CommunityPosts";
import CommunityPostDetail from "./pages/CommunityPostDetail";
import MarketPlace from "./pages/MarketPlace";
import AdminDashboard from "./pages/AdminDashboard";
import AdminContactMessages from "./pages/AdminContactMessages";
import AdminMentorVerification from "./pages/AdminMentorVerification";
import AdminBadges from "./pages/AdminBadges";
import AdminSettings from "./pages/AdminSettings";
import AdminSecurity from "./pages/AdminSecurity";
import TeamMembersAdmin from "./pages/TeamMembersAdmin";
import MarketplaceAdmin from "./pages/MarketplaceAdmin";
import HowItWorks from "./pages/HowItWorks";
import FindStudyPartners from "./pages/FindStudyPartners";
import HackathonPartners from "./pages/HackathonPartners";
import Blog from "./pages/Blog";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import RouteRobots from "@/components/RouteRobots";
import { CanvasSession } from "./pages/CanvasSession";

// Create a new QueryClient instance for React Query
const queryClient = new QueryClient();

/**
 * Main App component that sets up routing and global providers
 * 
 * The routing structure is organized as follows:
 * 1. Public routes - accessible to all users
 * 2. User protected routes - require authentication
 * 3. Admin protected routes - require authentication + admin role
 * 
 * All admin routes use the ProtectedRoute component with requiredRole="admin"
 * to ensure proper authentication and authorization before rendering.
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="min-h-screen pb-16 md:pb-0">
            <Toaster />
            <RouteRobots />
          <Routes>
            {/* Public Routes - No authentication required */}
            <Route path="/" element={<Index />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/mentors" element={<Mentors />} />
            <Route path="/mentor/:id" element={<MentorProfile />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<About />} />
            <Route path="/community-posts" element={<CommunityPosts />} />
            <Route path="/community-posts/:id" element={<CommunityPostDetail />} />
            <Route path="/marketplace" element={<MarketPlace />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/find-study-partners" element={<FindStudyPartners />} />
            <Route path="/hackathon-partners" element={<HackathonPartners />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* User Protected Routes - Require authentication */}
            <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="/become-mentor" element={<ProtectedRoute><BecomeMentor /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/canvas/:sessionId" element={<ProtectedRoute><CanvasSession /></ProtectedRoute>} />

            {/* Admin Protected Routes - Require authentication + admin role */}
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/contact-messages" element={<ProtectedRoute requiredRole="admin"><AdminContactMessages /></ProtectedRoute>} />
            <Route path="/admin/mentor-verification" element={<ProtectedRoute requiredRole="admin"><AdminMentorVerification /></ProtectedRoute>} />
            <Route path="/admin/badges" element={<ProtectedRoute requiredRole="admin"><AdminBadges /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><AdminSettings /></ProtectedRoute>} />
            <Route path="/admin/security" element={<ProtectedRoute requiredRole="admin"><AdminSecurity /></ProtectedRoute>} />
            <Route path="/admin/team-members" element={<ProtectedRoute requiredRole="admin"><TeamMembersAdmin /></ProtectedRoute>} />
            <Route path="/admin/events" element={<ProtectedRoute requiredRole="admin"><MarketplaceAdmin /></ProtectedRoute>} />

            {/* 404 Page - Catch all unmatched routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          
          {/* Bottom Navigation for Mobile */}
          <BottomNavigation />
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
