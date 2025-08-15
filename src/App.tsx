
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
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
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/mentors" element={<Mentors />} />
            <Route path="/become-mentor" element={<BecomeMentor />} />
            <Route path="/mentor/:id" element={<MentorProfile />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<About />} />
            <Route path="/community-posts" element={<CommunityPosts />} />
            <Route path="/community-posts/:id" element={<CommunityPostDetail />} />
            <Route path="/marketplace" element={<MarketPlace />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/contact-messages" element={<AdminContactMessages />} />
            <Route path="/admin/mentor-verification" element={<AdminMentorVerification />} />
            <Route path="/admin/badges" element={<AdminBadges />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/security" element={<AdminSecurity />} />
            <Route path="/admin/team-members" element={<TeamMembersAdmin />} />
            <Route path="/admin/marketplace" element={<MarketplaceAdmin />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
