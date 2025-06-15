import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
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
            <Route path="/" element={<Index />} />
            <Route path="/mentors" element={<Mentors />} />
            <Route path="/mentor/:id" element={<MentorProfile />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/become-mentor" element={<BecomeMentor />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/marketplace" element={<MarketPlace />} />
            <Route path="/messages" element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } />
            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/badges" element={
              <ProtectedRoute requiredRole="admin">
                <AdminBadges />
              </ProtectedRoute>
            } />
            <Route path="/admin/mentor-verification" element={
              <ProtectedRoute requiredRole="admin">
                <AdminMentorVerification />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute requiredRole="admin">
                <AdminSettings />
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
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <FloatingChatbot />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
