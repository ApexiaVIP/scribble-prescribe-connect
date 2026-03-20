import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Browse from "./pages/Browse";
import PrescriberOnboarding from "./pages/PrescriberOnboarding";
import PrescriberDashboard from "./pages/PrescriberDashboard";
import PrescriberProfile from "./pages/PrescriberProfile";
import BusinessDashboard from "./pages/BusinessDashboard";
import Profile from "./pages/Profile";
import HowItWorks from "./pages/HowItWorks";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/prescriber/onboarding" element={<PrescriberOnboarding />} />
            <Route path="/prescriber/dashboard" element={<PrescriberDashboard />} />
            <Route path="/prescriber/:id" element={<PrescriberProfile />} />
            <Route path="/business/dashboard" element={<BusinessDashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
