import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Scanner from './components/Scanner';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import PhotoLab from './pages/PhotoLab';
import ClientDashboard from './pages/ClientDashboard';


import LandingPage from './pages/LandingPage';
import './index.css';

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
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/photo-lab" element={<PhotoLab />} />
          <Route path="/dashboard" element={<ClientDashboard />} />
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
