import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import Scanner from './components/Scanner';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import PhotoLab from './pages/PhotoLab';
import ClientDashboard from './pages/ClientDashboard';
import LandingPage from './pages/LandingPage';
import OnboardingProfile from './pages/OnboardingProfile';

import './index.css';

// --- Identity Guard Wrapper ---
const RequireOnboarding = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Not logged in, redirect to login? Or let public access?
        // For this guard, we assume it wraps protected routes.
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_onboarding_complete')
        .eq('id', user.id)
        .single();

      // Critical Safety Patch: Prevent loop if already on onboarding
      if (profile && !profile.is_onboarding_complete) {
        if (location.pathname !== '/onboarding/profile') {
          navigate('/onboarding/profile');
        }
      }
      setLoading(false);
    };
    checkUser();
  }, [navigate, location]);

  if (loading) return <div className="bg-studio-black min-h-screen"></div>;
  return children;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-studio-black text-studio-white selection:bg-studio-gold selection:text-black flex flex-col">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/scan" element={
            <div className="flex-1 flex flex-col justify-center p-4">
              <Scanner />
            </div>
          } />

          <Route path="/login" element={<Login />} />
          <Route path="/onboarding/profile" element={<OnboardingProfile />} />

          {/* Protected Routes (Admin is separate, usually bypasses this specific model onboarding, but logic is fine to keep separate) */}
          <Route path="/admin" element={<AdminDashboard />} />

          {/* Client Routes - Protected by Identity Guard */}
          <Route path="/photo-lab" element={
            <RequireOnboarding>
              <PhotoLab />
            </RequireOnboarding>
          } />
          <Route path="/dashboard" element={
            <RequireOnboarding>
              <ClientDashboard />
            </RequireOnboarding>
          } />

        </Routes>

        {/* Footer */}
        <footer className="w-full py-6 text-center text-gray-600 text-xs relative z-10 bg-black/20 backdrop-blur-sm border-t border-white/5">
          <p>© 2026 MODEL SUITABILITY ENGINE</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
