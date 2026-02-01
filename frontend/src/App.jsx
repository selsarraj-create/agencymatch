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
import { Loader2 } from 'lucide-react';
import { ThemeProvider } from './components/ThemeProvider';

import './index.css';

// --- Auth Handoff & Guard Wrapper ---
const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // 1. Check Session & Handle Anonymous Analysis Handoff
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user) {
        // --- Handoff Logic ---
        const handleAuthHandoff = async (session) => {
          if (!session?.user) return;

          const pendingAnalysis = localStorage.getItem('pending_analysis');
          if (pendingAnalysis) {
            console.log("Found pending analysis. Hydrating profile...");
            try {
              const analysisData = JSON.parse(pendingAnalysis);
              // Save to Profile
              const { error } = await supabase.from('profiles').update({
                analysis_data: analysisData,
                is_analysis_complete: true
              }).eq('id', session.user.id);

              if (!error) {
                console.log("Analysis hydrated successfully.");
                localStorage.removeItem('pending_analysis');
                // Optional: Trigger a custom event if we want components to react immediately, 
                // but Route Guards will re-check naturally.
              } else {
                console.error("Error hydrating profile:", error);
              }
            } catch (e) {
              console.error("Failed to parse pending analysis", e);
              localStorage.removeItem('pending_analysis'); // Corrupt data
            }
          }
        };

        useEffect(() => {
          // 1. Check Session & Handle Anonymous Analysis Handoff
          const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
              await handleAuthHandoff(session);
            }

            setSession(session);
            setLoading(false);

            // Listen for auth changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
              if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
                await handleAuthHandoff(session);
              }
              setSession(session);
              setLoading(false);
            });

            return () => subscription.unsubscribe();
          };

          initAuth();
        }, []);

        if (loading) return <div className="min-h-screen bg-surface-light dark:bg-surface-dark flex items-center justify-center"><Loader2 className="animate-spin text-brand-start" /></div>;

        return (
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/scan" element={
              <div className="flex-1 flex flex-col justify-start pt-4 sm:pt-8 p-4 bg-surface-light dark:bg-surface-dark min-h-screen transition-colors duration-300">
                <Scanner />
              </div>
            } />
            <Route path="/login" element={<Login />} />

            {/* Protected Routes Chain */}

            {/* 1. Onboarding Profile */}
            <Route path="/onboarding/profile" element={
              <RequireAnalysis session={session}>
                <OnboardingProfile />
              </RequireAnalysis>
            } />

            {/* 2. Dashboard */}
            <Route path="/dashboard" element={
              <RequireAnalysis session={session}>
                <RequireOnboarding session={session}>
                  <ClientDashboard />
                </RequireOnboarding>
              </RequireAnalysis>
            } />

            <Route path="/photo-lab" element={
              <RequireAnalysis session={session}>
                <RequireOnboarding session={session}>
                  <PhotoLab />
                </RequireOnboarding>
              </RequireAnalysis>
            } />

            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        );
      };


      // --- GUARDS ---

      const RequireAnalysis = ({ children, session }) => {
        const navigate = useNavigate();
        const [checking, setChecking] = useState(true);

        useEffect(() => {
          if (!session) {
            // If public, redirect to Login
            navigate('/login');
            return;
          }

          const checkAnalysis = async () => {
            // Race Condition Protection:
            // If we have local storage pending data, wait for Handoff to finish clearing it (or writing DB)
            // We poll/retry instead of failing immediately.
            const pendingLocal = localStorage.getItem('pending_analysis');

            const { data: profile } = await supabase.from('profiles').select('is_analysis_complete').eq('id', session.user.id).single();

            if (profile?.is_analysis_complete) {
              setChecking(false);
              return;
            }

            // If profile incomplete BUT we have local data, it means Handoff is likely running. Wait.
            if (pendingLocal) {
              console.log("Hold on... waiting for analysis handoff.");
              setTimeout(checkAnalysis, 1000); // Retry in 1s
              return;
            }

            // Really incomplete
            navigate('/scan');
            setChecking(false);
          };
          checkAnalysis();
        }, [session, navigate]);

        if (checking) return <div className="min-h-screen bg-surface-light dark:bg-surface-dark flex items-center justify-center"><Loader2 className="animate-spin text-brand-start" /></div>;
        return children;
      };

      const RequireOnboarding = ({ children, session }) => {
        const navigate = useNavigate();
        const [checking, setChecking] = useState(true);

        useEffect(() => {
          if (!session) return; // Should be handled by parent guard checking auth, but just in case

          const checkOnboarding = async () => {
            const { data: profile } = await supabase.from('profiles').select('is_onboarding_complete').eq('id', session.user.id).single();

            // If Onboarding is NOT complete, go to onboarding page
            // BUT avoid loop if we are already putting this guard on the onboarding page (we aren't, see Route structure)
            if (!profile?.is_onboarding_complete) {
              navigate('/onboarding/profile');
            }
            setChecking(false);
          };
          checkOnboarding();
        }, [session, navigate]);

        if (checking) return <div className="min-h-screen bg-surface-light dark:bg-surface-dark"></div>;
        return children;
      };

      function App() {
        return (
          <Router>
            <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
              <div className="min-h-screen bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark font-sans transition-colors duration-300">
                <AppContent />
                {/* Footer */}
                <footer className="w-full py-6 text-center text-gray-500 text-xs relative z-10 bg-card-light/50 dark:bg-black/50 backdrop-blur-sm border-t border-gray-200 dark:border-white/5">
                  <p>© 2026 MODEL SUITABILITY ENGINE</p>
                </footer>
              </div>
            </ThemeProvider>
          </Router>
        );
      }

      export default App;
