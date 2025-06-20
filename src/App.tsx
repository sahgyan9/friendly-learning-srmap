
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import MobileLayout from "@/components/mobile/MobileLayout";
import Index from "./pages/Index";
import Mentors from "./pages/Mentors";
import About from "./pages/About";
import Contact from "./pages/Contact";
import BecomeMentor from "./pages/BecomeMentor";
import MentorProfile from "./pages/MentorProfile";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import UserProfile from "./pages/UserProfile";
import MarketPlace from "./pages/MarketPlace";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSettings from "./pages/AdminSettings";
import TeamMembersAdmin from "./pages/TeamMembersAdmin";
import MarketplaceAdmin from "./pages/MarketplaceAdmin";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import ProtectedRoute from "./components/ProtectedRoute";
import FloatingChatbot from "./components/chatbot/FloatingChatbot";
import AdminBadges from "@/pages/AdminBadges";
import AdminMentorVerification from "@/pages/AdminMentorVerification";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={
              <MobileLayout>
                <Index />
              </MobileLayout>
            } />
            <Route path="/mentors" element={
              <MobileLayout>
                <Mentors />
              </MobileLayout>
            } />
            <Route path="/mentor/:id" element={
              <MobileLayout>
                <MentorProfile />
              </MobileLayout>
            } />
            <Route path="/about" element={
              <MobileLayout>
                <About />
              </MobileLayout>
            } />
            <Route path="/contact" element={
              <MobileLayout>
                <Contact />
              </MobileLayout>
            } />
            <Route path="/become-mentor" element={
              <MobileLayout>
                <BecomeMentor />
              </MobileLayout>
            } />
            <Route path="/signin" element={
              <MobileLayout showNavbar={false}>
                <SignIn />
              </MobileLayout>
            } />
            <Route path="/signup" element={
              <MobileLayout showNavbar={false}>
                <SignUp />
              </MobileLayout>
            } />
            <Route path="/marketplace" element={
              <MobileLayout>
                <MarketPlace />
              </MobileLayout>
            } />
            <Route path="/messages" element={
              <ProtectedRoute>
                <MobileLayout>
                  <Messages />
                </MobileLayout>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <MobileLayout>
                  <UserProfile />
                </MobileLayout>
              </ProtectedRoute>
            } />
            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <MobileLayout>
                  <AdminDashboard />
                </MobileLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/badges" element={
              <ProtectedRoute requiredRole="admin">
                <MobileLayout>
                  <AdminBadges />
                </MobileLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/mentor-verification" element={
              <ProtectedRoute requiredRole="admin">
                <MobileLayout>
                  <AdminMentorVerification />
                </MobileLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute requiredRole="admin">
                <MobileLayout>
                  <AdminSettings />
                </MobileLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/team-members" element={
              <ProtectedRoute requiredRole="admin">
                <MobileLayout>
                  <TeamMembersAdmin />
                </MobileLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/marketplace" element={
              <ProtectedRoute requiredRole="admin">
                <MobileLayout>
                  <MarketplaceAdmin />
                </MobileLayout>
              </ProtectedRoute>
            } />
            <Route path="/unauthorized" element={
              <MobileLayout>
                <Unauthorized />
              </MobileLayout>
            } />
            <Route path="*" element={
              <MobileLayout>
                <NotFound />
              </MobileLayout>
            } />
          </Routes>
          <FloatingChatbot />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
