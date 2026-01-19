import React from 'react';
import Scanner from './components/Scanner';

function App() {
  return (
    <div className="min-h-screen w-full bg-studio-black text-studio-white selection:bg-studio-gold selection:text-black flex flex-col">
      <div className="flex-1 flex flex-col justify-center p-4">
        <Scanner />
      </div>
      <footer className="py-6 text-center text-gray-600 text-xs uppercase tracking-widest">
        &copy; 2026 Model Suitability Engine • Powered by Gemini
      </footer>
    </div>
  );
}

export default App;
