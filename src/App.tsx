
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import UserProfile from "./pages/UserProfile";
import Mentors from "./pages/Mentors";
import MentorProfile from "./pages/MentorProfile";
import BecomeMentor from "./pages/BecomeMentor";
import Messages from "./pages/Messages";
import About from "./pages/About";
import Contact from "./pages/Contact";
import CommunityPosts from "./pages/CommunityPosts";
import CommunityPostDetail from "./pages/CommunityPostDetail";
import MarketPlace from "./pages/MarketPlace";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSettings from "./pages/AdminSettings";
import AdminContactMessages from "./pages/AdminContactMessages";
import AdminMentorVerification from "./pages/AdminMentorVerification";
import AdminBadges from "./pages/AdminBadges";
import TeamMembersAdmin from "./pages/TeamMembersAdmin";
import MarketplaceAdmin from "./pages/MarketplaceAdmin";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/mentors" element={<Mentors />} />
                <Route path="/mentors/:id" element={<MentorProfile />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/community-posts" element={<CommunityPosts />} />
                <Route path="/community-posts/:postId" element={<CommunityPostDetail />} />
                <Route path="/marketplace" element={<MarketPlace />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
                
                {/* Protected Routes */}
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <UserProfile />
                  </ProtectedRoute>
                } />
                <Route path="/become-mentor" element={
                  <ProtectedRoute>
                    <BecomeMentor />
                  </ProtectedRoute>
                } />
                <Route path="/messages" element={
                  <ProtectedRoute>
                    <Messages />
                  </ProtectedRoute>
                } />
                
                {/* Admin Routes */}
                <Route path="/admin" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin/settings" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminSettings />
                  </ProtectedRoute>
                } />
                <Route path="/admin/contact-messages" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminContactMessages />
                  </ProtectedRoute>
                } />
                <Route path="/admin/mentor-verification" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminMentorVerification />
                  </ProtectedRoute>
                } />
                <Route path="/admin/badges" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminBadges />
                  </ProtectedRoute>
                } />
                <Route path="/admin/team-members" element={
                  <ProtectedRoute requiredRole="admin">
                    <TeamMembersAdmin />
                  </ProtectedRoute>
                } />
                <Route path="/admin/marketplace" element={
                  <ProtectedRoute requiredRole="admin">
                    <MarketplaceAdmin />
                  </ProtectedRoute>
                } />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
