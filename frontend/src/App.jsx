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

  // --- Handoff Logic ---
  const handleAuthHandoff = async (currentSession) => {
    if (!currentSession?.user) return;

    const pendingAnalysis = localStorage.getItem('pending_analysis');
    if (pendingAnalysis) {
      console.log("Found pending analysis. Hydrating profile via Server API...");
      try {
        // Use Server API to bypass RLS
        const API_URL = import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:8000';

        const response = await fetch(`${API_URL}/handoff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentSession.user.id,
            email: currentSession.user.email,
            analysis_data: pendingAnalysis // Sending raw string, server parses it
          })
        });

        if (response.ok) {
          console.log("Analysis hydrated successfully via API.");
          localStorage.removeItem('pending_analysis');
        } else {
          console.error("API Handoff failed:", await response.text());
          // Keep in localStorage for retry by Guard
        }
      } catch (e) {
        console.error("Failed to execute handoff", e);
      }
    }
  };

  useEffect(() => {
    // 1. Check Session & Handle Anonymous Analysis Handoff
    const initAuth = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();

      if (initialSession) {
        await handleAuthHandoff(initialSession);
      }

      setSession(initialSession);
      setLoading(false);

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        // Run handoff on sign-in events
        if (newSession && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
          await handleAuthHandoff(newSession);
        }
        setSession(newSession);
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
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!session) {
      // If public, redirect to Login
      navigate('/login');
      return;
    }

    const checkAnalysis = async () => {
      // Race Condition Protection:
      const pendingLocal = localStorage.getItem('pending_analysis');

      const { data: profile } = await supabase.from('profiles').select('is_analysis_complete').eq('id', session.user.id).single();

      if (profile?.is_analysis_complete) {
        setChecking(false);
        return;
      }

      // If profile incomplete BUT we have local data, wait for Handoff
      if (pendingLocal) {
        // Retry Limit: 10 attempts (~10 seconds)
        if (retryCount < 10) {
          console.log(`Waiting for analysis handoff... (${retryCount + 1}/10)`);
          const timer = setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 1000);
          return () => clearTimeout(timer);
        } else {
          // Gave up waiting
          console.warn("Handoff timed out. Clearing stuck data to prevent infinite loop.");
          localStorage.removeItem('pending_analysis');
          // Proceed to fail (redirect to scan) logic below
        }
      }

      // Really incomplete
      navigate('/scan');
      setChecking(false);
    };

    checkAnalysis();
  }, [session, navigate, retryCount]);

  if (checking) return <div className="min-h-screen bg-surface-light dark:bg-surface-dark flex items-center justify-center"><Loader2 className="animate-spin text-brand-start" /></div>;
  return children;
};

const RequireOnboarding = ({ children, session }) => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!session) return;

    const checkOnboarding = async () => {
      const { data: profile } = await supabase.from('profiles').select('is_onboarding_complete').eq('id', session.user.id).single();

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
